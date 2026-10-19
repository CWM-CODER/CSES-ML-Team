"""
Build ArcFace embeddings for any celebrity dataset (Bollywood, Hollywood, etc.)
and automatically register it into ./artifacts/datasets.json.

Usage:
    python build_embeddings.py --data data/ --dataset bollywood --name "Bollywood" --icon "🇮🇳"
    python build_embeddings.py --data Celebrity_Image_Data/ --dataset hollywood --name "Hollywood" --icon "🎬"
    python build_embeddings.py --data path/to/korean_celebs/ --dataset kpop --name "K-Stars" --icon "🇰🇷"

Outputs in ./artifacts:
    embeddings_<dataset>.npy   (N x 512 normalised ArcFace embeddings)
    names_<dataset>.json       (Celebrity names)
    gender_<dataset>.json      (Celebrity genders: Male/Female)
    photos/<name>.jpg          (Portrait-cropped headshot per celebrity)
    datasets.json              (Registered datasets configuration)
"""
import argparse
import json
import re
from pathlib import Path

import cv2
import numpy as np
from insightface.app import FaceAnalysis

IMG_EXT = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


def load_model():
    app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
    app.prepare(ctx_id=0, det_size=(640, 640))
    return app


def clean_name(folder_name):
    name = folder_name.strip()
    name = re.sub(r"^pins_", "", name, flags=re.IGNORECASE)
    name = re.sub(r"^\d+[_\-\s]+", "", name)
    name = name.replace("_", " ").replace("-", " ")
    name = re.sub(r"\s+", " ", name).strip()
    name = name.title()
    name = name.replace("'S ", "'s ")

    special_map = {
        "Ileana Dcruz": "Ileana D'Cruz",
        "R Madhavan": "R. Madhavan",
    }
    return special_map.get(name, name)


def find_celebrity_folders(root):
    folders = []
    for d in sorted(p for p in root.rglob("*") if p.is_dir()):
        if any(f.suffix.lower() in IMG_EXT for f in d.iterdir() if f.is_file()):
            folders.append(d)
    return folders


def main():
    ap = argparse.ArgumentParser(description="Build ArcFace embeddings for a celebrity dataset.")
    ap.add_argument("--data", required=True, help="Folder containing celebrity subdirectories")
    ap.add_argument("--dataset", default="bollywood", help="Dataset identifier, e.g. bollywood, hollywood, kpop")
    ap.add_argument("--name", default=None, help="Display name, e.g. Bollywood, Hollywood")
    ap.add_argument("--icon", default="*", help="Display icon, e.g. [IN] or [HW]")
    ap.add_argument("--out", default="artifacts", help="Artifacts directory (default: artifacts)")
    ap.add_argument("--max-photos", type=int, default=25, help="Max photos to sample per celebrity (default: 25)")
    ap.add_argument("--limit", type=int, default=None, help="Limit number of celebrities (for quick testing)")
    args = ap.parse_args()

    out = Path(args.out)
    photos_dir = out / "photos"
    photos_dir.mkdir(parents=True, exist_ok=True)

    dataset_id = args.dataset.strip().lower()
    dataset_name = args.name or dataset_id.title()
    icon = args.icon

    app = load_model()
    folders = find_celebrity_folders(Path(args.data))
    if args.limit:
        folders = folders[: args.limit]
    print(f"\nProcessing '{dataset_name}' dataset: found {len(folders)} celebrity folders in {args.data}\n")

    names = []
    vectors = []
    genders = {}
    skipped = []

    for idx, folder in enumerate(folders, 1):
        name = clean_name(folder.name)
        images = sorted(f for f in folder.iterdir() if f.is_file() and f.suffix.lower() in IMG_EXT)
        if not images:
            continue

        if len(images) > args.max_photos:
            step = len(images) / args.max_photos
            sampled = [images[int(i * step)] for i in range(args.max_photos)]
        else:
            sampled = images

        embs = []
        best_crop = None
        best_area = -1
        detected_genders = []

        for img_path in sampled:
            img = cv2.imread(str(img_path))
            if img is None:
                continue
            faces = app.get(img)
            pad = 0
            if not faces:
                pad = 35
                padded = cv2.copyMakeBorder(img, pad, pad, pad, pad, cv2.BORDER_REFLECT)
                faces = app.get(padded)
                if not faces:
                    continue
                img = padded

            face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
            embs.append(face.normed_embedding)
            detected_genders.append(getattr(face, "gender", 1))

            # Crop tight portrait around face
            x1, y1, x2, y2 = [int(v) for v in face.bbox]
            area = (x2 - x1) * (y2 - y1)
            if area > best_area:
                best_area = area
                h, w = img.shape[:2]
                bw, bh = x2 - x1, y2 - y1
                cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
                box_w = int(max(bw, bh) * 1.7)
                box_h = int(box_w * 1.3)
                nx1 = max(0, cx - box_w // 2)
                nx2 = min(w, nx1 + box_w)
                ny1 = max(0, cy - int(box_h * 0.42))
                ny2 = min(h, ny1 + box_h)
                crop = img[ny1:ny2, nx1:nx2]
                if crop.shape[0] > 80 and crop.shape[1] > 80:
                    best_crop = crop

        if len(embs) < 2:
            skipped.append(name)
            print(f"  [{idx:3d}/{len(folders)}] SKIP {name}: only {len(embs)} usable photos")
            continue

        mean = np.mean(embs, axis=0)
        mean /= np.linalg.norm(mean)

        # Majority vote for gender
        gender = "Male" if sum(detected_genders) >= len(detected_genders) / 2 else "Female"

        names.append(name)
        vectors.append(mean)
        genders[name] = gender

        if best_crop is not None:
            cv2.imwrite(str(photos_dir / f"{name}.jpg"), best_crop)

        print(f"  [{idx:3d}/{len(folders)}] OK   {name:<25} ({gender}): {len(embs)}/{len(images)} photos used")

    # Save dataset-specific files
    emb_filename = f"embeddings_{dataset_id}.npy"
    names_filename = f"names_{dataset_id}.json"
    gender_filename = f"gender_{dataset_id}.json"

    np.save(out / emb_filename, np.vstack(vectors).astype(np.float32))
    (out / names_filename).write_text(json.dumps(names, indent=2, ensure_ascii=False), encoding="utf-8")
    (out / gender_filename).write_text(json.dumps(genders, indent=2, ensure_ascii=False), encoding="utf-8")

    # Register in datasets.json
    datasets_file = out / "datasets.json"
    registry = {}
    if datasets_file.exists():
        try:
            registry = json.loads(datasets_file.read_text(encoding="utf-8"))
        except Exception:
            registry = {}

    registry[dataset_id] = {
        "id": dataset_id,
        "name": dataset_name,
        "icon": icon,
        "embeddings": emb_filename,
        "names": names_filename,
        "gender": gender_filename,
    }
    datasets_file.write_text(json.dumps(registry, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"\n{'=' * 60}")
    print(f"  SUCCESS! Dataset '{dataset_name}' ({icon}) built and registered.")
    print(f"  Saved {len(names)} celebrities to {out}/")
    print(f"  Registered in {datasets_file.name}")
    print(f"{'=' * 60}\n")


if __name__ == "__main__":
    import io, sys
    if hasattr(sys.stdout, "buffer"):
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    main()
