import cv2

from src.pipeline.face_pipeline import FacePipeline


image = cv2.imread("data/input/face.jpg")

if image is None:
    raise ValueError("Could not load image.")


pipeline = FacePipeline()

embeddings = pipeline.process(image)


print("Number of faces:", len(embeddings))


for i, embedding in enumerate(embeddings):

    print(f"\nFace {i + 1}")
    print("Embedding dimension:", len(embedding))
    print("Embedding:")
    print(embedding)