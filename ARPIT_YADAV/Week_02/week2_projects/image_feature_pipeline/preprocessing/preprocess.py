import cv2
import torch 
import numpy as np
class Preprocess:
    def __init__(self , target_width=224, target_height=224):
        self.target_width = target_width
        self.target_height = target_height

    def resize(self, frame):
        resized_frame = cv2.resize(frame, (self.target_width, self.target_height))
        return resized_frame

    def bgr_to_rgb(self, frame):
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        return rgb_frame

    def normalize(self, frame):
        normalized_frame = frame.astype(np.float32) / 255.0
        return normalized_frame

    def to_tensor(self , frame):
        tensor = torch.from_numpy(frame).permute(2, 0, 1)
        tensor = tensor.unsqueeze(0)  # Add batch dimension
        return tensor

    def normalize_for_resnet50(self , frame):
        
        mean = torch.tensor([0.485, 0.456, 0.406] , dtype = frame.dtype).view(1, 3, 1, 1)
        std = torch.tensor([0.229, 0.224, 0.225], dtype = frame.dtype).view(1, 3, 1, 1)
        normalized_frame = (frame - mean) / std
        return normalized_frame