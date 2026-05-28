/**
 * Client-side face anonymization for **display** previews.
 *
 * Original photos are uploaded to the backend for accurate AI skin analysis.
 * This module produces blurred previews shown in the UI (eyes + mouth hidden).
 */

import { detectFaceOnCanvas } from "@/lib/privacy/face-detect";

const MAX_DIM = 1280;
const OUTPUT_TYPE = "image/jpeg";
const OUTPUT_QUALITY = 0.92;

const displayUrlCache = new Map<string, string>();

export type BlurMethod = "native-face-detector" | "heuristic" | "skipped";

export type BlurredImage = {
  /** Blurred blob as a File (for tests / optional download). */
  file: File;
  /** Object URL for UI preview — revoke when removing from a list. */
  previewUrl: string;
  method: BlurMethod;
  width: number;
  height: number;
};

/** Build a blurred display preview from a local `File` (original kept for upload). */
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

    const faceBox = await detectFaceOnCanvas(canvas);
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

/** Blur a remote image URL for timeline/history display (cached per session). */
export async function blurFaceFromImageUrl(url: string): Promise<string> {
  const cached = displayUrlCache.get(url);
  if (cached) return cached;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not fetch image: ${res.status}`);
  const blob = await res.blob();
  const file = new File([blob], "remote.jpg", {
    type: blob.type.startsWith("image/") ? blob.type : "image/jpeg",
  });
  const blurred = await blurFaceInImage(file);
  displayUrlCache.set(url, blurred.previewUrl);
  return blurred.previewUrl;
}

type DecodedImage = {
  source: ImageBitmap | HTMLImageElement;
  width: number;
  height: number;
  dispose: () => void;
};

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
        // fall through
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
  blurPx: number;
};

type FaceBounds = { x: number; y: number; width: number; height: number };

/**
 * Blur a single horizontal band across the eyes — enough to anonymise while
 * keeping forehead, nose, mouth, cheeks and jaw sharp for skin analysis.
 *
 * BlazeFace boxes are tight: eyes sit ~28–52% from the top. We cover that band
 * a bit wider than the strict feature so small detection offsets still hide
 * the eyes.
 */
function regionsFromFaceBounds(bounds: FaceBounds, imgW: number, imgH: number): BlurRegion[] {
  const minSide = Math.min(bounds.width, bounds.height);

  const eyeBand: BlurRegion = {
    x: bounds.x - bounds.width * 0.06,
    y: bounds.y + bounds.height * 0.26,
    width: bounds.width * 1.12,
    height: bounds.height * 0.26,
    blurPx: Math.max(22, minSide * 0.22),
  };

  return [clampRegion(eyeBand, imgW, imgH)];
}

function computeBlurRegions(
  imgW: number,
  imgH: number,
  face: FaceBounds | null,
): BlurRegion[] {
  if (face) {
    return regionsFromFaceBounds(face, imgW, imgH);
  }

  // Last resort: estimate a centred portrait box, still using tight patches.
  const faceW = imgW * 0.58;
  const faceH = imgH * 0.48;
  const estimated: FaceBounds = {
    x: (imgW - faceW) / 2,
    y: imgH * 0.12,
    width: faceW,
    height: faceH,
  };
  return regionsFromFaceBounds(estimated, imgW, imgH);
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

function blurRegion(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  region: BlurRegion,
) {
  if (region.width <= 0 || region.height <= 0) return;
  const padding = Math.ceil(region.blurPx * 1.2);
  const sx = Math.max(0, Math.floor(region.x - padding));
  const sy = Math.max(0, Math.floor(region.y - padding));
  const sw = Math.min(canvas.width - sx, Math.ceil(region.width + padding * 2));
  const sh = Math.min(canvas.height - sy, Math.ceil(region.height + padding * 2));
  if (sw <= 0 || sh <= 0) return;

  ctx.save();

  const cx = region.x + region.width / 2;
  const cy = region.y + region.height / 2;
  const rx = region.width / 2 + padding * 0.2;
  const ry = region.height / 2 + padding * 0.2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.clip();

  ctx.filter = `blur(${region.blurPx}px)`;
  ctx.drawImage(canvas, sx, sy, sw, sh, sx, sy, sw, sh);
  ctx.drawImage(canvas, sx, sy, sw, sh, sx, sy, sw, sh);
  ctx.drawImage(canvas, sx, sy, sw, sh, sx, sy, sw, sh);
  ctx.filter = "none";
  ctx.restore();
}
