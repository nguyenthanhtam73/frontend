/** Prefix for every Cache Storage bucket the service worker opens. */
export const APP_CACHE_PREFIX = "dadiary-";

/** Posted to the controlling service worker so it drops its Cache Storage too. */
export const CLEAR_APP_CACHES_MESSAGE = "CLEAR_CACHES";

/** Cache names that hold app data (including authenticated API JSON and photos). */
export function appCacheNames(keys: readonly string[]): string[] {
  return keys.filter((key) => key.startsWith(APP_CACHE_PREFIX));
}

/**
 * Drop every `dadiary-` cache from this page and ask the service worker to do
 * the same. Call on logout so the next account cannot read cached API JSON.
 * Account-deletion flows can import this helper; it does not touch their files.
 */
export async function clearAppCaches(): Promise<void> {
  if (typeof window === "undefined") return;

  const tasks: Promise<unknown>[] = [];

  if ("caches" in window) {
    tasks.push(
      window.caches.keys().then((keys) =>
        Promise.all(appCacheNames(keys).map((key) => window.caches.delete(key))),
      ),
    );
  }

  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    const message = { type: CLEAR_APP_CACHES_MESSAGE };
    navigator.serviceWorker.controller?.postMessage(message);
    tasks.push(
      navigator.serviceWorker
        .getRegistration()
        .then((reg) => {
          const worker = reg?.active ?? reg?.waiting ?? reg?.installing;
          if (worker && worker !== navigator.serviceWorker.controller) {
            worker.postMessage(message);
          }
        })
        .catch(() => undefined),
    );
  }

  await Promise.all(tasks);
}
