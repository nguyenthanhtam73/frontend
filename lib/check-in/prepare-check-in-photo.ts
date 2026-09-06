import {
  CHECKIN_PHOTO_MAX_BYTES,
  validateCheckInPhoto,
  type PhotoValidationError,
} from "@/lib/check-in/photo-upload-validation";

/** Long-edge cap after HEIC→JPEG so converted iPhone shots stay under the upload cap. */
export const CHECKIN_HEIC_MAX_EDGE = 2048;
export const CHECKIN_HEIC_JPEG_QUALITY = 0.88;

export type PrepareCheckInPhotoError = PhotoValidationError | "heic_convert_failed";

export function isHeicLikeFile(file: File): boolean {
  const mime = file.type.toLowerCase();
  if (mime === "image/heic" || mime === "image/heif") return true;
  return /\.(heic|heif)$/i.test(file.name);
}

/**
 * Make a check-in photo safe to POST. Backend `extFromFile` + magic-byte sniff
 * only accept jpeg/png/webp/gif — HEIC from the iPhone picker must become JPEG
 * here. Never fall back to the original HEIC if conversion fails.
 */
export async function prepareCheckInPhoto(
  file: File,
): Promise<{ file: File } | { error: PrepareCheckInPhotoError }> {
  const validation = validateCheckInPhoto(file);
  if (validation) return { error: validation };
  if (!isHeicLikeFile(file)) return { file };

  try {
    const jpeg = await convertImageFileToJpeg(file);
    if (jpeg.size <= 0) return { error: "empty" };
    if (jpeg.size > CHECKIN_PHOTO_MAX_BYTES) return { error: "too_large" };
    return { file: jpeg };
  } catch {
    return { error: "heic_convert_failed" };
  }
}

function scaledDimensions(width: number, height: number, maxEdge: number) {
  const long = Math.max(width, height);
  if (long <= maxEdge) return { width, height };
  const scale = maxEdge / long;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function decodeToDrawSource(file: File): Promise<{
  source: CanvasImageSource;
  width: number;
  height: number;
  close?: () => void;
}> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    } catch {
      /* Chrome / older WebKit: try <img> (Safari can often decode HEIC this way). */
    }
  }
  const img = await loadImageElement(file);
  return { source: img, width: img.naturalWidth, height: img.naturalHeight };
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (typeof Image === "undefined") {
      reject(new Error("no Image decoder"));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.naturalWidth < 1 || img.naturalHeight < 1) {
        reject(new Error("empty image"));
        return;
      }
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("could not decode image"));
    };
    img.src = url;
  });
}

function canvasToJpegBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("canvas toBlob failed"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      quality,
    );
  });
}

async function convertImageFileToJpeg(file: File): Promise<File> {
  if (typeof document === "undefined") {
    throw new Error("no document");
  }
  const decoded = await decodeToDrawSource(file);
  try {
    const { width, height } = scaledDimensions(
      decoded.width,
      decoded.height,
      CHECKIN_HEIC_MAX_EDGE,
    );
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas context");
    ctx.drawImage(decoded.source, 0, 0, width, height);
    const blob = await canvasToJpegBlob(canvas, CHECKIN_HEIC_JPEG_QUALITY);
    const base = file.name.replace(/\.[^.]+$/u, "") || "check-in";
    return new File([blob], `${base}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } finally {
    decoded.close?.();
  }
}
