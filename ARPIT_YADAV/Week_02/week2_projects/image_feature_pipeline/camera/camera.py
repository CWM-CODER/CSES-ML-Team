import cv2
import time

from sympy import fps

class Camera:
    def __init__(self,camera_id=0):
        self.camera_id = camera_id
        self.cap = cv2.VideoCapture(self.camera_id)

        if not self.cap.isOpened():
            raise Exception("Could not open video device")

        self.frame_id=0
    def read(self):
        ret, frame = self.cap.read()

        if not ret:
            return None, None, None
        
        self.frame_id += 1
        timestamp = time.time()
        return self.frame_id, timestamp, frame
    def get_properties(self):
       
            frame_width =  self.cap.get(cv2.CAP_PROP_FRAME_WIDTH)
            frame_height = self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
            fps = self.cap.get(cv2.CAP_PROP_FPS)
        
            return frame_width, frame_height, fps

    def release(self):
        self.cap.release()
        cv2.destroyAllWindows()
        