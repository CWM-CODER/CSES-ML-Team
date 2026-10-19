"""
Download and build ArcFace embeddings for the 100 Bollywood Celebrity Faces dataset.

Usage:
    python download_and_build.py

What this script does:
    1. Detects the downloaded '100-bollywood-celebrity-faces' dataset in ./data.
    2. Discovers all 100 celebrity folders across subdirectories.
    3. Cleans folder names into proper display names (e.g. "shah_rukh_khan" -> "Shah Rukh Khan").
    4. For each celebrity, extracts ArcFace embeddings from their photos (sampled evenly),
       computes a mean embedding (unit-normalised), and picks the best display photo.
    5. Saves the results into ./artifacts/ so that main.py & match.py work immediately:
         artifacts/embeddings.npy    (100 x 512, float32, unit-length rows)
         artifacts/names.json        (list of 100 celebrity names)
         artifacts/photos/<name>.jpg (one display photo per celebrity)
"""

import json
import re
import shutil
import sys
from pathlib import Path

import cv2
import numpy as np

# ────────────────────────────────────────────────────────────────────
# Step 1: Download the dataset
# ────────────────────────────────────────────────────────────────────

def download_dataset():
    """Download the dataset using kagglehub and return the local path."""
    try:
        import kagglehub
    except ImportError:
        sys.exit("ERROR: kagglehub is not installed.  Run:  pip install kagglehub")

    print("Downloading 'souravbanerjee/indian-actor-images-dataset' from Kaggle ...")
    path = kagglehub.dataset_download("souravbanerjee/indian-actor-images-dataset")
    print(f"Dataset downloaded to: {path}")
    return Path(path)


# ────────────────────────────────────────────────────────────────────
# Step 2: Find celebrity folders
# ────────────────────────────────────────────────────────────────────

IMG_EXT = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


def find_celebrity_folders(root: Path):
    """Return a sorted list of directories that directly contain image files."""
    folders = []
    for d in sorted(root.rglob("*")):
        if d.is_dir():
            has_images = any(
                f.suffix.lower() in IMG_EXT
                for f in d.iterdir()
                if f.is_file()
            )
            if has_images:
                folders.append(d)
    # Also check the root itself
    if root.is_dir():
        has_images = any(
            f.suffix.lower() in IMG_EXT
            for f in root.iterdir()
            if f.is_file()
        )
        if has_images:
            folders.insert(0, root)
    return folders


# ────────────────────────────────────────────────────────────────────
# Step 3: Clean folder names into proper celebrity display names
# ────────────────────────────────────────────────────────────────────

def clean_name(folder_name: str) -> str:
    """
    Convert a raw folder name into a clean, human-friendly celebrity name.

    Examples:
        'shah_rukh_khan'        -> 'Shah Rukh Khan'
        'Shah Rukh Khan'        -> 'Shah Rukh Khan'
        '01_amitabh_bachchan'   -> 'Amitabh Bachchan'
        'deepika-padukone'      -> 'Deepika Padukone'
        'pins_Tom Hardy'        -> 'Tom Hardy'
    """
    name = folder_name.strip()

    # Remove common prefixes like "pins_" or leading numbers "01_", "001_"
    name = re.sub(r"^pins_", "", name, flags=re.IGNORECASE)
    name = re.sub(r"^\d+[_\-\s]+", "", name)

    # Replace underscores and hyphens with spaces
    name = name.replace("_", " ").replace("-", " ")

    # Collapse multiple spaces
    name = re.sub(r"\s+", " ", name).strip()

    # Title-case each word
    name = name.title()

    # Fix common title-case errors for Indian names
    # e.g. "D'Cruz" should stay, "Jr" -> "Jr." etc.
    name = name.replace("'S ", "'s ")  # possessives

    special_map = {
        "Ileana Dcruz": "Ileana D'Cruz",
        "R Madhavan": "R. Madhavan",
    }
    return special_map.get(name, name)


# ────────────────────────────────────────────────────────────────────
# Step 4: Load InsightFace model
# ────────────────────────────────────────────────────────────────────

def load_model():
    """Load the InsightFace ArcFace model (buffalo_l)."""
    from insightface.app import FaceAnalysis

    print("Loading InsightFace model (buffalo_l) ...")
    app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
    app.prepare(ctx_id=0, det_size=(640, 640))
    print("Model loaded.")
    return app


