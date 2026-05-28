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
 * Pick which regions to blur given the (optional) detected face box.
 *
 * When FaceDetector is unavailable (Safari/Firefox), we estimate a centred
 * portrait face box and apply the same eye + mouth bands so coverage matches
 * the native path instead of a single thin eye strip.
 */
function computeBlurRegions(
  imgW: number,
  imgH: number,
  face: { x: number; y: number; width: number; height: number } | null,
): BlurRegion[] {
  const bounds = face ?? estimateCenterFaceBounds(imgW, imgH);
  const minSide = Math.min(bounds.width, bounds.height);

  const eye: BlurRegion = {
    x: bounds.x + bounds.width * 0.02,
    y: bounds.y + bounds.height * 0.14,
    width: bounds.width * 0.96,
    height: bounds.height * 0.34,
    blurPx: Math.max(22, minSide * 0.22),
  };
  const mouth: BlurRegion = {
    x: bounds.x + bounds.width * 0.1,
    y: bounds.y + bounds.height * 0.56,
    width: bounds.width * 0.8,
    height: bounds.height * 0.28,
    blurPx: Math.max(18, minSide * 0.18),
  };

  return [clampRegion(eye, imgW, imgH), clampRegion(mouth, imgW, imgH)];
}

/** Typical centred selfie — used when Shape Detection API is unavailable. */
function estimateCenterFaceBounds(imgW: number, imgH: number) {
  const faceW = imgW * 0.68;
  const faceH = imgH * 0.52;
  return {
    x: (imgW - faceW) / 2,
    y: imgH * 0.1,
    width: faceW,
    height: faceH,
  };
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
  ctx.drawImage(canvas, sx, sy, sw, sh, sx, sy, sw, sh);
  // Second pass makes features unrecognisable without hiding cheek/forehead skin.
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
