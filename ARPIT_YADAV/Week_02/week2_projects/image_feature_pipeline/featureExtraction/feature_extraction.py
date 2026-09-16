import torchvision.models as models
import torch
import cv2
class FeatureExtractor:
    def __init__(self):
        self.model = models.resnet50(
            weights=models.ResNet50_Weights.DEFAULT
        )
        self.model.fc = torch.nn.Identity()  # Remove the final classification layer
        self.model.eval()  # Set the model to evaluation mode

    def extract(self, tensor):
        
        with torch.no_grad():
            features = self.model(tensor)
            features = features.squeeze(0)  # Remove the batch dimension
        return features