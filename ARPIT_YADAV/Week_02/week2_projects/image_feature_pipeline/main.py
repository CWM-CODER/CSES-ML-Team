import cv2
from preprocessing.preprocess import Preprocess
from camera.camera import Camera
from featureExtraction.feature_extraction import FeatureExtractor

camera = Camera(0)
preprocessor = Preprocess(target_width=224, target_height=224)
extractor = FeatureExtractor()
print("Feature extraction model loaded successfully.")
print("Model is ready for inference.")
print("camera started")
frame_width, frame_height, fps = camera.get_properties()
print(f"camera properties - Width: {frame_width}, Height: {frame_height}, FPS: {fps}")
while True:
    result = camera.read()
    if result[0] is None:
        print("Failed to capture frame")
        break
    frame_id, timestamp, frame = result
    res_frame = preprocessor.resize(frame)
    rgb_frame = preprocessor.bgr_to_rgb(res_frame)
    normalized_frame = preprocessor.normalize(rgb_frame)
    tensor = preprocessor.to_tensor(normalized_frame)
    resnet_tensor = preprocessor.normalize_for_resnet50(tensor)
    extracter = extractor.extract(resnet_tensor)
    
    if frame_id==1:
        print()
        print("Final ResNet Input")
        print("------------------")
        print(f"Shape : {resnet_tensor.shape}")
        print(f"Type  : {resnet_tensor.dtype}")
        print(f"Min   : {resnet_tensor.min().item():.4f}")
        print(f"Max   : {resnet_tensor.max().item():.4f}")
        print()
        print("Feature Vector")
        print("--------------")
        print(f"Shape: {extracter.shape}")
        print(f"Type : {extracter.dtype}")
        print()
        print("First 10 feature values:")
        print(extracter[:10])
        print("info about the feature vector")
        print("----------------------------")
        print(f"Min : {extracter.min().item():.4f}") 
        print(f"Max : {extracter.max().item():.4f}")
        print(f"Mean: {extracter.mean().item():.4f}")
    cv2.imshow('original', frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

camera.release()
cv2.destroyAllWindows()
print("camera stopped")
