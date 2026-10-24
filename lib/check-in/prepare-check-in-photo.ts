import {
  CHECKIN_PHOTO_MAX_BYTES,
  validateCheckInPhoto,
  type PhotoValidationError,
} from "@/lib/check-in/photo-upload-validation";
import {
  compressOnboardingPhoto,
  type CompressPhotoOptions,
} from "@/lib/onboarding/compress-photo";

/**
 * Check-in long-edge cap. Matches the Android app (1600px, JPEG 0.85) so AI
 * skin analysis sees the same pixels on web and app. Never upscale below this.
 */
export const CHECKIN_PHOTO_MAX_EDGE = 1600;

/** JPEG quality for check-in. Do not go lower — this is the Android match. */
export const CHECKIN_PHOTO_JPEG_QUALITY = 0.85;

/**
 * Skip a re-encode when the file is already small and its long edge is within
 * the cap. ~700KB. Larger files, or any file whose long edge exceeds the cap,
 * are resized.
 */
export const CHECKIN_PHOTO_SKIP_UNDER_BYTES = 700_000;

/** HEIC→JPEG uses the same check-in cap and quality (one encode, not a second pass). */
export const CHECKIN_HEIC_MAX_EDGE = CHECKIN_PHOTO_MAX_EDGE;
export const CHECKIN_HEIC_JPEG_QUALITY = CHECKIN_PHOTO_JPEG_QUALITY;

export type PrepareCheckInPhotoError = PhotoValidationError | "heic_convert_failed";

export function isHeicLikeFile(file: File): boolean {
  const mime = file.type.toLowerCase();
  if (mime === "image/heic" || mime === "image/heif") return true;
  return /\.(heic|heif)$/i.test(file.name);
}

export function checkInCompressOptions(heic: boolean): CompressPhotoOptions {
  return {
    maxEdge: CHECKIN_PHOTO_MAX_EDGE,
    quality: CHECKIN_PHOTO_JPEG_QUALITY,
    skipUnderBytes: CHECKIN_PHOTO_SKIP_UNDER_BYTES,
    skipOnlyJpeg: false,
    allowSkip: !heic,
    orientFromExif: true,
    includePreview: false,
    fallbackIfNotSmaller: !heic,
    throwOnFailure: heic,
    fallbackBaseName: "check-in",
  };
}

/**
 * Decide which bytes to upload after compression.
 * Non-HEIC: a thrown encoder (`prepared === null`), an empty blob, or a
 * strictly larger file falls back to the original. HEIC never falls back to
 * the original — the backend rejects HEIC — and a failed convert stays an error.
 */
export function resolveCheckInPreparedFile(input: {
  original: File;
  prepared: File | null;
  heic: boolean;
}): { file: File } | { error: "heic_convert_failed" | "empty" | "too_large" } {
  const { original, prepared, heic } = input;
  if (heic) {
    if (!prepared || isHeicLikeFile(prepared)) return { error: "heic_convert_failed" };
    if (prepared.size <= 0) return { error: "empty" };
    if (prepared.size > CHECKIN_PHOTO_MAX_BYTES) return { error: "too_large" };
    return { file: prepared };
  }
  if (!prepared || prepared.size <= 0 || prepared.size > original.size) {
    return { file: original };
  }
  return { file: prepared };
}

/**
 * Make a check-in photo safe to POST. Backend `extFromFile` + magic-byte sniff
 * only accept jpeg/png/webp/gif — HEIC from the iPhone picker must become JPEG
 * here. Never fall back to the original HEIC if conversion fails.
 *
 * Other photos are resized to the check-in cap (1600px, JPEG 0.85) before
 * upload. Encoder failures and a larger result keep the original file.
 */
export async function prepareCheckInPhoto(
  file: File,
): Promise<{ file: File } | { error: PrepareCheckInPhotoError }> {
  const validation = validateCheckInPhoto(file);
  if (validation) return { error: validation };

  const heic = isHeicLikeFile(file);
  try {
    const { file: prepared } = await compressOnboardingPhoto(
      file,
      checkInCompressOptions(heic),
    );
    return resolveCheckInPreparedFile({ original: file, prepared, heic });
  } catch {
    return resolveCheckInPreparedFile({ original: file, prepared: null, heic });
  }
}
