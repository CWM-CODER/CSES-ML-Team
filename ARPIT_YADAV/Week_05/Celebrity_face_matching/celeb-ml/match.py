import json
import sys
from pathlib import Path
from urllib.parse import quote

import cv2
import numpy as np

from build_embeddings import load_model

ART = Path(__file__).parent / "artifacts"


def to_percent(sim, threshold=0.25):
    """
    InsightFace & DeepFace Threshold-Anchored Biometric Calibration:
    Rooted in the official InsightFace buffalo_l verification threshold (T = 0.25).
      - sim <= 0.04: Sensor noise / completely unrelated face -> 0%
      - 0.04 < sim < 0.25: Scales from 15% up to 65% (Decision boundary)
      - 0.25 <= sim < 0.40: Strong lookalike tier, scales 65% to 98%
      - sim >= 0.40: Identical / same-person verification -> 98%
    """
    if sim <= 0.04:
        return 0.0
    if sim < threshold:
        r = (float(sim) - 0.04) / (threshold - 0.04)
        pct = 15.0 + 50.0 * (r ** 0.85)
        return float(np.clip(pct, 0.0, 65.0))
    else:
        r = min(1.0, (float(sim) - threshold) / (0.40 - threshold))
        pct = 65.0 + 33.0 * (r ** 0.75)
        return float(np.clip(pct, 65.0, 98.5))


