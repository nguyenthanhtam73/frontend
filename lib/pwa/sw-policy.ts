/**
 * Routing policy mirrored in `public/sw.js` (classic script, cannot import this).
 * Face photos must never enter STATIC_CACHE / RUNTIME_CACHE.
 */

const STATIC_EXT =
  /\.(?:js|css|woff2?|ttf|otf|eot|png|jpg|jpeg|gif|webp|avif|svg|ico)$/i;

/** Bypass the service worker entirely for user uploads (any host). */
export function shouldBypassServiceWorker(url: URL): boolean {
  return url.pathname.startsWith("/uploads/");
}

/** Cache-first static assets. Uploads are excluded even when the path ends in .jpg. */
export function isCacheableStaticAsset(url: URL): boolean {
  if (shouldBypassServiceWorker(url)) return false;
  if (url.pathname.startsWith("/_next/static/")) return true;
  if (url.pathname.startsWith("/icons/")) return true;
  return STATIC_EXT.test(url.pathname);
}
