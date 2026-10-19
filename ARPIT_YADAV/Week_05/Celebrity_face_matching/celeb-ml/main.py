"""
The web server: one endpoint that takes a photo and returns the closest celebrities,
and it also serves the website (frontend/) and the celebrity photos (artifacts/photos/).

Run for real (needs artifacts/ from build_embeddings.py):
    uvicorn main:app --reload

Run with fake data, to build/test the website before the embeddings exist:
    FAKE=1 uvicorn main:app --reload          (Windows PowerShell: $env:FAKE=1; uvicorn main:app --reload)

Then open http://localhost:8000 (camera works on localhost without HTTPS).
"""
import os
from pathlib import Path
from urllib.parse import quote

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

BASE = Path(__file__).parent
MAX_BYTES = 5 * 1024 * 1024  # reject uploads over 5 MB
MAX_SIDE = 1280              # shrink big photos before running the model
FAKE = os.getenv("FAKE") == "1"

if FAKE:

    class FakeMatcher:
        """Returns made-up results so the frontend can be built without the model."""

        def match(self, img, top_k=4, gender_mode="auto", dataset="all"):
            sample = [("Sample Actor 1", 0.78), ("Sample Actor 2", 0.71), ("Sample Actor 3", 0.64)]
            return {
                "detected_gender": "Male",
                "target_gender": "Male",
                "active_dataset": dataset,
                "available_datasets": [
                    {"id": "all", "name": "All Stars", "icon": "⭐"},
                    {"id": "bollywood", "name": "Bollywood", "icon": "🇮🇳"},
                    {"id": "hollywood", "name": "Hollywood", "icon": "🎬"},
                ],
                "best_overall": {"name": "Sample Actor 1", "dataset": "bollywood", "dataset_name": "Bollywood", "dataset_icon": "🇮🇳", "gender": "Male", "score": 0.78, "raw_similarity": 0.0, "image_url": f"/photos/{quote('Sample Actor 1')}.jpg"},
                "by_dataset": {},
                "matches": [
                    {"name": n, "dataset": "bollywood", "dataset_name": "Bollywood", "dataset_icon": "🇮🇳", "gender": "Male", "score": s, "raw_similarity": 0.0, "image_url": f"/photos/{quote(n)}.jpg"}
                    for n, s in sample[:top_k]
                ],
            }

    matcher = FakeMatcher()
else:
    from match import Matcher

    matcher = Matcher()  # loads the model and the saved celebrity embeddings once, at startup

app = FastAPI(title="Celebrity Lookalike")

# Lets the website call this API even if it is hosted on a different domain (e.g. Vercel).
# Replace "*" with your real site URL once deployed.
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
def health():
    return {"ok": True, "fake": FAKE}


@app.post("/match")
async def match(file: UploadFile = File(...), gender: str = "auto", dataset: str = "all"):
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "That image is too large. Use a photo under 5 MB.")

    img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(400, "That file isn't a readable image. Try a JPG or PNG.")

    h, w = img.shape[:2]
    if max(h, w) > MAX_SIDE:
        scale = MAX_SIDE / max(h, w)
        img = cv2.resize(img, (int(w * scale), int(h * scale)))

    # The model is CPU-heavy, so run it off the main event loop.
    result = await run_in_threadpool(matcher.match, img, gender_mode=gender, dataset=dataset)
    if result is None:
        raise HTTPException(422, "No face found. Face the camera in good light and try again.")
    return result


# Celebrity photos, then the website itself. The "/" mount must stay last.
PHOTOS = BASE / "artifacts" / "photos"
PHOTOS.mkdir(parents=True, exist_ok=True)  # so a missing photo is a clean 404, not a crash
app.mount("/photos", StaticFiles(directory=PHOTOS), name="photos")
app.mount("/", StaticFiles(directory=BASE / "frontend", html=True), name="site")
