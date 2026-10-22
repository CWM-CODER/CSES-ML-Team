from mtcnn import MTCNN


class FaceDetector:

    def __init__(self):
        self.detector = MTCNN()

    def detect(self, image):

        results = self.detector.detect_faces(image)

        return results