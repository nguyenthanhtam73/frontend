import { apiBaseUrl } from "@/lib/api";
import { ApiError, apiPost } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-envelope";
import { authHeaders } from "@/lib/auth-token";
import { isPaidPlan, normalizePlanTier, type PlanTier } from "@/lib/premium/features";
import type { BillingInterval, PricedPlan } from "@/lib/premium/pricing";

/** Response from POST /api/v1/payment/sepay/checkout. */
export type SePayCheckoutDTO = {
  order_id: string;
  invoice_number: string;
  plan_tier: string;
  billing_interval: string;
  amount_vnd: number;
  currency: string;
  checkout_url: string;
  form_fields: Record<string, string>;
  env: string;
};

export type CreateSePayCheckoutBody = {
  plan_tier: PricedPlan;
  billing_interval: BillingInterval;
  locale?: string;
  payment_method?: string;
};

/**
 * Init SePay checkout for the signed-in user.
 * Backend persists payment_orders then returns signed form fields.
 */
export async function createSePayCheckout(
  planTier: PricedPlan,
  interval: BillingInterval,
  opts?: { locale?: string; paymentMethod?: string },
): Promise<SePayCheckoutDTO> {
  const body: CreateSePayCheckoutBody = {
    plan_tier: planTier,
    billing_interval: interval,
  };
  if (opts?.locale?.trim()) {
    body.locale = opts.locale.trim();
  }
  if (opts?.paymentMethod?.trim()) {
    body.payment_method = opts.paymentMethod.trim();
  }
  return apiPost<SePayCheckoutDTO>("/api/v1/payment/sepay/checkout", body, {
    toastOnError: false,
    fallbackMessage: "checkout_failed",
  });
}

/**
 * SePay requires hidden inputs in this exact order (see their checkout form docs).
 * JSON `form_fields` maps are alphabetical — posting that order yields a blank /
 * "Lỗi không xác định" page with no payment methods. Signature HMAC order is
 * separate; this list is only for the HTML POST body.
 */
export const SEPAY_CHECKOUT_FIELD_ORDER = [
  "order_amount",
  "merchant",
  "currency",
  "operation",
  "order_description",
  "order_invoice_number",
  "customer_id",
  "payment_method",
  "success_url",
  "error_url",
  "cancel_url",
  "custom_data",
  "signature",
] as const;

/**
 * Auto-submit a classic HTML form POST to SePay checkout/init.
 * Uses document.createElement so we never navigate away before fields are ready.
 */
export function submitSePayCheckoutForm(
  checkoutUrl: string,
  formFields: Record<string, string>,
): void {
  if (typeof document === "undefined") {
    throw new Error("submitSePayCheckoutForm requires a browser");
  }
  const url = checkoutUrl?.trim();
  if (!url) {
    throw new Error("missing checkout_url");
  }
  if (!formFields || Object.keys(formFields).length === 0) {
    throw new Error("missing form_fields");
  }

  const form = document.createElement("form");
  form.method = "POST";
  form.action = url;
  form.acceptCharset = "UTF-8";
  form.style.display = "none";
  form.setAttribute("data-sepay-checkout", "1");

  const appendHidden = (name: string, value: string) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  };

  const used = new Set<string>();
  for (const name of SEPAY_CHECKOUT_FIELD_ORDER) {
    const value = formFields[name];
    if (value == null || value === "") continue;
    appendHidden(name, value);
    used.add(name);
  }
  // Preserve any future SePay fields without breaking order of known ones.
  for (const [name, value] of Object.entries(formFields)) {
    if (!name || used.has(name) || value == null || value === "") continue;
    appendHidden(name, value);
  }

  document.body.appendChild(form);
  form.submit();
}

/** Soft /me read for payment success polling — never clears the session on 5xx. */
export async function fetchMePlanTierSoft(): Promise<PlanTier | null> {
  try {
    const res = await fetch(`${apiBaseUrl}/api/v1/me`, { headers: authHeaders() });
    if (res.status === 401 || res.status === 403) return null;
    if (!res.ok) return null;
    const json = (await res.json().catch(() => ({}))) as ApiEnvelope<{
      plan_tier?: string;
    }>;
    if (!json.data) return null;
    return normalizePlanTier(json.data.plan_tier);
  } catch {
    return null;
  }
}

export function isPaidPlanTier(tier: PlanTier | null | undefined): boolean {
  return tier != null && isPaidPlan(tier);
}

/** Map API errors to i18n keys under `pricing.checkout`. */
export function sePayCheckoutErrorKey(err: unknown): string {
  if (!(err instanceof ApiError)) return "errorGeneric";
  if (err.status === 401) return "errorAuth";
  if (err.kind === "rate_limited" || err.status === 429) return "errorRateLimited";
  if (
    err.code === "sepay_not_configured" ||
    err.code === "service_unavailable" ||
    err.code === "checkout_disabled"
  ) {
    return "errorUnavailable";
  }
  if (err.code === "invalid_request") return "errorInvalid";
  if (err.kind === "offline" || err.kind === "network" || err.kind === "timeout") {
    return "errorNetwork";
  }
  if (err.kind === "server" || (err.status != null && err.status >= 500)) {
    return "errorServer";
  }
  return "errorGeneric";
}
