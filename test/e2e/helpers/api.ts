import type { APIRequestContext } from "@playwright/test";

import { apiURL, e2eSecret, sepaySecret } from "./env";
import { pollUntil, withRetry } from "./retry";

type Envelope<T> = {
  success?: boolean;
  data?: T;
  error?: { code?: string; message?: string };
};

export type AuthSession = {
  email: string;
  password: string;
  accessToken: string;
  userId: string;
  planTier: string;
};

export type CheckoutDTO = {
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

export type MeUser = {
  id: string;
  email: string;
  plan_tier?: string;
  plan_expires_at?: string;
  subscription_status?: string;
  days_left?: number;
  in_grace?: boolean;
  cancel_at_period_end?: boolean;
  trial_ends_at?: string;
  canceled_at?: string;
  grace_ends_at?: string;
};

export type UsageQuota = {
  plan_tier: string;
  is_premium: boolean;
  is_premium_plus: boolean;
  features?: Record<
    string,
    { allowed?: boolean; unlimited?: boolean; remaining?: number }
  >;
};

function authHeader(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

/** Register a unique Free user (or login if email already exists). */
export async function registerFreeUser(
  request: APIRequestContext,
  opts?: { email?: string; password?: string },
): Promise<AuthSession> {
  const stamp = Date.now().toString(36);
  const email =
    opts?.email || `smoke.${stamp}@e2e.dadiary.test`;
  const password = opts?.password || "SmokeTest1!";

  const res = await withRetry("auth/register", async () => {
    const r = await request.post(`${apiURL()}/api/v1/auth/register`, {
      data: {
        email,
        password,
        username: `smoke_${stamp}`,
        display_name: "SePay Smoke",
      },
    });
    // 409 → try login instead
    if (r.status() === 409 || r.status() === 400) {
      return r;
    }
    if (!r.ok()) {
      throw new Error(`register ${r.status()}: ${await r.text()}`);
    }
    return r;
  });

  if (!res.ok()) {
    return loginUser(request, email, password);
  }

  const json = (await res.json()) as Envelope<{
    tokens?: { access_token?: string };
    user?: { id?: string; plan_tier?: string };
  }>;
  const token = json.data?.tokens?.access_token;
  if (!token) throw new Error("register: missing access_token");

  return {
    email,
    password,
    accessToken: token,
    userId: json.data?.user?.id || "",
    planTier: json.data?.user?.plan_tier || "free",
  };
}

export async function loginUser(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<AuthSession> {
  const res = await withRetry("auth/login", async () => {
    const r = await request.post(`${apiURL()}/api/v1/auth/login`, {
      data: { email, password },
    });
    if (!r.ok()) throw new Error(`login ${r.status()}: ${await r.text()}`);
    return r;
  });
  const json = (await res.json()) as Envelope<{
    tokens?: { access_token?: string };
    user?: { id?: string; plan_tier?: string };
  }>;
  const token = json.data?.tokens?.access_token;
  if (!token) throw new Error("login: missing access_token");
  return {
    email,
    password,
    accessToken: token,
    userId: json.data?.user?.id || "",
    planTier: json.data?.user?.plan_tier || "free",
  };
}

export async function fetchMe(
  request: APIRequestContext,
  token: string,
): Promise<MeUser> {
  const res = await request.get(`${apiURL()}/api/v1/me`, {
    headers: authHeader(token),
  });
  if (!res.ok()) throw new Error(`/me ${res.status()}: ${await res.text()}`);
  const json = (await res.json()) as Envelope<MeUser>;
  if (!json.data) throw new Error("/me: empty data");
  return json.data;
}

export async function fetchUsage(
  request: APIRequestContext,
  token: string,
): Promise<UsageQuota> {
  const res = await request.get(`${apiURL()}/api/v1/me/usage`, {
    headers: authHeader(token),
  });
  if (!res.ok()) throw new Error(`/me/usage ${res.status()}: ${await res.text()}`);
  const json = (await res.json()) as Envelope<UsageQuota>;
  if (!json.data) throw new Error("/me/usage: empty data");
  return json.data;
}

export async function createCheckout(
  request: APIRequestContext,
  token: string,
  body: {
    plan_tier: "premium" | "premium_plus";
    billing_interval: "monthly" | "yearly";
    locale?: string;
  },
): Promise<CheckoutDTO> {
  const res = await withRetry("sepay/checkout", async () => {
    const r = await request.post(`${apiURL()}/api/v1/payment/sepay/checkout`, {
      headers: authHeader(token),
      data: {
        plan_tier: body.plan_tier,
        billing_interval: body.billing_interval,
        locale: body.locale || "vi",
      },
    });
    if (!r.ok()) throw new Error(`checkout ${r.status()}: ${await r.text()}`);
    return r;
  });
  const json = (await res.json()) as Envelope<CheckoutDTO>;
  if (!json.data?.invoice_number) {
    throw new Error("checkout: missing invoice_number");
  }
  return json.data;
}

/** Simulate SePay ORDER_PAID IPN (sandbox). Idempotent on replay. */
export async function postSePayWebhook(
  request: APIRequestContext,
  opts: {
    invoice: string;
    amountVnd: number | string;
    orderId?: string;
    txId?: string;
  },
): Promise<{ status: number; body: unknown }> {
  const payload = {
    notification_type: "ORDER_PAID",
    order: {
      id: opts.orderId || `e2e-ord-${opts.invoice}`,
      order_invoice_number: opts.invoice,
      order_status: "CAPTURED",
      order_amount: String(opts.amountVnd),
    },
    transaction: {
      transaction_id: opts.txId || `e2e-tx-${opts.invoice}`,
    },
  };

  const res = await withRetry("sepay/webhook", async () => {
    const r = await request.post(`${apiURL()}/api/v1/payment/sepay/webhook`, {
      headers: {
        "Content-Type": "application/json",
        "X-Secret-Key": sepaySecret(),
      },
      data: payload,
    });
    // 401/5xx retry; 404 order-not-found may be timing — retry a bit
    if (r.status() >= 500 || r.status() === 401 || r.status() === 404) {
      throw new Error(`webhook ${r.status()}: ${await r.text()}`);
    }
    return r;
  });

  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* keep text */
  }
  return { status: res.status(), body };
}

/** Wait until /me shows a paid (or specific) plan_tier. */
export async function waitForPlanTier(
  request: APIRequestContext,
  token: string,
  want: string | ((tier: string) => boolean),
): Promise<MeUser> {
  return pollUntil(`plan_tier=${want}`, async () => {
    const me = await fetchMe(request, token);
    const tier = me.plan_tier || "free";
    const ok = typeof want === "function" ? want(tier) : tier === want;
    return ok ? me : null;
  });
}

/**
 * Force plan_tier + plan_expires_at (requires DADIARY_E2E_SECRET on API).
 * Used to simulate expired Premium without waiting 30 days.
 */
export async function forcePlan(
  request: APIRequestContext,
  opts: {
    email: string;
    planTier: string;
    planExpiresAt?: string | null;
  },
): Promise<MeUser> {
  const secret = e2eSecret();
  if (!secret) {
    throw new Error(
      "E2E_SECRET / DADIARY_E2E_SECRET is required for force-plan (expiry tests)",
    );
  }
  const res = await request.post(`${apiURL()}/api/v1/internal/e2e/force-plan`, {
    headers: {
      "Content-Type": "application/json",
      "X-E2E-Secret": secret,
    },
    data: {
      email: opts.email,
      plan_tier: opts.planTier,
      plan_expires_at: opts.planExpiresAt ?? null,
    },
  });
  if (!res.ok()) {
    throw new Error(`force-plan ${res.status()}: ${await res.text()}`);
  }
  const json = (await res.json()) as Envelope<MeUser>;
  if (!json.data) throw new Error("force-plan: empty data");
  return json.data;
}

export function assertPremiumFeatures(usage: UsageQuota): void {
  if (!usage.is_premium) {
    throw new Error(`expected is_premium=true, got plan=${usage.plan_tier}`);
  }
  const f = usage.features || {};
  const mustAllow = ["wardrobe_full", "export_data", "ai_routine_suggestion", "no_ads"];
  for (const key of mustAllow) {
    if (!f[key]?.allowed) {
      throw new Error(`feature ${key} should be allowed on Premium: ${JSON.stringify(f[key])}`);
    }
  }
  // AI suggest should be unlimited on Premium
  if (f.ai_routine_suggestion && f.ai_routine_suggestion.unlimited !== true) {
    throw new Error("ai_routine_suggestion should be unlimited on Premium");
  }
}

/** Assert plan_expires_at ≈ now + days (default monthly = 30). Tolerance ±2h. */
export function assertPlanExpiresInDays(
  planExpiresAt: string | undefined,
  days: number,
  opts?: { toleranceHours?: number; from?: Date },
): void {
  if (!planExpiresAt) {
    throw new Error("plan_expires_at missing");
  }
  const exp = new Date(planExpiresAt).getTime();
  if (Number.isNaN(exp)) {
    throw new Error(`invalid plan_expires_at: ${planExpiresAt}`);
  }
  const from = (opts?.from ?? new Date()).getTime();
  const toleranceMs = (opts?.toleranceHours ?? 2) * 60 * 60 * 1000;
  const want = from + days * 24 * 60 * 60 * 1000;
  const delta = Math.abs(exp - want);
  if (delta > toleranceMs) {
    throw new Error(
      `plan_expires_at=${planExpiresAt} not within ±${opts?.toleranceHours ?? 2}h of +${days}d (deltaMs=${delta})`,
    );
  }
}

export type E2EAlert = {
  key?: string;
  unique_suffix?: string;
  title?: string;
  level?: string;
  message?: string;
  detail?: string;
  fields?: Record<string, unknown>;
};

function e2eHeaders(): Record<string, string> {
  const secret = e2eSecret();
  if (!secret) {
    throw new Error(
      "E2E_SECRET / DADIARY_E2E_SECRET required for alert capture endpoints",
    );
  }
  return {
    "X-E2E-Secret": secret,
    Accept: "application/json",
  };
}

/** Clear in-memory alert buffer on the API (between cases). */
export async function clearE2EAlerts(request: APIRequestContext): Promise<void> {
  const res = await request.delete(`${apiURL()}/api/v1/internal/e2e/alerts`, {
    headers: e2eHeaders(),
  });
  if (!res.ok()) {
    throw new Error(`clear alerts ${res.status()}: ${await res.text()}`);
  }
}

/** Fetch captured ops alerts (same path Telegram would take). */
export async function fetchE2EAlerts(
  request: APIRequestContext,
  opts?: { key?: string; invoice?: string },
): Promise<E2EAlert[]> {
  const params = new URLSearchParams();
  if (opts?.key) params.set("key", opts.key);
  if (opts?.invoice) params.set("invoice", opts.invoice);
  const qs = params.toString();
  const path = qs
    ? `${apiURL()}/api/v1/internal/e2e/alerts?${qs}`
    : `${apiURL()}/api/v1/internal/e2e/alerts`;
  const res = await request.get(path, { headers: e2eHeaders() });
  if (!res.ok()) {
    throw new Error(`e2e/alerts ${res.status()}: ${await res.text()}`);
  }
  const json = (await res.json()) as Envelope<{ alerts?: E2EAlert[] }>;
  return json.data?.alerts ?? [];
}

/**
 * Poll until a payment_success alert exists for invoice.
 * Asserts message contains upgrade + amount (Telegram payload shape).
 */
export async function waitForPaymentSuccessAlert(
  request: APIRequestContext,
  opts: { invoice: string; amountVnd: number; email?: string },
): Promise<E2EAlert> {
  return pollUntil(`payment_success alert invoice=${opts.invoice}`, async () => {
    const alerts = await fetchE2EAlerts(request, {
      key: "payment_success",
      invoice: opts.invoice,
    });
    if (!alerts.length) return null;
    const hit = alerts[alerts.length - 1];
    const msg = hit.message || "";
    if (!/nâng cấp/i.test(msg) && !/upgrade|success/i.test(msg)) {
      return null;
    }
    if (!msg.includes(String(opts.amountVnd))) {
      return null;
    }
    if (hit.title && hit.title !== "Payment success") {
      return null;
    }
    return hit;
  }, { timeoutMs: 20_000, intervalMs: 400 });
}
