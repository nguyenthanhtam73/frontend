import type { APIRequestContext, Page } from "@playwright/test";

import type { OnboardingSkinAnalyzeDTO } from "../../../lib/types/onboarding-ai";
import { apiURL, defaultPassword } from "./env";
import { loginUser, registerFreeUser, type AuthSession } from "./api";
import { withRetry } from "./retry";

type Envelope<T> = {
  success?: boolean;
  data?: T;
  error?: { code?: string; message?: string };
};

export type AdminAffiliateSKURow = {
  product_id?: string;
  product_name: string;
  brand?: string;
  affiliate_link?: string;
  clicks_7d: number;
  clicks_30d: number;
  clicks_total: number;
  last_click_at?: string;
};

export type AdminAffiliateMetrics = {
  clicks_7d: number;
  clicks_30d: number;
  clicks_total: number;
  top_skus: AdminAffiliateSKURow[];
  as_of: string;
};

function authHeader(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

/** Optional: email must be listed in API DADIARY_ADMIN_EMAILS. */
export function e2eAdminEmail(): string {
  return (process.env.E2E_ADMIN_EMAIL || "").trim().toLowerCase();
}

/**
 * Register (or login) the configured admin email for GET /admin/metrics/affiliate.
 * Requires DADIARY_ADMIN_EMAILS to include E2E_ADMIN_EMAIL on the API.
 */
export async function registerOrLoginAdminUser(
  request: APIRequestContext,
): Promise<AuthSession> {
  const email = e2eAdminEmail();
  if (!email) {
    throw new Error(
      "E2E_ADMIN_EMAIL is required for admin affiliate metrics (must be in DADIARY_ADMIN_EMAILS)",
    );
  }
  const password = defaultPassword();
  try {
    return await registerFreeUser(request, { email, password });
  } catch {
    return loginUser(request, email, password);
  }
}

export async function fetchAffiliateMetrics(
  request: APIRequestContext,
  adminToken: string,
  opts?: { limit?: number },
): Promise<AdminAffiliateMetrics> {
  const limit = opts?.limit ?? 50;
  const res = await request.get(
    `${apiURL()}/api/v1/admin/metrics/affiliate?limit=${limit}`,
    { headers: authHeader(adminToken) },
  );
  if (!res.ok()) {
    throw new Error(
      `GET /admin/metrics/affiliate ${res.status()}: ${await res.text()}`,
    );
  }
  const json = (await res.json()) as Envelope<AdminAffiliateMetrics>;
  if (!json.data) throw new Error("affiliate metrics: empty data");
  return json.data;
}

export async function logAffiliateClickViaApi(
  request: APIRequestContext,
  token: string,
  body: {
    product_name: string;
    brand?: string;
    affiliate_link: string;
    source: "daily_feedback" | "routine_suggest" | "starter_routine";
    context_id?: string;
    price_range?: string;
    priority?: string;
  },
): Promise<{ id: string; logged_at: string }> {
  const res = await withRetry("affiliate/clicks", async () => {
    const r = await request.post(`${apiURL()}/api/v1/affiliate/clicks`, {
      headers: authHeader(token),
      data: body,
    });
    if (!r.ok()) {
      throw new Error(`affiliate/clicks ${r.status()}: ${await r.text()}`);
    }
    return r;
  });
  const json = (await res.json()) as Envelope<{ id?: string; logged_at?: string }>;
  if (!json.data?.id) {
    throw new Error(`affiliate/clicks missing id: ${JSON.stringify(json)}`);
  }
  return { id: json.data.id, logged_at: json.data.logged_at || "" };
}

export function skuClicksTotal(
  metrics: AdminAffiliateMetrics,
  productId: string,
): number {
  const row = metrics.top_skus?.find((s) => s.product_id === productId);
  return Number(row?.clicks_total ?? 0);
}

/**
 * Inject dense analyze JSON into the onboarding zustand store (dev hook).
 * Call after /onboarding has loaded so the client store module is mounted.
 */
export async function injectAiAnalyzeFixture(
  page: Page,
  fixture: OnboardingSkinAnalyzeDTO,
): Promise<void> {
  await page.waitForFunction(
    () =>
      Boolean(
        (
          window as unknown as {
            __DADIARY_E2E__?: { applyAiAnalyzeResult?: unknown };
          }
        ).__DADIARY_E2E__?.applyAiAnalyzeResult,
      ),
    { timeout: 20_000 },
  );
  await page.evaluate((data) => {
    const api = (
      window as unknown as {
        __DADIARY_E2E__: {
          applyAiAnalyzeResult: (d: OnboardingSkinAnalyzeDTO) => void;
        };
      }
    ).__DADIARY_E2E__;
    api.applyAiAnalyzeResult(data);
  }, fixture);
}
