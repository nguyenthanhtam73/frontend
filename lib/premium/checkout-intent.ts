import type { BillingInterval, PricedPlan } from "@/lib/premium/pricing";

export type CheckoutIntent = {
  plan: PricedPlan;
  interval: BillingInterval;
};

const PRICED_PLANS = new Set<PricedPlan>(["premium", "premium_plus"]);
const INTERVALS = new Set<BillingInterval>(["monthly", "yearly"]);

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

export function buildRegisterCheckoutHref(intent: CheckoutIntent): string {
  return `/register?plan=${intent.plan}&interval=${intent.interval}`;
}

/** Pricing URL that preselects interval and auto-starts SePay when logged in. */
export function buildPricingCheckoutHref(intent: CheckoutIntent): string {
  return `/pricing?plan=${intent.plan}&interval=${intent.interval}&checkout=1`;
}

/** Preserve plan intent when hopping login ↔ register. */
export function buildAuthHrefWithIntent(
  path: "/login" | "/register",
  intent: CheckoutIntent | null,
): string {
  if (!intent) return path;
  return `${path}?plan=${intent.plan}&interval=${intent.interval}`;
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

export function wantsAutoCheckout(search: string | URLSearchParams): boolean {
  const params =
    typeof search === "string"
      ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
      : search;
  return params.get("checkout") === "1";
}
