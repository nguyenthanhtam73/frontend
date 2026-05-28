/**
 * On-device face detection for privacy blur placement.
 *
 * Uses MediaPipe BlazeFace (lazy-loaded from CDN on first photo) with a
 * browser Shape Detection API fallback. Both are free and run locally —
 * no cloud API calls.
 */

export type FaceBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type MediaPipeDetector = {
  detect: (image: HTMLCanvasElement) => { detections: { boundingBox?: { originX: number; originY: number; width: number; height: number } }[] };
};

type WindowWithFaceDetector = Window & {
  FaceDetector?: new (init?: { fastMode?: boolean; maxDetectedFaces?: number }) => {
    detect: (img: HTMLCanvasElement) => Promise<{ boundingBox: DOMRectReadOnly }[]>;
  };
};

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";

let mediaPipePromise: Promise<MediaPipeDetector | null> | null = null;

async function loadMediaPipeDetector(): Promise<MediaPipeDetector | null> {
  try {
    const { FaceDetector, FilesetResolver } = await import("@mediapipe/tasks-vision");
    const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
    for (const delegate of ["GPU", "CPU"] as const) {
      try {
        return await FaceDetector.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate },
          runningMode: "IMAGE",
        });
      } catch {
        // try next delegate
      }
    }
  } catch {
    // MediaPipe unavailable — heuristic blur will be used
  }
  return null;
}

function pickLargestFaceBox(
  boxes: FaceBox[],
): FaceBox | null {
  if (!boxes.length) return null;
  return boxes.reduce((best, box) =>
    box.width * box.height > best.width * best.height ? box : best,
  );
}

async function detectWithBrowserApi(canvas: HTMLCanvasElement): Promise<FaceBox | null> {
  const Ctor = (window as WindowWithFaceDetector).FaceDetector;
  if (!Ctor) return null;
  try {
    const detector = new Ctor({ fastMode: true, maxDetectedFaces: 3 });
    const faces = await detector.detect(canvas);
    const boxes = faces.map((f) => ({
      x: f.boundingBox.x,
      y: f.boundingBox.y,
      width: f.boundingBox.width,
      height: f.boundingBox.height,
    }));
    return pickLargestFaceBox(boxes);
  } catch {
    return null;
  }
}

/** Detect the primary face on a canvas (same pixel space as blur output). */
export async function detectFaceOnCanvas(canvas: HTMLCanvasElement): Promise<FaceBox | null> {
  if (!mediaPipePromise) {
    mediaPipePromise = loadMediaPipeDetector();
  }

  const mp = await mediaPipePromise;
  if (mp) {
    try {
      const result = mp.detect(canvas);
      const boxes: FaceBox[] = [];
      for (const det of result.detections) {
        const box = det.boundingBox;
        if (!box || box.width <= 0 || box.height <= 0) continue;
        boxes.push({
          x: box.originX,
          y: box.originY,
          width: box.width,
          height: box.height,
        });
      }
      const primary = pickLargestFaceBox(boxes);
      if (primary) return primary;
    } catch {
      // fall through to browser API
    }
  }

  return detectWithBrowserApi(canvas);
}