class Matcher:
    def __init__(self):
        self.app = load_model()
        self.datasets = {}

        # 1. Load registered datasets from datasets.json if available
        datasets_meta_path = ART / "datasets.json"
        if datasets_meta_path.exists():
            try:
                registry = json.loads(datasets_meta_path.read_text(encoding="utf-8"))
                for d_id, meta in registry.items():
                    emb_path = ART / meta.get("embeddings", f"embeddings_{d_id}.npy")
                    names_path = ART / meta.get("names", f"names_{d_id}.json")
                    gender_path = ART / meta.get("gender", f"gender_{d_id}.json")
                    if emb_path.exists() and names_path.exists():
                        self.datasets[d_id] = {
                            "id": d_id,
                            "name": meta.get("name", d_id.title()),
                            "icon": meta.get("icon", "⭐"),
                            "embeddings": np.load(emb_path),
                            "names": json.loads(names_path.read_text(encoding="utf-8")),
                            "gender": json.loads(gender_path.read_text(encoding="utf-8")) if gender_path.exists() else {},
                        }
            except Exception as e:
                print(f"Warning: could not parse datasets.json: {e}")

        # 2. Fallback to default embeddings.npy if no registered datasets found
        if not self.datasets and (ART / "embeddings.npy").exists():
            names_path = ART / "names.json"
            gender_path = ART / "gender.json"
            names = json.loads(names_path.read_text(encoding="utf-8")) if names_path.exists() else []
            self.datasets["default"] = {
                "id": "default",
                "name": "Celebrities",
                "icon": "⭐",
                "embeddings": np.load(ART / "embeddings.npy"),
                "names": names,
                "gender": json.loads(gender_path.read_text(encoding="utf-8")) if gender_path.exists() else {},
            }

    def detect_face(self, image):
        if isinstance(image, np.ndarray):
            img = image
        else:
            img = cv2.imread(str(image))
        if img is None:
            return None
        faces = self.app.get(img)
        if not faces:
            # Fallback with reflective padding for faces touching camera boundaries
            h, w = img.shape[:2]
            pad = max(40, int(max(h, w) * 0.08))
            padded = cv2.copyMakeBorder(img, pad, pad, pad, pad, cv2.BORDER_REFLECT)
            faces = self.app.get(padded)
            if not faces:
                return None
        return max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))

    def match(self, image, top_k=4, gender_mode="auto", dataset="all"):
        """
        Match an image across one or multiple celebrity datasets.

        Args:
            image: numpy image array or file path.
            top_k: number of top matches to return.
            gender_mode: 'auto' (detect user gender), 'all' (any gender), 'Male', or 'Female'.
            dataset: 'all' (compare all datasets and take max), or specific dataset id (e.g. 'bollywood', 'hollywood').
        """
        if isinstance(image, np.ndarray):
            img = image
        else:
            img = cv2.imread(str(image))
        if img is None:
            return None

        face = self.detect_face(img)
        if face is None:
            return None

        emb = face.normed_embedding.copy()

        # Test-Time Augmentation (TTA): extract horizontally flipped embedding and fuse
        # This eliminates left-right camera tilt bias and glasses glare asymmetries
        try:
            img_flip = cv2.flip(img, 1)
            faces_flip = self.app.get(img_flip)
            if faces_flip:
                flip_face = max(faces_flip, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
                fused = emb + flip_face.normed_embedding
                norm = np.linalg.norm(fused)
                if norm > 0:
                    emb = (fused / norm).astype(np.float32)
        except Exception:
            pass

        detected_gender = "Male" if getattr(face, "gender", 1) == 1 else "Female"

        target_gender = None
        if gender_mode == "auto":
            target_gender = detected_gender
        elif gender_mode in ("Male", "Female"):
            target_gender = gender_mode

        all_matches = []
        by_dataset = {}

        # Evaluate each dataset
        for d_id, d_data in self.datasets.items():
            sims = d_data["embeddings"] @ emb
            names = d_data["names"]
            genders = d_data["gender"]

            if target_gender:
                cand_idx = [i for i, name in enumerate(names) if genders.get(name) == target_gender]
            else:
                cand_idx = list(range(len(names)))

            cand_idx.sort(key=lambda i: sims[i], reverse=True)

            d_matches = [
                {
                    "name": names[i],
                    "dataset": d_id,
                    "dataset_name": d_data["name"],
                    "dataset_icon": d_data.get("icon", "⭐"),
                    "gender": genders.get(names[i], "Unknown"),
                    "score": round(to_percent(sims[i]) / 100, 3),
                    "raw_similarity": round(float(sims[i]), 3),
                    "image_url": f"/photos/{quote(names[i])}.jpg",
                }
                for i in cand_idx[:top_k]
            ]

            by_dataset[d_id] = {
                "id": d_id,
                "name": d_data["name"],
                "icon": d_data.get("icon", "⭐"),
                "top": d_matches[0] if d_matches else None,
                "matches": d_matches,
            }

            # If matching 'all' or this specific dataset, include in candidate pool
            if dataset == "all" or dataset == d_id:
                all_matches.extend(d_matches)

        # Sort all candidates by similarity descending
        all_matches.sort(key=lambda m: m["score"], reverse=True)
        final_matches = all_matches[:top_k]

        available_datasets = [{"id": "all", "name": "All Stars", "icon": "⭐"}]
        for d_id, d_data in self.datasets.items():
            available_datasets.append({"id": d_id, "name": d_data["name"], "icon": d_data.get("icon", "⭐")})

        return {
            "detected_gender": detected_gender,
            "target_gender": target_gender or "All",
            "active_dataset": dataset,
            "available_datasets": available_datasets,
            "best_overall": final_matches[0] if final_matches else None,
            "by_dataset": by_dataset,
            "matches": final_matches,
        }


if __name__ == "__main__":
    import io
    if hasattr(sys.stdout, "buffer"):
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

    if len(sys.argv) < 2:
        sys.exit("usage: python match.py <image> [gender_mode: auto|all|Male|Female] [dataset: all|bollywood|hollywood]")
    g_mode = sys.argv[2] if len(sys.argv) > 2 else "auto"
    d_mode = sys.argv[3] if len(sys.argv) > 3 else "all"
    result = Matcher().match(sys.argv[1], gender_mode=g_mode, dataset=d_mode)
    if result is None:
        print("No face found in that image.")
    else:
        print(f"Detected gender: {result['detected_gender']} | Target: {result['target_gender']} | Dataset: {result['active_dataset']}")
        best = result["best_overall"]
        if best:
            print(f"\n>>> OVERALL TOP MATCH (MAX): {best['name']} [{best['dataset_icon']} {best['dataset_name']}] - {best['score'] * 100:.1f}%\n")
        print("--- Top by Industry ---")
        for d_id, d_info in result["by_dataset"].items():
            top = d_info["top"]
            if top:
                print(f"  {d_info['icon']} {d_info['name']:<12}: {top['name']:<22} ({top['score'] * 100:5.1f}%)")
        print("\n--- Combined Top Matches ---")
        for r in result["matches"]:
            print(f"  {r['dataset_icon']} {r['name']:<24} ({r['gender']}, {r['dataset_name']}) {r['score'] * 100:5.1f}% (raw {r['raw_similarity']})")
