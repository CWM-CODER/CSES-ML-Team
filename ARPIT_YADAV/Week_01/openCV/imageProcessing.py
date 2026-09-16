# import cv2
# import os

# base_dir = os.path.dirname(os.path.abspath(__file__))
# path = os.path.join(base_dir, "images", "arpitImg.JPG")

# img = cv2.imread(path)

# if img is None:
#     print("Image could not be loaded")
#     exit()

# display_img = cv2.resize(img, (800, 600))

# drw = False
# ix = -1
# iy = -1


# def draw(event, x, y, flags, params):
#     global ix, iy, drw

#     if event == cv2.EVENT_LBUTTONDOWN:
#         ix = x
#         iy = y
#         drw = True

#     elif event == cv2.EVENT_MOUSEMOVE:
#         if drw:
#             cv2.rectangle(
#                 display_img,
#                 pt1=(ix, iy),
#                 pt2=(x, y),
#                 color=(255, 0, 0),
#                 thickness=-1
#             )

#     elif event == cv2.EVENT_LBUTTONUP:
#         drw = False

#         cv2.rectangle(
#             display_img,
#             pt1=(ix, iy),
#             pt2=(x, y),
#             color=(255, 0, 0),
#             thickness=-1
#         )


# cv2.namedWindow("window")

# cv2.setMouseCallback("window", draw)


# while True:

#     cv2.imshow("window", display_img)

#     if (cv2.waitKey(1) & 0xFF) == ord('x'):
#         break


# cv2.destroyAllWindows()

# cap = cv2.VideoCapture(0)
# width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
# height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

# fourcc = cv2.VideoWriter_fourcc(*'XVID')

# out = cv2.VideoWriter(
#     "my_video.avi",
#     fourcc,
#     20.0,
#     (width, height)
# )

# while True:
#     ret , frame = cap.read()
#     cv2.imshow("webcam" , frame)
#     out.write(frame)

#     if (cv2.waitKey(1) & 0xFF) == ord('x'):
#         break


# cv2.destroyAllWindows()
# cap.release()
# out.release()

############################### IF WE HAVE TO PLAY THE VIDEO #########################
import cv2
import os

base_dir = os.path.dirname(os.path.abspath(__file__))
video_path = os.path.join(base_dir, "my_video.avi")

print("Video path:", video_path)
print("Video exists:", os.path.exists(video_path))

cap = cv2.VideoCapture(video_path)

if not cap.isOpened():
    print("Could not open video")
    exit()

while True:

    ret, frame = cap.read()

    if not ret:
        print("Video finished")
        break

    cv2.imshow("video", frame)

    if (cv2.waitKey(50) & 0xFF) == ord('x'):
        break

cap.release()
cv2.destroyAllWindows()