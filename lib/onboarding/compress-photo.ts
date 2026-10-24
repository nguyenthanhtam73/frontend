/** Max long edge for onboarding face photos — enough detail for skin cues, much smaller than camera originals. */
export const ONBOARDING_PHOTO_MAX_EDGE = 1280;

/** JPEG quality — high enough for pore/redness cues, smaller payload for upload + vision API. */
export const ONBOARDING_PHOTO_JPEG_QUALITY = 0.88;

/** Onboarding skips a second encode for JPEGs already under this size and within the long-edge cap. */
export const ONBOARDING_PHOTO_SKIP_UNDER_BYTES = 500_000;

export type CompressPhotoOptions = {
  /** Long-edge cap. Smaller images are never upscaled. */
  maxEdge?: number;
  /** JPEG quality passed to canvas.toBlob. Callers must not go below the product floor. */
  quality?: number;
  /** Skip re-encode at or under this size when the long edge is already within maxEdge. */
  skipUnderBytes?: number;
  /** When true (onboarding default), only image/jpeg may skip. Check-in skips any small in-cap image. */
  skipOnlyJpeg?: boolean;
  /** When false, always re-encode (HEIC must become JPEG even if the source is small). */
  allowSkip?: boolean;
  /**
   * Decode with createImageBitmap({ imageOrientation: "from-image" }) so EXIF
   * rotation is applied. Falls back to HTMLImageElement, which also honors EXIF.
   * Onboarding leaves this off and keeps the existing Image() path.
   */
  orientFromExif?: boolean;
  /** When false, skip the FileReader data-URL preview (check-in uses object URLs). */
  includePreview?: boolean;
  /** When true, keep the original file if the JPEG is strictly larger. */
  fallbackIfNotSmaller?: boolean;
  /** When true, encode/decode failures reject instead of returning the original file. */
  throwOnFailure?: boolean;
  /** Used when the source name has no extension. Onboarding stays "onboarding". */
  fallbackBaseName?: string;
};

type ResolvedCompressOptions = {
  maxEdge: number;
  quality: number;
  skipUnderBytes: number;
  skipOnlyJpeg: boolean;
  allowSkip: boolean;
  orientFromExif: boolean;
  fallbackBaseName: string;
};

/** Some mobile cameras return `type: ""` even for valid JPEGs. */
export function isLikelyImageFile(file: File): boolean {
  if (file.size <= 0) return false;
  if (file.type.startsWith("image/")) return true;
  if (!file.type) return true;
  return /\.(jpe?g|png|gif|webp|heic|heif|bmp)$/iu.test(file.name);
}

/**
 * Skip a canvas re-encode only when we know the long edge and the file is already small.
 * `longEdge: null` means the dimensions could not be read — do not skip.
 */
export function shouldSkipReencodeForFile(input: {
  mime: string;
  byteSize: number;
  longEdge: number | null;
  maxEdge: number;
  skipUnderBytes: number;
  skipOnlyJpeg: boolean;
  allowSkip: boolean;
}): boolean {
  if (!input.allowSkip) return false;
  if (input.skipOnlyJpeg && input.mime !== "image/jpeg") return false;
  if (input.longEdge == null || input.longEdge < 1) return false;
  if (input.byteSize <= 0) return false;
  return input.byteSize <= input.skipUnderBytes && input.longEdge <= input.maxEdge;
}

/** Scale down so the long edge is at most `maxEdge`. Never upscales. */
export function scaledPhotoDimensions(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const long = Math.max(width, height);
  if (long <= maxEdge) {
    return { width, height };
  }
  const scale = maxEdge / long;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Keep `original` when the encoded file is strictly larger.
 * Equal size is not larger, so the encoded file is kept.
 */
export function fileAfterCompressionFallback(
  original: File,
  compressed: File,
  fallbackIfNotSmaller: boolean,
): File {
  if (fallbackIfNotSmaller && compressed.size > original.size) return original;
  return compressed;
}

function resolveCompressOptions(options?: CompressPhotoOptions): ResolvedCompressOptions {
  return {
    maxEdge: options?.maxEdge ?? ONBOARDING_PHOTO_MAX_EDGE,
    quality: options?.quality ?? ONBOARDING_PHOTO_JPEG_QUALITY,
    skipUnderBytes: options?.skipUnderBytes ?? ONBOARDING_PHOTO_SKIP_UNDER_BYTES,
    skipOnlyJpeg: options?.skipOnlyJpeg ?? true,
    allowSkip: options?.allowSkip ?? true,
    orientFromExif: options?.orientFromExif ?? false,
    fallbackBaseName: options?.fallbackBaseName ?? "onboarding",
  };
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("could not decode image"));
    };
    img.src = url;
  });
}

