/** Photo count for an admin activity row. `photo_urls` may be missing or `[]`. */
export function adminActivityPhotoCount(row: {
  photo_count?: number | null;
  photo_urls?: readonly string[] | null;
}): number {
  if (typeof row.photo_count === "number" && Number.isFinite(row.photo_count)) {
    return Math.max(0, Math.floor(row.photo_count));
  }
  return Array.isArray(row.photo_urls) ? row.photo_urls.length : 0;
}
