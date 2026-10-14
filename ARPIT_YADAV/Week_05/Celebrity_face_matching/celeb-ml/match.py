"""
Step 2: find which celebrity a photo looks most like.

Usage:
    python match.py my_photo.jpg
"""
import json
import sys
from pathlib import Path
from urllib.parse import quote

import numpy as np

from build_embeddings import get_embedding, load_model

ART = Path(__file__).parent / "artifacts"


def to_percent(sim):
    # Raw ArcFace cosine similarity between *different* people is usually 0.1-0.6,
    # so showing it directly looks low. This stretches that range to 0-100%.
    # It is a display choice, tune the two numbers until results feel right.
    return float(np.clip((sim - 0.10) / (0.65 - 0.10), 0, 1) * 100)


class Matcher:
    def __init__(self):
        self.app = load_model()
        self.embeddings = np.load(ART / "embeddings.npy")
        self.names = json.loads((ART / "names.json").read_text())

    def match(self, image, top_k=3):
        """`image` is a file path or a loaded image (numpy array)."""
        emb = get_embedding(self.app, image)
        if emb is None:
            return None  # no face found
        sims = self.embeddings @ emb  # cosine similarity (both sides are unit length)
        best = np.argsort(-sims)[:top_k]
        return [
            {
                "name": self.names[i],
                "score": round(to_percent(sims[i]) / 100, 3),
                "raw_similarity": round(float(sims[i]), 3),
                "image_url": f"/photos/{quote(self.names[i])}.jpg",
            }
            for i in best
        ]


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: python match.py <image>")
    result = Matcher().match(sys.argv[1])
    if result is None:
        print("No face found in that image.")
    else:
        for r in result:
            print(f"{r['name']:<25} {r['score'] * 100:5.1f}%   (raw {r['raw_similarity']})")
