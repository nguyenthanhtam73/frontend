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
 *
 * Push: `push` + `notificationclick` handle rich payloads from the Go
 * PushSender. Foreground tabs get DADIARY_PUSH_FOREGROUND (in-app toast);
 * background/killed get a system notification.
 *
 * Web Push limits: no custom sound files; badge is a small OS glyph; delivery
 * is best-effort (expired endpoints are cleaned up server-side).
 */

const CACHE_VERSION = "v16";
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
      // controllerchange and can reload mid-navigation (e.g. /onboarding).
      // The client posts SKIP_WAITING only after the user taps Apply update
      // (and sets pendingReload so page + SW stay in lockstep).
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

// Activate only when the page asks (Apply update). Pair with a reload on
// controllerchange — never silent-activate in the page without that reload.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ---------------------------------------------------------------------------
// Web Push — display + click routing
// Payload shape mirrors backend internal/service/push.NotificationPayload.
// ---------------------------------------------------------------------------

self.addEventListener("push", (event) => {
  event.waitUntil(handlePushEvent(event));
});

/**
 * Parse push JSON, then toast visible clients OR show a system notification.
 *
 * postMessage alone is not enough: if ToastBridge is unmounted the page
 * silently drops the toast. We require an ACK (MessageChannel) that the page
 * only sends after pushToast actually handed off. No ACK → OS banner.
 */
