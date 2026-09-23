/** Public TikTok Pixel ID (override via env if needed). */
export const TIKTOK_PIXEL_ID =
  process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID?.trim() || "DAPQVHBC77U5PB605QBG";

const TIKTOK_PIXEL_ID_PATTERN = /^[A-Za-z0-9]+$/;

type TikTokQueue = {
  track?: (...args: unknown[]) => void;
  page?: (...args: unknown[]) => void;
  load?: (pixelId: string, options?: Record<string, unknown>) => void;
  methods?: string[];
  setAndDefer?: (target: object, method: string) => void;
  instance?: (pixelId: string) => TikTokQueue;
  _i?: Record<string, unknown>;
  _t?: Record<string, number>;
  _o?: Record<string, unknown>;
};

declare global {
  interface Window {
    TiktokAnalyticsObject?: string;
    ttq?: TikTokQueue;
  }
}

/**
 * Skip Pixel on local/dev so Events Manager is not polluted with localhost page views.
 * Same gate as Meta (`shouldLoadMetaPixel`).
 */
export function shouldLoadTikTokPixel(): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  if (typeof window === "undefined") return true;
  const host = window.location.hostname;
  return host !== "localhost" && host !== "127.0.0.1" && host !== "[::1]";
}

/** True for `/admin` and `/[locale]/admin…` (locale-prefixed App Router paths). */
export function isTikTokPixelAdminPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return /(?:^|\/)admin(?:\/|$)/.test(pathname);
}

export function isTikTokPixelId(value: string): boolean {
  return TIKTOK_PIXEL_ID_PATTERN.test(value);
}

/**
 * Official base code: loads `events.js` via `ttq.load`, then `ttq.page()`.
 * Pixel id is restricted to alphanumeric so it cannot break out of the snippet.
 */
export function tikTokPixelBootstrap(pixelId: string = TIKTOK_PIXEL_ID): string {
  if (!isTikTokPixelId(pixelId)) {
    throw new Error("Invalid TikTok pixel id");
  }
  return `
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(
var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script")
;n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
  ttq.load('${pixelId}');
  ttq.page();
}(window, document, 'ttq');
  `.trim();
}

/** Fire a TikTok standard or custom event (no-op if Pixel not loaded). */
export function trackTikTokEvent(
  event: string,
  params?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  if (!shouldLoadTikTokPixel()) return;
  if (params) {
    window.ttq?.track?.(event, params);
    return;
  }
  window.ttq?.track?.(event);
}

/** SPA page view. The bootstrap snippet already sends the first one. */
export function trackTikTokPage(): void {
  if (typeof window === "undefined") return;
  if (!shouldLoadTikTokPixel()) return;
  window.ttq?.page?.();
}

/**
 * TikTok's purchase standard is CompletePayment (Meta fires Purchase).
 * `content_id` mirrors Meta `order_id` when an invoice is present.
 */
export function trackTikTokCompletePayment(params: Record<string, unknown>): void {
  const next: Record<string, unknown> = { ...params };
  if (typeof params.content_name === "string" && params.content_name) {
    next.content_type = "product";
  }
  if (params.order_id != null && params.order_id !== "") {
    next.content_id = params.order_id;
  }
  trackTikTokEvent("CompletePayment", next);
}
