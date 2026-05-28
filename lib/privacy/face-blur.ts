/**
 * Client-side face anonymization for skin-photo flows.
 *
 * Goal — give users a *visible, trustworthy* blur over the most identifying
 * facial features (eyes & mouth) BEFORE the image leaves the browser, while
 * keeping enough skin texture readable so the AI vision pipeline can still
 * give useful skin feedback (we deliberately don't blur the whole face).
 *
 * Strategy:
 *   1. Decode the image off-DOM with `createImageBitmap` (fast, off-thread when
 *      supported) and downscale to a max dimension to bound CPU + upload size.
 *   2. Try `window.FaceDetector` for a precise face box (Chromium with the
 *      Shape Detection API). When available we blur both an eye band and a
 *      mouth band inside the detected face box.
 *   3. Fall back to a heuristic eye-band blur over the upper centre of the
 *      image — selfies almost always centre the face, so this still anonymises
 *      the most identifying region and gives the user clear visual feedback
 *      that "the photo has been anonymised".
 *
 * This module is dependency-free and tree-shakeable; importing it does NOT
 * pull in any model weights. Heavy work is gated behind explicit calls.
 */

const MAX_DIM = 1280;
const OUTPUT_TYPE = "image/jpeg";
const OUTPUT_QUALITY = 0.9;

/** Subset of the experimental Shape Detection API we rely on when present. */
type FaceDetectorLike = {
  detect: (
    img: ImageBitmap | HTMLImageElement | HTMLCanvasElement,
  ) => Promise<{ boundingBox: DOMRectReadOnly }[]>;
};

type WindowWithFaceDetector = Window & {
  FaceDetector?: new (init?: { fastMode?: boolean; maxDetectedFaces?: number }) => FaceDetectorLike;
};

export type BlurMethod = "native-face-detector" | "heuristic" | "skipped";

export type BlurredImage = {
  /** Blurred output as a `File`, ready for `FormData.append`. */
  file: File;
  /** Object URL pointing at the blurred output (revoke when done). */
  previewUrl: string;
  /** Which path produced the blur — used for analytics + UI hint copy. */
  method: BlurMethod;
  /** Final pixel size after downscale. */
  width: number;
  height: number;
};

/**
 * Blur the most identifying facial regions in `file` and return a new image
 * file along with a preview URL.
 *
 * On any unrecoverable error (e.g. corrupt file) the function rejects rather
 * than returning the original — callers MUST treat the original as private
 * and never upload it.
 */
export async function blurFaceInImage(file: File): Promise<BlurredImage> {
  if (typeof window === "undefined") {
    throw new Error("blurFaceInImage must run in the browser");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error(`Unsupported file type: ${file.type || "unknown"}`);
  }

  const decoded = await decodeImage(file);
  try {
    const { width, height } = computeFitSize(decoded.width, decoded.height, MAX_DIM);
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas context unavailable");

    ctx.drawImage(decoded.source, 0, 0, width, height);

    // Detect on the same scaled canvas we blur — coordinates must match pixel space.
    const faceBox = await detectPrimaryFace(canvas);
    const regions = computeBlurRegions(width, height, faceBox);

    for (const region of regions) {
      blurRegion(ctx, canvas, region);
    }

    const blob = await canvasToBlob(canvas, OUTPUT_TYPE, OUTPUT_QUALITY);
    const outName = renameForBlur(file.name);
    const outFile = new File([blob], outName, { type: OUTPUT_TYPE, lastModified: Date.now() });
    const previewUrl = URL.createObjectURL(blob);
    return {
      file: outFile,
      previewUrl,
      method: faceBox ? "native-face-detector" : "heuristic",
      width,
      height,
    };
  } finally {
    decoded.dispose();
  }
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

type DecodedImage = {
  /** A `CanvasImageSource` we can hand to `drawImage` and `FaceDetector.detect`. */
  source: ImageBitmap | HTMLImageElement;
  width: number;
  height: number;
  /** Releases any retained resources (`ImageBitmap` close + revoked object URL). */
  dispose: () => void;
};

/** Lightweight image decode that prefers `createImageBitmap` when available. */
async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        dispose: () => bitmap.close?.(),
      };
    } catch {
      try {
        const bitmap = await createImageBitmap(file);
        return {
          source: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          dispose: () => bitmap.close?.(),
        };
      } catch {
        // fall through to Image() path
      }
    }
  }
  return new Promise<DecodedImage>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () =>
      resolve({
        source: img,
        width: img.naturalWidth,
        height: img.naturalHeight,
        dispose: () => URL.revokeObjectURL(url),
      });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode image"));
    };
    img.src = url;
  });
}

function createCanvas(w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  return canvas;
}

function computeFitSize(w: number, h: number, maxDim: number) {
  if (w <= maxDim && h <= maxDim) return { width: w, height: h };
  const ratio = w >= h ? maxDim / w : maxDim / h;
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

async function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Canvas encoding failed"));
        else resolve(blob);
      },
      type,
      quality,
    );
  });
}

/** Append `-blurred` before the file extension so saved files are easy to spot. */
function renameForBlur(name: string): string {
  const lastDot = name.lastIndexOf(".");
  if (lastDot <= 0) return `${name}-blurred.jpg`;
  const base = name.slice(0, lastDot);
  return `${base}-blurred.jpg`;
}

type BlurRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Stronger blur for tight regions (eyes); softer for wider ones (mouth band). */
  blurPx: number;
};

