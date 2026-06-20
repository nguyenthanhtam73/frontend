/** Matches backend default upload cap (see config Upload.MaxMB). */
export const CHECKIN_PHOTO_MAX_MB = 10;
export const CHECKIN_PHOTO_MAX_BYTES = CHECKIN_PHOTO_MAX_MB * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

const ALLOWED_EXT = /\.(jpe?g|png|webp|gif|heic|heif)$/i;

export type PhotoValidationError = "empty" | "invalid_type" | "too_large";

export function validateCheckInPhoto(file: File): PhotoValidationError | null {
  if (file.size <= 0) return "empty";

  const mime = file.type.toLowerCase();
  const extOk = ALLOWED_EXT.test(file.name);
  const mimeOk =
    mime.startsWith("image/") &&
    (ALLOWED_MIME.has(mime) || mime === "" || extOk);

  if (!mimeOk && !extOk) return "invalid_type";
  if (file.size > CHECKIN_PHOTO_MAX_BYTES) return "too_large";
  return null;
}
