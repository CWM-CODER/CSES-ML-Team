from src.detector.mtcnn_detector import FaceDetector
from src.alignment.face_aligner import FaceAligner
from src.embedding.arcface_embedder import ArcFaceEmbedder


class FacePipeline:

    def __init__(self):

        self.detector = FaceDetector()
        self.aligner = FaceAligner()
        self.embedder = ArcFaceEmbedder()

    def process(self, image):

        detections = self.detector.detect(image)

        results = []

        for detection in detections:

            keypoints = detection["keypoints"]

            aligned_face = self.aligner.align(
                image,
                keypoints
            )

            embedding = self.embedder.get_embedding(
                aligned_face
            )

            results.append(embedding)

        return results