async function handlePushEvent(event) {
  const parsed = parsePushPayload(event);

  const windowClients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  const visibleClients = windowClients.filter(
    (c) => c.visibilityState === "visible" && c.url.startsWith(self.location.origin),
  );

  // App in foreground: prefer in-app toast (OS tray is often suppressed when
  // focused). Post to one client (focused first); require ACK before skipping OS.
  if (visibleClients.length > 0) {
    const ordered = [
      ...visibleClients.filter((c) => c.focused),
      ...visibleClients.filter((c) => !c.focused),
    ];
    const messageId = `${parsed.tag || "push"}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const message = {
      type: "DADIARY_PUSH_FOREGROUND",
      messageId,
      title: parsed.title,
      body: parsed.body,
      url: (parsed.data && parsed.data.url) || "/check-in",
      tag: parsed.tag || "",
      pushType: (parsed.data && parsed.data.type) || "",
      data: parsed.data,
    };

    for (const client of ordered) {
      // 4s: slow main-thread phones often exceed 1.5s before ToastBridge ACKs;
      // a short timeout caused duplicate toast + OS notification.
      const acked = await postForegroundWithAck(client, message, 4000);
      if (acked) {
        return;
      }
    }
    console.warn("[sw] foreground toast not acked; showing system notification");
  }

  // Background / killed / no toast bridge: OS notification.
  await self.registration.showNotification(parsed.title, buildNotificationOptions(parsed));
}

/**
 * postMessage + MessageChannel ACK. Resolves true only if the page confirms
 * the toast was shown (or intentionally handled). Timeout / throw → false.
 */
function postForegroundWithAck(client, message, timeoutMs) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };

    try {
      const channel = new MessageChannel();
      const timer = setTimeout(() => finish(false), timeoutMs);
      channel.port1.onmessage = (event) => {
        clearTimeout(timer);
        finish(
          !!(
            event &&
            event.data &&
            event.data.type === "DADIARY_PUSH_FOREGROUND_ACK"
          ),
        );
      };
      channel.port1.onmessageerror = () => {
        clearTimeout(timer);
        finish(false);
      };
      client.postMessage(message, [channel.port2]);
    } catch (err) {
      console.warn("[sw] foreground postMessage failed", err);
      finish(false);
    }
  });
}

function parsePushPayload(event) {
  const out = {
    title: "DaDiary",
    body: "You have a new update.",
    icon: "/icons/icon-192.png",
    // Small status-bar glyph — keep a crisp square asset (override via payload.badge).
    badge: "/icons/icon-192.png",
    image: "/icons/icon-512.png",
    tag: undefined,
    renotify: false,
    timestamp: Date.now(),
    silent: false,
    requireInteraction: false,
    vibrate: [100, 50, 100],
    data: { url: "/check-in", action: "open", type: "generic" },
    actions: [],
  };

  try {
    if (!event.data) return out;
    const payload = event.data.json();
    if (!payload || typeof payload !== "object") return out;

    if (typeof payload.title === "string" && payload.title.trim()) {
      out.title = payload.title.trim();
    }
    if (typeof payload.body === "string" && payload.body.trim()) {
      out.body = payload.body.trim();
    }
    if (typeof payload.icon === "string" && payload.icon.trim()) {
      out.icon = payload.icon.trim();
    }
    if (typeof payload.badge === "string" && payload.badge.trim()) {
      out.badge = payload.badge.trim();
    }
    if (typeof payload.image === "string" && payload.image.trim()) {
      out.image = payload.image.trim();
    }
    if (typeof payload.tag === "string" && payload.tag.trim()) {
      out.tag = payload.tag.trim();
    }
    if (typeof payload.renotify === "boolean") out.renotify = payload.renotify;
    if (typeof payload.timestamp === "number" && payload.timestamp > 0) {
      out.timestamp = payload.timestamp;
    }
    // Custom sound files are NOT supported by Web Push — `silent` only.
    if (typeof payload.silent === "boolean") out.silent = payload.silent;
    if (typeof payload.requireInteraction === "boolean") {
      out.requireInteraction = payload.requireInteraction;
    }
    if (!out.silent && Array.isArray(payload.vibrate) && payload.vibrate.length > 0) {
      const cleaned = payload.vibrate.filter((n) => typeof n === "number" && n > 0);
      if (cleaned.length > 0) out.vibrate = cleaned;
    }
    if (out.silent) out.vibrate = [];
    if (payload.data && typeof payload.data === "object") {
      out.data = { url: "/check-in", action: "open", ...payload.data };
    }
    if (Array.isArray(payload.actions)) {
      out.actions = payload.actions
        .filter(
          (a) =>
            a &&
            typeof a.action === "string" &&
            a.action.trim() &&
            typeof a.title === "string" &&
            a.title.trim(),
        )
        .map((a) => ({ action: a.action.trim(), title: a.title.trim() }))
        .slice(0, 2);
    }
  } catch {
    try {
      const text = event.data && event.data.text();
      if (text) out.body = text;
    } catch {
      // keep defaults
    }
  }

  return out;
}

function buildNotificationOptions(parsed) {
  const options = {
    body: parsed.body,
    icon: parsed.icon,
    badge: parsed.badge,
    image: parsed.image,
    data: parsed.data,
    renotify: parsed.renotify,
    timestamp: parsed.timestamp,
    silent: parsed.silent,
    requireInteraction: !!parsed.requireInteraction,
  };
  if (!parsed.silent && parsed.vibrate && parsed.vibrate.length > 0) {
    options.vibrate = parsed.vibrate;
  }
  if (parsed.tag) options.tag = parsed.tag;
  if (parsed.actions && parsed.actions.length > 0) options.actions = parsed.actions;
  return options;
}

/**
 * Click handling:
 *  - body click (event.action === "") → data.action / data.url
 *  - action "check-in" → data.url (if check-in path) or /check-in
 *  - action "later" | "dismiss" → close only
 *
 * App open / background → focus best tab + navigate
 * App killed → clients.openWindow(target)
 * Other tab → focus that origin tab, then route
 */
self.addEventListener("notificationclick", (event) => {
  const clickAction = event.action || "";
  const payload = event.notification.data || {};
  event.notification.close();

  if (clickAction === "later" || clickAction === "dismiss") {
    return;
  }

  const targetPath = resolveNotificationPath(clickAction, payload);
  event.waitUntil(openAppWindow(targetPath));
});

/** Normalize a deep-link to a same-origin path starting with "/". */
function normalizeAppPath(raw) {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const abs = new URL(trimmed);
      if (abs.origin !== self.location.origin) return "";
      return abs.pathname + abs.search + abs.hash || "/";
    }
  } catch {
    return "";
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

/**
 * Resolve where to go after a notification interaction.
 * Honour flexible data.url; check-in actions prefer a check-in path.
 */
function resolveNotificationPath(clickAction, data) {
  const dataAction = typeof data.action === "string" ? data.action : "";
  const dataUrl = normalizeAppPath(data.url) || "/check-in";
  const wantsCheckIn =
    clickAction === "check-in" || (!clickAction && dataAction === "check-in");

  if (wantsCheckIn) {
    // Allow callers to deep-link to /en/check-in etc. via data.url.
    if (dataUrl.includes("check-in")) return dataUrl;
    return "/check-in";
  }

  // Body click or other actions → flexible data.url.
  return dataUrl;
}

function clientPathname(clientUrl) {
  try {
    return new URL(clientUrl).pathname.replace(/\/+$/, "") || "/";
  } catch {
    return "";
  }
}

function pathsMatch(clientUrl, targetPath) {
  const a = clientPathname(clientUrl);
  const b = (normalizeAppPath(targetPath) || "/").replace(/\/+$/, "") || "/";
  if (a === b) return true;
  // Locale-prefixed match: /en/check-in ↔ /check-in
  if (a.endsWith(b) && (a === `/en${b}` || a.endsWith(b))) return true;
  return false;
}

/** Infer /en prefix from an open tab so cold-ish navigations stay in-locale. */
function localePrefixFromClients(clients) {
  for (const client of clients) {
    try {
      const first = new URL(client.url).pathname.split("/").filter(Boolean)[0];
      if (first === "en") return "/en";
    } catch {
      // ignore
    }
  }
  return "";
}

function withLocalePrefix(path, localePrefix) {
  const normalized = normalizeAppPath(path) || "/check-in";
  if (!localePrefix) return normalized;
  if (normalized === localePrefix || normalized.startsWith(`${localePrefix}/`)) {
    return normalized;
  }
  return `${localePrefix}${normalized}`;
}

/**
 * Focus the best same-origin tab and route to `path`, or open a new window.
 *
 * Priority when picking a tab:
 *   1. Already on the target path
 *   2. Visible (foreground / background-but-visible)
 *   3. Focused
 *   4. Any same-origin window
 *
 * Navigation strategy: WindowClient.navigate → postMessage fallback
 * (pwa-register listens for DADIARY_PUSH_NAVIGATE).
 */
async function openAppWindow(path) {
  const allClients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  const sameOrigin = allClients.filter((c) => {
    try {
      return c.url.startsWith(self.location.origin);
    } catch {
      return false;
    }
  });

  const localePrefix = localePrefixFromClients(sameOrigin);
  const targetPath = withLocalePrefix(path || "/check-in", localePrefix);
  const targetUrl = new URL(targetPath, self.location.origin).href;

  sameOrigin.sort((a, b) => scoreClient(b, targetPath) - scoreClient(a, targetPath));

  for (const client of sameOrigin) {
    if (!("focus" in client)) continue;

    try {
      await client.focus();
    } catch {
      // continue trying other clients
      continue;
    }

    // Already on the right page — just bring to foreground.
    if (pathsMatch(client.url, targetPath)) {
      if (typeof client.postMessage === "function") {
        client.postMessage({
          type: "DADIARY_PUSH_NAVIGATE",
          url: targetPath,
          alreadyHere: true,
        });
      }
      return client;
    }

    let navigated = false;
    if (typeof client.navigate === "function") {
      try {
        const result = await client.navigate(targetUrl);
        navigated = !!result;
      } catch {
        navigated = false;
      }
    }

    if (!navigated && typeof client.postMessage === "function") {
      client.postMessage({
        type: "DADIARY_PUSH_NAVIGATE",
        url: targetPath,
      });
    }
    return client;
  }

  // App was fully killed — cold start at the deep-link.
  if (self.clients.openWindow) {
    return self.clients.openWindow(targetUrl);
  }
  return null;
}

function scoreClient(client, targetPath) {
  let score = 0;
  if (pathsMatch(client.url, targetPath)) score += 100;
  if (client.visibilityState === "visible") score += 50;
  if (client.focused) score += 25;
  return score;
}

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
