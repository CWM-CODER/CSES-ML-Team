"""
Step 1 (run once): turn the Kaggle celebrity photos into one embedding per celebrity.

Usage:
    python build_embeddings.py --data data/ --limit 5      # quick test with 5 celebrities
    python build_embeddings.py --data data/                # full run

Expected layout: any folder that directly contains images is treated as one celebrity,
e.g. data/pins_Tom Hardy/img1.jpg  ->  celebrity "Tom Hardy".

Outputs (in ./artifacts):
    embeddings.npy   one 512-number vector per celebrity (already normalised)
    names.json       celebrity names, same order as embeddings.npy
    photos/          one display photo per celebrity (for the website)
"""
import argparse
import json
import shutil
from pathlib import Path

import cv2
import numpy as np
from insightface.app import FaceAnalysis

IMG_EXT = {".jpg", ".jpeg", ".png", ".webp"}


def load_model():
    # buffalo_l = InsightFace's most accurate standard pack (detector + ArcFace).
    # Use ["CUDAExecutionProvider", "CPUExecutionProvider"] if you have a GPU.
    app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
    app.prepare(ctx_id=0, det_size=(640, 640))
    return app


def get_embedding(app, img_or_path):
    """Return the normalised embedding of the largest face in the image, or None.
    Accepts a file path, or an already-loaded image (numpy array in BGR order)."""
    if isinstance(img_or_path, np.ndarray):
        img = img_or_path
    else:
        img = cv2.imread(str(img_or_path))
    if img is None:
        return None
    faces = app.get(img)
    if not faces:
        return None
    face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
    return face.normed_embedding


def clean_name(folder_name):
    name = folder_name
    if name.lower().startswith("pins_"):
        name = name[5:]
    return name.replace("_", " ").strip()


def find_celebrity_folders(root):
    folders = []
    for d in sorted(p for p in root.rglob("*") if p.is_dir()):
        if any(f.suffix.lower() in IMG_EXT for f in d.iterdir() if f.is_file()):
            folders.append(d)
    return folders


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True, help="folder with the downloaded dataset")
    ap.add_argument("--out", default="artifacts")
    ap.add_argument("--limit", type=int, default=None, help="only process N celebrities (for testing)")
    args = ap.parse_args()

    out = Path(args.out)
    (out / "photos").mkdir(parents=True, exist_ok=True)

    app = load_model()
    folders = find_celebrity_folders(Path(args.data))
    if args.limit:
        folders = folders[: args.limit]
    print(f"Found {len(folders)} celebrity folders")

    names, vectors = [], []
    for folder in folders:
        images = sorted(f for f in folder.iterdir() if f.suffix.lower() in IMG_EXT)
        embs, best_photo = [], None
        for img in images:
            e = get_embedding(app, img)
            if e is not None:
                embs.append(e)
                best_photo = best_photo or img
        if len(embs) < 3:
            print(f"  skip {folder.name}: only {len(embs)} usable photos")
            continue
        mean = np.mean(embs, axis=0)
        mean /= np.linalg.norm(mean)  # keep it unit length so dot product = cosine similarity
        name = clean_name(folder.name)
        names.append(name)
        vectors.append(mean)
        shutil.copy(best_photo, out / "photos" / f"{name}.jpg")
        print(f"  ok   {name}: {len(embs)}/{len(images)} photos used")

    np.save(out / "embeddings.npy", np.vstack(vectors).astype(np.float32))
    (out / "names.json").write_text(json.dumps(names, indent=2))
    print(f"Saved {len(names)} celebrities to {out}/")


if __name__ == "__main__":
    main()