/**
 * Pick which regions to blur.
 *
 * Two very different cases:
 *
 * - **Detected face** (Chromium Shape Detection API present): we know exactly
 *   where the face is, so we blur tight eye + mouth strips inside the box and
 *   leave the rest of the skin fully readable.
 *
 * - **No detector** (Safari / Firefox / Chrome without the flag — i.e. most
 *   users): we cannot know the face size, and a single guessed box badly
 *   misaligns between close-up selfies (face fills the frame) and arm's-length
 *   shots (small, centred). Instead of guessing one box we blur two WIDE bands
 *   spanning the whole plausible eye-to-mouth range. This reliably hides the
 *   identifying features for any centred portrait while keeping the forehead,
 *   jaw/chin and outer cheeks readable for skin analysis.
 */
function computeBlurRegions(
  imgW: number,
  imgH: number,
  face: { x: number; y: number; width: number; height: number } | null,
): BlurRegion[] {
  if (face) {
    const minSide = Math.min(face.width, face.height);
    const eye: BlurRegion = {
      x: face.x + face.width * 0.02,
      y: face.y + face.height * 0.16,
      width: face.width * 0.96,
      height: face.height * 0.32,
      blurPx: Math.max(24, minSide * 0.24),
    };
    const mouth: BlurRegion = {
      x: face.x + face.width * 0.12,
      y: face.y + face.height * 0.58,
      width: face.width * 0.76,
      height: face.height * 0.26,
      blurPx: Math.max(18, minSide * 0.18),
    };
    return [clampRegion(eye, imgW, imgH), clampRegion(mouth, imgW, imgH)];
  }

  // Fallback: cover the full plausible eye + nose/mouth range of a centred
  // portrait so coverage holds whether the face is near or far in the frame.
  const minSide = Math.min(imgW, imgH);
  const eyeBand: BlurRegion = {
    x: imgW * 0.06,
    y: imgH * 0.2,
    width: imgW * 0.88,
    height: imgH * 0.3,
    blurPx: Math.max(28, minSide * 0.07),
  };
  const mouthBand: BlurRegion = {
    x: imgW * 0.12,
    y: imgH * 0.52,
    width: imgW * 0.76,
    height: imgH * 0.26,
    blurPx: Math.max(22, minSide * 0.055),
  };
  return [clampRegion(eyeBand, imgW, imgH), clampRegion(mouthBand, imgW, imgH)];
}

function clampRegion(r: BlurRegion, w: number, h: number): BlurRegion {
  const x = clamp(r.x, 0, w);
  const y = clamp(r.y, 0, h);
  const width = clamp(r.x + r.width, 0, w) - x;
  const height = clamp(r.y + r.height, 0, h) - y;
  return { x, y, width, height, blurPx: r.blurPx };
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Apply a strong blur to a single region by:
 *   1. Cropping the region from the canvas onto a temporary canvas (with
 *      slight padding so the blur edge doesn't show a hard seam).
 *   2. Painting that crop back over the source canvas with `ctx.filter` set
 *      to `blur(...)` and a soft elliptical clip so the edges feather out.
 *
 * Implementation note: we use `ctx.filter = "blur(Npx)"` rather than a
 * hand-rolled box-blur in JS — it's hardware accelerated on every modern
 * browser, runs an order of magnitude faster, and produces a higher-quality
 * gaussian look. Safari supports it from 14+ which covers our user base.
 */
function blurRegion(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  region: BlurRegion,
) {
  if (region.width <= 0 || region.height <= 0) return;
  const padding = Math.ceil(region.blurPx * 1.5);
  const sx = Math.max(0, Math.floor(region.x - padding));
  const sy = Math.max(0, Math.floor(region.y - padding));
  const sw = Math.min(canvas.width - sx, Math.ceil(region.width + padding * 2));
  const sh = Math.min(canvas.height - sy, Math.ceil(region.height + padding * 2));
  if (sw <= 0 || sh <= 0) return;

  ctx.save();

  // Soft elliptical clip on the destination so the blur fades out smoothly
  // instead of leaving a rectangular badge. Slightly larger than the region
  // so the feathering happens within the region.
  const cx = region.x + region.width / 2;
  const cy = region.y + region.height / 2;
  const rx = region.width / 2 + padding * 0.25;
  const ry = region.height / 2 + padding * 0.25;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.clip();

  ctx.filter = `blur(${region.blurPx}px)`;
  // Multiple passes compound the gaussian so features become unrecognisable
  // (a single pass can leave ghosting of strong edges like eyes/glasses).
  ctx.drawImage(canvas, sx, sy, sw, sh, sx, sy, sw, sh);
  ctx.drawImage(canvas, sx, sy, sw, sh, sx, sy, sw, sh);
  ctx.drawImage(canvas, sx, sy, sw, sh, sx, sy, sw, sh);
  ctx.filter = "none";
  ctx.restore();
}

async function detectPrimaryFace(
  source: HTMLCanvasElement | ImageBitmap | HTMLImageElement,
): Promise<{ x: number; y: number; width: number; height: number } | null> {
  const Ctor = (window as WindowWithFaceDetector).FaceDetector;
  if (!Ctor) return null;
  try {
    const detector = new Ctor({ fastMode: true, maxDetectedFaces: 1 });
    const faces = await detector.detect(source);
    if (!faces.length) return null;
    // Pick the largest face by area.
    const primary = faces.reduce((biggest, f) =>
      f.boundingBox.width * f.boundingBox.height >
      biggest.boundingBox.width * biggest.boundingBox.height
        ? f
        : biggest,
    );
    const box = primary.boundingBox;
    return {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
    };
  } catch {
    return null;
  }
}
