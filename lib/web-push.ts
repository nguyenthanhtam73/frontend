/**
 * Browser Web Push helpers (Phase 1: subscribe / unsubscribe only).
 *
 * Requires:
 *   - Secure context (HTTPS or localhost)
 *   - Service worker (`/sw.js`)
 *   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (applicationServerKey)
 */

import type { SubscribePushPayload } from "@/lib/types/push";

const PREF_KEY = "dadiary_push_enabled";
/** Last VAPID public key used for a successful PushManager subscribe. */
const VAPID_PREF_KEY = "dadiary_push_vapid_pub";

export type PushSupport =
  | { ok: true }
  | {
      ok: false;
      reason: "unsupported" | "insecure" | "no_vapid";
    };

/** Local preference mirror — backend remains the source of truth when online. */
export function getLocalPushEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(PREF_KEY) === "1";
  } catch {
    return false;
  }
}

export function setLocalPushEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (enabled) {
      window.localStorage.setItem(PREF_KEY, "1");
    } else {
      window.localStorage.removeItem(PREF_KEY);
    }
  } catch {
    // private mode / storage disabled
  }
}

/** Check whether this browser can use Web Push. */
export function checkPushSupport(): PushSupport {
  if (typeof window === "undefined") {
    return { ok: false, reason: "unsupported" };
  }
  if (!window.isSecureContext) {
    return { ok: false, reason: "insecure" };
  }
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return { ok: false, reason: "unsupported" };
  }
  if (!getVapidPublicKey()) {
    return { ok: false, reason: "no_vapid" };
  }
  return { ok: true };
}

export function getVapidPublicKey(): string {
  return (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").trim();
}

/** Ensure `/sw.js` is registered and return the registration (works in dev too). */
export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!("serviceWorker" in navigator)) {
    throw new Error("unsupported");
  }
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) {
    await navigator.serviceWorker.ready;
    return existing;
  }
  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  return reg;
}

/**
 * Request permission, subscribe via PushManager, and return the API payload.
 * Does not call the backend — callers persist via `subscribePush`.
 */
export async function createBrowserPushSubscription(): Promise<SubscribePushPayload> {
  const support = checkPushSupport();
  if (!support.ok) {
    throw new Error(support.reason);
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("permission_denied");
  }

  const reg = await ensureServiceWorker();
  const currentVapid = getVapidPublicKey();
  const vapidKey = Uint8Array.from(urlBase64ToUint8Array(currentVapid));

  let sub = await reg.pushManager.getSubscription();
  // After VAPID rotation the old PushManager sub is dead but still present.
  // Compare to the key we last subscribed with and force a fresh subscribe.
  const storedVapid = getStoredVapidPublicKey();
  if (sub && storedVapid && storedVapid !== currentVapid) {
    try {
      await sub.unsubscribe();
    } catch {
      // continue — subscribe() below still needs a clean slate when possible
    }
    sub = null;
  }

  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKey as BufferSource,
    });
  }

  const json = sub.toJSON();
  const endpoint = json.endpoint?.trim() ?? "";
  const p256dh = json.keys?.p256dh?.trim() ?? "";
  const auth = json.keys?.auth?.trim() ?? "";
  if (!endpoint || !p256dh || !auth) {
    throw new Error("invalid_subscription");
  }

  setStoredVapidPublicKey(currentVapid);

  return {
    endpoint,
    keys: { p256dh, auth },
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
  };
}

function getStoredVapidPublicKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(VAPID_PREF_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

function setStoredVapidPublicKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VAPID_PREF_KEY, key);
  } catch {
    // private mode
  }
}

/**
 * Current browser PushManager subscription endpoint, or null.
 * Ensures `/sw.js` is registered + ready first so Settings sync does not
 * briefly treat a missing registration as "other device".
 */
export async function getBrowserPushEndpoint(): Promise<string | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  try {
    const reg = await ensureServiceWorker();
    const sub = await reg.pushManager.getSubscription();
    return sub?.endpoint?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Stable UI sync states for Settings (endpoint-aware).
 *
 * - `disabled` — account has no active push row
 * - `enabled` — account endpoint === this browser's PushManager endpoint
 * - `enabled_other_device` — account has a sub, but this browser is not that endpoint
 *   (includes: no local sub, or a local sub that does not match — never treat mismatch as enabled)
 *
 * Hard-block browsers (no VAPID / insecure / unsupported) should pass
 * `localEndpoint = null` and still supply the account endpoint so Settings
 * shows Other device + Turn off instead of a false Off.
 */
export type PushDeviceSyncState = "disabled" | "enabled" | "enabled_other_device";

export function resolvePushDeviceSyncState(
  accountEndpoint: string | null | undefined,
  localEndpoint: string | null | undefined,
): PushDeviceSyncState {
  const account = accountEndpoint?.trim() || "";
  if (!account) return "disabled";

  const local = localEndpoint?.trim() || "";
  if (local && local === account) return "enabled";
  return "enabled_other_device";
}

/** Unsubscribe the browser PushManager subscription (best-effort). */
export async function removeBrowserPushSubscription(): Promise<void> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    if (!reg) return;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
  } catch {
    // ignore — server-side delete is what matters for stop-sending
  }
  try {
    window.localStorage.removeItem(VAPID_PREF_KEY);
  } catch {
    // private mode
  }
}

/** Dev-only console logging — never surface raw errors in the UI. */
export function logPushError(context: string, err: unknown): void {
  if (process.env.NODE_ENV !== "development") return;
  console.error(`[push] ${context}`, err);
}

/** Convert a URL-safe base64 VAPID public key to a Uint8Array for PushManager. */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    out[i] = raw.charCodeAt(i);
  }
  return out;
}