def get_embedding(app, img_path):
    """
    Return (embedding, detection_score) for the largest face in the image,
    or (None, 0) if no face is found or the image cannot be read.
    """
    try:
        img = cv2.imread(str(img_path))
        if img is None:
            return None, 0
        faces = app.get(img)
        if not faces:
            return None, 0
        # Pick the largest face
        face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
        score = float(face.det_score) if hasattr(face, "det_score") else 0.5
        return face.normed_embedding, score
    except Exception as e:
        print(f"    WARNING: could not process {img_path.name}: {e}")
        return None, 0


# ────────────────────────────────────────────────────────────────────
# Step 5: Build embeddings
# ────────────────────────────────────────────────────────────────────

def build_embeddings(data_root: Path, out_dir: Path, min_photos: int = 2, max_photos: int = 25):
    """
    Iterate over every celebrity folder, compute embeddings, and save artifacts.

    Args:
        data_root:  Path to the downloaded dataset root.
        out_dir:    Path to ./artifacts
        min_photos: Minimum usable photos required to include a celebrity.
        max_photos: Maximum photos to process per celebrity (sampled evenly).
    """
    photos_dir = out_dir / "photos"
    photos_dir.mkdir(parents=True, exist_ok=True)

    app = load_model()
    folders = find_celebrity_folders(data_root)
    print(f"\nFound {len(folders)} celebrity folders in {data_root}\n")

    if len(folders) == 0:
        sys.exit(
            f"ERROR: No celebrity folders found under {data_root}.\n"
            "Check the dataset directory structure."
        )

    names = []
    vectors = []
    skipped = []

    for idx, folder in enumerate(folders, 1):
        raw_name = folder.name
        display_name = clean_name(raw_name)

        images = sorted(
            f for f in folder.iterdir()
            if f.is_file() and f.suffix.lower() in IMG_EXT
        )

        if not images:
            continue

        total_found = len(images)
        if max_photos and len(images) > max_photos:
            # Sample evenly across photos for diversity of angles and lighting
            step = len(images) / max_photos
            images = [images[int(i * step)] for i in range(max_photos)]

        embeddings = []
        best_photo = None
        best_score = -1.0

        for img_path in images:
            emb, score = get_embedding(app, img_path)
            if emb is not None:
                embeddings.append(emb)
                if score > best_score:
                    best_score = score
                    best_photo = img_path

        if len(embeddings) < min_photos:
            skipped.append((display_name, len(embeddings), len(images)))
            print(f"  [{idx:3d}/{len(folders)}] SKIP  {display_name}: "
                  f"only {len(embeddings)}/{len(images)} usable photos (need >= {min_photos})")
            continue

        # Mean embedding, re-normalised to unit length
        mean_emb = np.mean(embeddings, axis=0)
        norm = np.linalg.norm(mean_emb)
        if norm > 0:
            mean_emb /= norm

        names.append(display_name)
        vectors.append(mean_emb)

        # Copy the best (highest detection confidence) photo as the display photo
        dest = photos_dir / f"{display_name}.jpg"
        try:
            shutil.copy(best_photo, dest)
        except Exception as e:
            print(f"    WARNING: could not copy display photo for {display_name}: {e}")

        print(f"  [{idx:3d}/{len(folders)}]  OK   {display_name}: "
              f"{len(embeddings)}/{len(images)} photos used (from {total_found} total)")

    # ── Save artifacts ──
    if not vectors:
        sys.exit("ERROR: No celebrities had enough usable photos. Nothing to save.")

    emb_matrix = np.vstack(vectors).astype(np.float32)
    np.save(out_dir / "embeddings.npy", emb_matrix)
    (out_dir / "names.json").write_text(json.dumps(names, indent=2, ensure_ascii=False))

    print(f"\n{'=' * 60}")
    print(f"  DONE!")
    print(f"  Saved {len(names)} celebrities to {out_dir}/")
    print(f"  embeddings.npy shape: {emb_matrix.shape}")
    print(f"  Skipped {len(skipped)} celebrities (too few usable photos)")
    if skipped:
        for sname, good, total in skipped:
            print(f"    - {sname}: {good}/{total}")
    print(f"{'=' * 60}")


# ────────────────────────────────────────────────────────────────────
# Main
# ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    local_data = Path(__file__).parent / "data"
    folders = find_celebrity_folders(local_data) if local_data.exists() else []

    if folders:
        print(f"Found downloaded dataset in local directory: {local_data}")
        dataset_path = local_data
    else:
        # Download from Kaggle
        dataset_path = download_dataset()

    # 2. Build embeddings and save to ./artifacts
    out = Path(__file__).parent / "artifacts"
    build_embeddings(dataset_path, out, max_photos=25)
