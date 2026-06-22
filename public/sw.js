/**
 * DaDiary service worker.
 *
 * Strategies (kept intentionally small and dependency-free):
 *   • Cache-first      → hashed Next.js static assets, fonts, icons, images.
 *   • Network-first    → top-level HTML navigations: always fetch fresh HTML so
 *                         post-deploy chunk hashes stay in sync; cache is fallback
 *                         when offline (stale-while-revalidate broke mobile after deploys).
 *   • Network-first    → JSON API responses; falls back to cache when offline
 *                         so the diary timeline / routine still render.
 *
 * Bump CACHE_VERSION on any change so old clients pick up the new SW.
 */

const CACHE_VERSION = "v4";
const STATIC_CACHE = `dadiary-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `dadiary-runtime-${CACHE_VERSION}`;
const HTML_CACHE = `dadiary-html-${CACHE_VERSION}`;
const API_CACHE = `dadiary-api-${CACHE_VERSION}`;

// App-shell entries that we precache so the app boots offline.
const PRECACHE_URLS = [
  "/",
  "/onboarding",
  "/check-in",
  "/login",
  "/register",
  "/manifest.json",
  "/favicon.ico",
  "/favicon-16.png",
  "/favicon-32.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/apple-touch-icon.png",
];

const ALL_CACHES = [STATIC_CACHE, RUNTIME_CACHE, HTML_CACHE, API_CACHE];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // `addAll` is atomic — if any precache entry fails the whole install
      // fails. Use individual puts and swallow errors so a single 404 doesn't
      // bork the SW (e.g. if `/` returns 308 due to locale redirect).
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            const res = await fetch(url, { cache: "reload" });
            if (res.ok) await cache.put(url, res.clone());
          } catch {
            // best-effort precache; runtime caching will fill the gap
          }
        }),
      );
      // Do not call skipWaiting() here — unsolicited activation triggers
      // controllerchange and the page reloads mid-navigation (e.g. /onboarding).
      // The client posts SKIP_WAITING only when the user accepts an update.
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("dadiary-") && !ALL_CACHES.includes(k))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

// Allow the page to nudge a waiting SW to take over immediately.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Bail on anything we shouldn't be caching.
  if (req.method !== "GET") return;
  if (req.headers.has("range")) return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin && !isAllowedCrossOrigin(url)) return;
  if (url.protocol === "chrome-extension:") return;

  // Never cache Next.js dev/HMR endpoints — they must always go to the network.
  if (url.pathname.startsWith("/_next/webpack-hmr")) return;
  if (url.pathname.startsWith("/_next/static/development")) return;

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  if (isApiRequest(url)) {
    event.respondWith(networkFirst(req, API_CACHE));
    return;
  }

  if (isNavigation(req)) {
    // Network-first keeps HTML aligned with hashed /_next/static assets after each
    // Vercel deploy. Stale-while-revalidate served old HTML + missing JS on mobile.
    event.respondWith(networkFirstHtml(req, HTML_CACHE, 10000));
    return;
  }

  // Fallback: SWR for everything else (third-party fonts, public assets…).
  event.respondWith(staleWhileRevalidate(req, RUNTIME_CACHE));
});

// ---------- helpers ---------------------------------------------------------

function isAllowedCrossOrigin(url) {
  // Google Fonts CSS + font files — common for Next.js apps with `next/font`.
  return (
    url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com"
  );
}

function isStaticAsset(url) {
  if (url.pathname.startsWith("/_next/static/")) return true;
  if (url.pathname.startsWith("/icons/")) return true;
  return /\.(?:js|css|woff2?|ttf|otf|eot|png|jpg|jpeg|gif|webp|avif|svg|ico)$/i.test(
    url.pathname,
  );
}

function isApiRequest(url) {
  // Internal Next.js route handlers.
  if (url.pathname.startsWith("/api/")) return true;
  // Backend host configured via NEXT_PUBLIC_API_BASE_URL — match anything that
  // looks like an API path so the SW still helps when the backend is on a
  // different origin.
  if (/\/(?:v\d+|api)\//.test(url.pathname)) return true;
  return false;
}

function isNavigation(req) {
  if (req.mode === "navigate") return true;
  return req.headers.get("accept")?.includes("text/html") ?? false;
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    // Last-ditch: serve any matching cached response (ignore vary/search).
    const fallback = await cache.match(req, { ignoreSearch: true });
    if (fallback) return fallback;
    throw err;
  }
}

async function networkFirst(req, cacheName, timeoutMs = 4000) {
  const cache = await caches.open(cacheName);
  try {
    const res = await Promise.race([
      fetch(req),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("network-timeout")), timeoutMs),
      ),
    ]);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: "offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/** HTML navigations: network-first with cache / home-shell / plain-text offline fallbacks. */
async function networkFirstHtml(req, cacheName, timeoutMs = 10000) {
  const cache = await caches.open(cacheName);
  try {
    const res = await Promise.race([
      fetch(req),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("network-timeout")), timeoutMs),
      ),
    ]);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;

    const path = new URL(req.url).pathname.replace(/\/$/, "") || "/";
    if (path === "/") {
      const shell = (await cache.match("/")) ?? (await caches.match("/"));
      if (shell) return shell;
    }

    return new Response(
      "Bạn đang offline. Vui lòng kiểm tra kết nối.\nYou are offline. Please check your connection.",
      {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      },
    );
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const networkPromise = fetch(req)
    .then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);

  if (cached) {
    // Don't await — let the revalidation finish in the background.
    networkPromise.catch(() => {});
    return cached;
  }

  const fresh = await networkPromise;
  if (fresh) return fresh;

  // Only fall back to the home shell for the home URL itself — serving `/` HTML
  // for `/onboarding` (etc.) made "Bắt đầu" look like a reload back to landing.
  const path = new URL(req.url).pathname.replace(/\/$/, "") || "/";
  if (path === "/") {
    const shell = await cache.match("/") ?? (await caches.match("/"));
    if (shell) return shell;
  }

  // Bilingual fallback so the offline message reads correctly for both
  // primary locales (vi / en). The PWA shell + locale-aware UI usually load
  // before this fires, so this is a last-resort plain-text response.
  return new Response(
    "Bạn đang offline. Vui lòng kiểm tra kết nối.\nYou are offline. Please check your connection.",
    {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    },
  );
}
