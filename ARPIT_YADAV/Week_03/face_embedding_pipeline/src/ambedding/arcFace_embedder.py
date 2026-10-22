from insightface.app import FaceAnalysis
import cv2
import numpy as np


class ArcFaceEmbedder:

    def __init__(self):

        self.model = FaceAnalysis(
            name="buffalo_l",
            providers=["CPUExecutionProvider"]
        )

        self.model.prepare(
            ctx_id=0,
            det_size=(640, 640)
        )

    def get_embedding(self, aligned_face):

        face = cv2.cvtColor(
            aligned_face,
            cv2.COLOR_BGR2RGB
        )

        faces = self.model.get(face)

        if len(faces) == 0:
            raise ValueError("ArcFace could not process the aligned face.")

        embedding = faces[0].embedding

        embedding = np.asarray(
            embedding,
            dtype=np.float32
        )

        return embedding