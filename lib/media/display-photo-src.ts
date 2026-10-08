import { sameOriginUploadUrl } from "@/lib/api/admin-skin-review";

import { isUserUploadUrl } from "@/lib/media/upload-url";

/**
 * `<img src>` for a user photo. Upload paths stay same-origin (Next rewrite)
 * and keep `?exp&sig`. data:/blob: and unrelated URLs pass through.
 */
export function displayPhotoSrc(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (!isUserUploadUrl(trimmed)) return trimmed;
  return sameOriginUploadUrl(trimmed);
}
