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

/** Primary on-device face hit used for privacy blur placement. */
export type FaceDetection = {
  box: FaceBox;
  /** Model score when available; browser Shape Detection has no confidence. */
  confidence: number | null;
};

type MediaPipeDetection = {
  boundingBox?: { originX: number; originY: number; width: number; height: number };
  categories?: { score?: number }[];
};

type MediaPipeDetector = {
  detect: (image: HTMLCanvasElement) => { detections: MediaPipeDetection[] };
};

/** Minimum box area vs image — rejects tiny false positives on skin texture. */
const MIN_FACE_AREA_RATIO = 0.018;
/** Smallest face side vs shorter image edge — allows partial profiles, not specks. */
const MIN_FACE_SIDE_RATIO = 0.06;
/** BlazeFace score floor when the model exposes confidence. */
const MIN_FACE_CONFIDENCE = 0.55;

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
    // MediaPipe unavailable — browser Shape Detection may still run
  }
  return null;
}

function pickLargestDetection(detections: FaceDetection[]): FaceDetection | null {
  if (!detections.length) return null;
  return detections.reduce((best, det) =>
    det.box.width * det.box.height > best.box.width * best.box.height ? det : best,
  );
}

function detectionFromBox(box: FaceBox, confidence: number | null): FaceDetection {
  return { box, confidence };
}

/** True when the box is large enough (and confident enough) to blur eyes safely. */
export function isClearFaceDetection(
  detection: FaceDetection,
  imgW: number,
  imgH: number,
): boolean {
  const { box, confidence } = detection;
  if (confidence != null && confidence < MIN_FACE_CONFIDENCE) return false;

  const imgArea = imgW * imgH;
  const faceArea = box.width * box.height;
  if (faceArea / imgArea < MIN_FACE_AREA_RATIO) return false;

  const minSide = Math.min(box.width, box.height);
  if (minSide < Math.min(imgW, imgH) * MIN_FACE_SIDE_RATIO) return false;

  return true;
}

async function detectWithBrowserApi(canvas: HTMLCanvasElement): Promise<FaceDetection | null> {
  const Ctor = (window as WindowWithFaceDetector).FaceDetector;
  if (!Ctor) return null;
  try {
    const detector = new Ctor({ fastMode: true, maxDetectedFaces: 3 });
    const faces = await detector.detect(canvas);
    const detections = faces.map((f) =>
      detectionFromBox(
        {
          x: f.boundingBox.x,
          y: f.boundingBox.y,
          width: f.boundingBox.width,
          height: f.boundingBox.height,
        },
        null,
      ),
    );
    return pickLargestDetection(detections);
  } catch {
    return null;
  }
}

/** Detect the primary face on a canvas (same pixel space as blur output). */
export async function detectFaceOnCanvas(canvas: HTMLCanvasElement): Promise<FaceDetection | null> {
  if (!mediaPipePromise) {
    mediaPipePromise = loadMediaPipeDetector();
  }

  const mp = await mediaPipePromise;
  if (mp) {
    try {
      const result = mp.detect(canvas);
      const detections: FaceDetection[] = [];
      for (const det of result.detections) {
        const box = det.boundingBox;
        if (!box || box.width <= 0 || box.height <= 0) continue;
        const score = det.categories?.[0]?.score;
        detections.push(
          detectionFromBox(
            {
              x: box.originX,
              y: box.originY,
              width: box.width,
              height: box.height,
            },
            typeof score === "number" ? score : null,
          ),
        );
      }
      const primary = pickLargestDetection(detections);
      if (primary) return primary;
    } catch {
      // fall through to browser API
    }
  }

  return detectWithBrowserApi(canvas);
}
