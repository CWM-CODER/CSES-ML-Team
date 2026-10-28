export async function startCamera(videoEl, { width = 1280, height = 720, fps = 60 } = {}) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: width, min: 640 },
      height: { ideal: height, min: 480 },
      frameRate: { ideal: fps },
      facingMode: "user",
    },
    audio: false,
  });
  videoEl.srcObject = stream;
  await videoEl.play();
  return stream;
}

export function onFrame(videoEl, cb) {
  if ("requestVideoFrameCallback" in videoEl) {
    const loop = (now, meta) => {
      const captureTs = meta.captureTime ?? meta.expectedDisplayTime ?? now;
      cb({ captureTs });
      videoEl.requestVideoFrameCallback(loop);
    };
    videoEl.requestVideoFrameCallback(loop);
  } else {

    const loop = () => {
      cb({ captureTs: performance.now() });
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

