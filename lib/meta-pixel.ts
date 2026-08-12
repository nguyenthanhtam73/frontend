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

/** Persist checkout value so /payment/success can fire Purchase with amount. */
export function rememberMetaCheckout(payload: MetaCheckoutPayload): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* private mode / quota */
  }
}

function readMetaCheckout(): MetaCheckoutPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CHECKOUT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MetaCheckoutPayload;
    if (typeof parsed?.value !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Fire Purchase once per invoice (or once per tab if invoice unknown).
 * Call after SePay IPN confirms a paid plan.
 */
export function trackMetaPurchaseOnce(): void {
  const payload = readMetaCheckout();
  const dedupeKey = `${PURCHASE_FIRED_PREFIX}${payload?.invoice || "session"}`;
  try {
    if (sessionStorage.getItem(dedupeKey) === "1") return;
    sessionStorage.setItem(dedupeKey, "1");
    sessionStorage.removeItem(CHECKOUT_STORAGE_KEY);
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
