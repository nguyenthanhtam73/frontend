import { scaledPhotoDimensions } from "@/lib/onboarding/compress-photo";

import {
  PHOTO_BLUR_ANALYSIS_MAX_EDGE,
  PHOTO_BLUR_MAX_SAMPLE_PIXELS,
  PHOTO_BLUR_MIN_EDGE,
  scorePhotoSharpness,
} from "./photo-sharpness";

/**
 * Files at least this big are decoded straight to the analysis size.
 * A 12MP camera JPEG is well above it; skipping the full-resolution decode
 * is what keeps the check cheap on low-end Android.
 */
export const PHOTO_BLUR_RESIZE_MIN_BYTES = 80_000;

/**
 * Give up rather than leave the user waiting. The photo is already on screen;
 * a late or failed sample just skips the warning.
 */
export const PHOTO_BLUR_MEASURE_TIMEOUT_MS = 1_200;

export type PhotoBlurMeasurement = {
  /** Contrast-normalized Laplacian variance. Higher = sharper. */
  score: number;
  blurry: boolean;
};

type Sample = {
  data: Uint8ClampedArray;
  width: number;
  height: number;
};

export function blurDecodeOptions(byteSize: number): ImageBitmapOptions {
  const options: ImageBitmapOptions = {
    imageOrientation: "from-image",
    resizeQuality: "low",
  };
  if (byteSize >= PHOTO_BLUR_RESIZE_MIN_BYTES) {
    options.resizeWidth = PHOTO_BLUR_ANALYSIS_MAX_EDGE;
  }
  return options;
}

function drawToSample(
  sourceWidth: number,
  sourceHeight: number,
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void,
): Sample | null {
  if (typeof document === "undefined") return null;
  const { width, height } = scaledPhotoDimensions(
    sourceWidth,
    sourceHeight,
    PHOTO_BLUR_ANALYSIS_MAX_EDGE,
  );
  if (width < PHOTO_BLUR_MIN_EDGE || height < PHOTO_BLUR_MIN_EDGE) return null;
  if (width * height > PHOTO_BLUR_MAX_SAMPLE_PIXELS) return null;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  draw(ctx, width, height);
  const image = ctx.getImageData(0, 0, width, height);
  if (image.data.length < width * height * 4) return null;
  return { data: image.data, width, height };
}

async function sampleFromBitmap(file: Blob): Promise<Sample | null> {
  if (typeof createImageBitmap !== "function") return null;
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file, blurDecodeOptions(file.size));
    if (bitmap.width < 1 || bitmap.height < 1) return null;
    const source = bitmap;
    return drawToSample(source.width, source.height, (ctx, width, height) => {
      ctx.drawImage(source, 0, 0, width, height);
    });
  } catch {
    return null;
  } finally {
    bitmap?.close();
  }
}

async function sampleFromImageElement(file: Blob): Promise<Sample | null> {
  if (typeof document === "undefined") return null;
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") return null;

  let url: string | null = null;
  try {
    url = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement | null>((resolve) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => resolve(null);
      el.src = url!;
    });
    if (!img || img.naturalWidth < 1 || img.naturalHeight < 1) return null;
    return drawToSample(img.naturalWidth, img.naturalHeight, (ctx, width, height) => {
      ctx.drawImage(img, 0, 0, width, height);
    });
  } catch {
    return null;
  } finally {
    if (url) URL.revokeObjectURL(url);
  }
}

async function readBlurSample(file: Blob): Promise<Sample | null> {
  if (typeof document === "undefined") return null;
  const fromBitmap = await sampleFromBitmap(file);
  if (fromBitmap) return fromBitmap;
  return sampleFromImageElement(file);
}

function measurementFromSample(sample: Sample): PhotoBlurMeasurement | null {
  const scored = scorePhotoSharpness(sample.data, sample.width, sample.height);
  if (!scored) return null;
  return { score: scored.score, blurry: scored.blurry };
}

/**
 * Score one photo. Returns null on any failure, timeout, or unreadable frame
 * so the check-in flow can continue as if the check was not there.
 * Never throws.
 */
export async function measurePhotoBlur(
  file: Blob,
  timeoutMs = PHOTO_BLUR_MEASURE_TIMEOUT_MS,
): Promise<PhotoBlurMeasurement | null> {
  if (!file || file.size <= 0) return null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const sample = await Promise.race([
      readBlurSample(file),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
    if (!sample) return null;
    return measurementFromSample(sample);
  } catch {
    return null;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
