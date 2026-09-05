import { sanitizeAuthReturnPath } from "@/lib/auth/return-path";
import type { BillingInterval, PricedPlan } from "@/lib/premium/pricing";

export type CheckoutIntent = {
  plan: PricedPlan;
  interval: BillingInterval;
};

const PRICED_PLANS = new Set<PricedPlan>(["premium", "premium_plus"]);
const INTERVALS = new Set<BillingInterval>(["monthly", "yearly"]);

/** Session backup so plan/interval survive login↔register hops and header CTAs. */
export const CHECKOUT_INTENT_STORAGE_KEY = "dadiary:checkout-intent";

type IntentStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function defaultStore(): IntentStore | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage;
}

/** Parse & validate `plan` + `interval` from query/search params. */
export function parseCheckoutIntent(
  planRaw: string | null | undefined,
  intervalRaw: string | null | undefined,
): CheckoutIntent | null {
  const plan = (planRaw ?? "").toLowerCase().trim() as PricedPlan;
  if (!PRICED_PLANS.has(plan)) return null;
  const intervalRawNorm = (intervalRaw ?? "").toLowerCase().trim() as BillingInterval;
  const interval: BillingInterval = INTERVALS.has(intervalRawNorm)
    ? intervalRawNorm
    : "yearly";
  return { plan, interval };
}

export function persistCheckoutIntent(
  intent: CheckoutIntent | null,
  store: IntentStore | null = defaultStore(),
): void {
  if (!store) return;
  try {
    if (!intent) {
      store.removeItem(CHECKOUT_INTENT_STORAGE_KEY);
      return;
    }
    store.setItem(CHECKOUT_INTENT_STORAGE_KEY, JSON.stringify(intent));
  } catch {
    // private mode / storage disabled
  }
}

export function readPersistedCheckoutIntent(
  store: IntentStore | null = defaultStore(),
): CheckoutIntent | null {
  if (!store) return null;
  try {
    const raw = store.getItem(CHECKOUT_INTENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { plan?: unknown; interval?: unknown };
    return parseCheckoutIntent(
      typeof parsed.plan === "string" ? parsed.plan : null,
      typeof parsed.interval === "string" ? parsed.interval : null,
    );
  } catch {
    return null;
  }
}

export function buildRegisterCheckoutHref(intent: CheckoutIntent): string {
  return `/register?plan=${intent.plan}&interval=${intent.interval}`;
}

/** Pricing URL that preselects interval and asks for an upgrade confirmation. */
export function buildPricingCheckoutHref(intent: CheckoutIntent): string {
  return `/pricing?plan=${intent.plan}&interval=${intent.interval}&checkout=1`;
}

/** Preserve plan intent when hopping login ↔ register. */
export function buildAuthHrefWithIntent(
  path: "/login" | "/register",
  intent: CheckoutIntent | null,
): string {
  return buildAuthHref(path, { intent });
}

/** Combine checkout intent and/or a safe `next` path on auth URLs. */
export function buildAuthHref(
  path: "/login" | "/register",
  opts: { intent?: CheckoutIntent | null; next?: string | null },
): string {
  const params = new URLSearchParams();
  if (opts.intent) {
    params.set("plan", opts.intent.plan);
    params.set("interval", opts.intent.interval);
  }
  const next = sanitizeAuthReturnPath(opts.next);
  if (next) params.set("next", next);
  const q = params.toString();
  return q ? `${path}?${q}` : path;
}

export function readCheckoutIntentFromSearch(
  search: string | URLSearchParams,
): CheckoutIntent | null {
  const params =
    typeof search === "string"
      ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
      : search;
  return parseCheckoutIntent(params.get("plan"), params.get("interval"));
}

/** URL wins; otherwise restore the last selected paid plan from this tab. */
export function resolveCheckoutIntent(
  search: string | URLSearchParams,
  store: IntentStore | null = defaultStore(),
): CheckoutIntent | null {
  const fromUrl = readCheckoutIntentFromSearch(search);
  if (fromUrl) {
    persistCheckoutIntent(fromUrl, store);
    return fromUrl;
  }
  return readPersistedCheckoutIntent(store);
}

export function wantsAutoCheckout(search: string | URLSearchParams): boolean {
  const params =
    typeof search === "string"
      ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
      : search;
  return params.get("checkout") === "1";
}
