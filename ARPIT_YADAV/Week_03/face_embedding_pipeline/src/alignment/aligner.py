import cv2
import numpy as np


class FaceAligner:

    def __init__(self):

        self.reference_points = np.array([
            [38.2946, 51.6963],
            [73.5318, 51.5014],
            [56.0252, 71.7366],
            [41.5493, 92.3655],
            [70.7299, 92.2041]
        ], dtype=np.float32)

    def align(self, image, keypoints):

        source_points = np.array([
            keypoints["left_eye"],
            keypoints["right_eye"],
            keypoints["nose"],
            keypoints["mouth_left"],
            keypoints["mouth_right"]
        ], dtype=np.float32)

        transformation_matrix, _ = cv2.estimateAffinePartial2D(
            source_points,
            self.reference_points
        )

        aligned_face = cv2.warpAffine(
            image,
            transformation_matrix,
            (112, 112)
        )

        return aligned_face