/** Public Meta Pixel ID (override via env if needed). */
export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || "1673924784100065";

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void;
      queue?: unknown[];
      loaded?: boolean;
      version?: string;
      push?: (...args: unknown[]) => void;
    };
    _fbq?: Window["fbq"];
  }
}

/** Skip Pixel on local/dev so Ads Manager is not polluted with localhost PageViews. */
export function shouldLoadMetaPixel(): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  if (typeof window === "undefined") return true;
  const host = window.location.hostname;
  return host !== "localhost" && host !== "127.0.0.1" && host !== "[::1]";
}

/** True for `/admin` and `/[locale]/admin…` (locale-prefixed App Router paths). */
export function isMetaPixelAdminPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return /(?:^|\/)admin(?:\/|$)/.test(pathname);
}

/** Fire a standard or custom Meta Pixel event (no-op if Pixel not loaded). */
export function trackMetaEvent(
  event: string,
  params?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  if (!shouldLoadMetaPixel()) return;
  if (params) {
    window.fbq?.("track", event, params);
    return;
  }
  window.fbq?.("track", event);
}

const CHECKOUT_STORAGE_KEY = "dadiary_meta_checkout";
const PURCHASE_FIRED_PREFIX = "dadiary_meta_purchase_";

export type MetaCheckoutPayload = {
  value: number;
  currency: string;
  contentName: string;
  invoice?: string;
};

function storageGet(key: string): string | null {
  try {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode / quota */
  }
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* private mode / quota */
  }
}

function storageRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function parseCheckoutPayload(raw: string | null): MetaCheckoutPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<MetaCheckoutPayload>;
    const value = Number(parsed.value);
    if (!Number.isFinite(value) || value < 0) return null;
    const currency = String(parsed.currency || "VND").toUpperCase();
    const contentName = String(parsed.contentName || "").trim();
    const invoice = String(parsed.invoice || "").trim();
    return {
      value,
      currency: currency || "VND",
      contentName,
      invoice: invoice || undefined,
    };
  } catch {
    return null;
  }
}

/** Persist checkout value in localStorage so a new tab / success URL still has amount. */
export function rememberMetaCheckout(payload: MetaCheckoutPayload): void {
  if (typeof window === "undefined") return;
  const value = Number(payload.value);
  if (!Number.isFinite(value) || value < 0) return;
  storageSet(
    CHECKOUT_STORAGE_KEY,
    JSON.stringify({
      value,
      currency: (payload.currency || "VND").toUpperCase(),
      contentName: payload.contentName,
      invoice: payload.invoice,
    } satisfies MetaCheckoutPayload),
  );
}

function readMetaCheckout(): MetaCheckoutPayload | null {
  if (typeof window === "undefined") return null;
  return parseCheckoutPayload(storageGet(CHECKOUT_STORAGE_KEY));
}

type TrackPurchaseOpts = {
  /** Plan is confirmed paid (IPN) — fire even if checkout payload is missing. */
  planConfirmed?: boolean;
};

/**
 * Fire Purchase once per invoice (or once per browser if invoice unknown).
 * Needs checkout payload unless `planConfirmed` (avoids bookmark false conversions).
 */
export function trackMetaPurchaseOnce(opts?: TrackPurchaseOpts): void {
  const payload = readMetaCheckout();
  if (!payload && !opts?.planConfirmed) return;

  const dedupeKey = `${PURCHASE_FIRED_PREFIX}${payload?.invoice || "session"}`;
  try {
    if (storageGet(dedupeKey) === "1") return;
    storageSet(dedupeKey, "1");
    storageRemove(CHECKOUT_STORAGE_KEY);
  } catch {
    /* still fire — better a duplicate than a missed conversion */
  }

  const params: Record<string, unknown> = {
    currency: payload?.currency || "VND",
  };
  if (payload && payload.value > 0) params.value = payload.value;
  if (payload?.contentName) params.content_name = payload.contentName;
  if (payload?.invoice) params.order_id = payload.invoice;
  trackMetaEvent("Purchase", params);
}