type DecodedImage = {
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  close?: () => void;
};

/** EXIF-aware decode. Returns null so the caller can fall back to HTMLImageElement. */
async function decodeWithExifOrientation(file: File): Promise<DecodedImage | null> {
  if (typeof createImageBitmap !== "function") return null;
  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
    if (bitmap.width < 1 || bitmap.height < 1) {
      bitmap.close();
      return null;
    }
    return {
      width: bitmap.width,
      height: bitmap.height,
      draw: (ctx, width, height) => {
        ctx.drawImage(bitmap, 0, 0, width, height);
      },
      close: () => bitmap.close(),
    };
  } catch {
    return null;
  }
}

async function decodeImage(file: File, orientFromExif: boolean): Promise<DecodedImage> {
  if (orientFromExif) {
    const oriented = await decodeWithExifOrientation(file);
    if (oriented) return oriented;
  }
  const img = await loadImageFromFile(file);
  if (img.naturalWidth < 1 || img.naturalHeight < 1) {
    throw new Error("empty image");
  }
  return {
    width: img.naturalWidth,
    height: img.naturalHeight,
    draw: (ctx, width, height) => {
      ctx.drawImage(img, 0, 0, width, height);
    },
  };
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality);
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string" && result.startsWith("data:")) {
        resolve(result);
        return;
      }
      reject(new Error("invalid data url"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

/**
 * Resize/compress one image to JPEG. Throws when decoding or encoding fails.
 * Returns the same `file` reference when the skip rule matches.
 */
export async function compressPhotoFile(
  file: File,
  options?: CompressPhotoOptions,
): Promise<File> {
  if (typeof document === "undefined") {
    throw new Error("no document");
  }
  const resolved = resolveCompressOptions(options);
  const decoded = await decodeImage(file, resolved.orientFromExif);
  try {
    const longEdge = Math.max(decoded.width, decoded.height);
    if (
      shouldSkipReencodeForFile({
        mime: file.type,
        byteSize: file.size,
        longEdge,
        maxEdge: resolved.maxEdge,
        skipUnderBytes: resolved.skipUnderBytes,
        skipOnlyJpeg: resolved.skipOnlyJpeg,
        allowSkip: resolved.allowSkip,
      })
    ) {
      return file;
    }

    const { width, height } = scaledPhotoDimensions(
      decoded.width,
      decoded.height,
      resolved.maxEdge,
    );
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas context");
    decoded.draw(ctx, width, height);

    const blob = await canvasToJpegBlob(canvas, resolved.quality);
    if (!blob || blob.size <= 0) throw new Error("empty jpeg");

    const base = file.name.replace(/\.[^.]+$/u, "") || resolved.fallbackBaseName;
    return new File([blob], `${base}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } finally {
    decoded.close?.();
  }
}

/** Resize/compress a face photo before onboarding upload. Falls back to the original file on failure. */
export async function compressOnboardingPhoto(
  file: File,
  options?: CompressPhotoOptions,
): Promise<{ file: File; preview: string }> {
  if (!isLikelyImageFile(file)) {
    throw new Error("not an image");
  }

  const includePreview = options?.includePreview !== false;

  try {
    const encoded = await compressPhotoFile(file, options);
    const chosen = fileAfterCompressionFallback(
      file,
      encoded,
      options?.fallbackIfNotSmaller === true,
    );
    if (!includePreview) return { file: chosen, preview: "" };
    return { file: chosen, preview: await fileToDataUrl(chosen) };
  } catch (error) {
    if (options?.throwOnFailure) throw error;
    if (!includePreview) return { file, preview: "" };
    return { file, preview: await fileToDataUrl(file) };
  }
}

/** Add up to `remaining` compressed photos to onboarding state. */
export async function appendOnboardingPhotos(
  files: File[],
  remaining: number,
  addPhoto: (item: { file: File; preview: string }) => void,
): Promise<void> {
  const picked = files.filter(isLikelyImageFile).slice(0, remaining);
  for (const file of picked) {
    try {
      const item = await compressOnboardingPhoto(file);
      addPhoto(item);
    } catch {
      /* skip unreadable picks */
    }
  }
}
