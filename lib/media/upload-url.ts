export type UploadUrlParts = {
  pathname: string;
  search: string;
};

/** Path + query for a user upload, relative or absolute. Null for data/blob/other. */
export function uploadUrlParts(url: string): UploadUrlParts | null {
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return null;
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      if (!parsed.pathname.startsWith("/uploads/")) return null;
      return { pathname: parsed.pathname, search: parsed.search };
    } catch {
      return null;
    }
  }
  const queryAt = trimmed.indexOf("?");
  const hashAt = trimmed.indexOf("#");
  const cut =
    queryAt === -1 ? hashAt : hashAt === -1 ? queryAt : Math.min(queryAt, hashAt);
  const pathOnly = cut === -1 ? trimmed : trimmed.slice(0, cut);
  const search =
    queryAt === -1 ? "" : trimmed.slice(queryAt, hashAt > queryAt ? hashAt : undefined);
  const pathname = pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`;
  if (!pathname.startsWith("/uploads/")) return null;
  return { pathname, search };
}

/** True for `/uploads/...` on this site or the API host. */
export function isUserUploadUrl(url: string): boolean {
  return uploadUrlParts(url) != null;
}

/** Object identity without the short-lived `exp` / `sig` query. */
export function uploadObjectKey(url: string): string | null {
  return uploadUrlParts(url)?.pathname ?? null;
}

/** New backend signs every photo URL (`?exp=<unix>&sig=<hex>`). Old backend does not. */
export function isSignedUploadUrl(url: string): boolean {
  const parts = uploadUrlParts(url);
  if (!parts?.search) return false;
  const params = new URLSearchParams(parts.search);
  const exp = params.get("exp");
  const sig = params.get("sig");
  return Boolean(exp && sig);
}

/** `exp` is unix seconds. Unsigned URLs (old backend) are not treated as expired. */
export function isExpiredSignedUploadUrl(url: string, nowMs = Date.now()): boolean {
  const parts = uploadUrlParts(url);
  if (!parts?.search) return false;
  const exp = new URLSearchParams(parts.search).get("exp");
  if (!exp) return false;
  const sec = Number(exp);
  if (!Number.isFinite(sec)) return false;
  return nowMs >= sec * 1000;
}

/** Drop signed `/uploads` links before sessionStorage / localStorage. */
export function omitSignedUploadUrls(urls: readonly string[] | undefined): string[] {
  if (!urls?.length) return [];
  return urls.filter((url) => typeof url === "string" && url.trim() !== "" && !isSignedUploadUrl(url));
}

/**
 * Prefer freshly signed `GET /profile/skin` urls when the server sent them.
 * Otherwise keep stored urls that are not already expired.
 */
export function preferFreshProfilePhotoUrls(
  stored: readonly string[] | undefined,
  profileUrls: readonly string[] | undefined,
): string[] {
  const fresh = (profileUrls ?? [])
    .map((url) => url.trim())
    .filter((url) => url !== "");
  if (fresh.length > 0) return fresh;
  return (stored ?? [])
    .map((url) => url.trim())
    .filter((url) => url !== "" && !isExpiredSignedUploadUrl(url));
}
