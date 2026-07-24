import type { Page } from "@playwright/test";

import {
  AUTH_REFRESH_STORAGE_KEY,
  AUTH_TOKEN_STORAGE_KEY,
} from "../../../lib/auth-token";
import { sleep } from "./retry";

/** Inject JWT (+ optional refresh) so Next.js client treats the session as logged-in. */
export async function injectAccessToken(
  page: Page,
  token: string,
  refreshToken?: string,
): Promise<void> {
  await page.addInitScript(
    ([accessKey, accessValue, refreshKey, refreshValue]) => {
      try {
        localStorage.setItem(accessKey, accessValue);
        if (refreshValue) {
          localStorage.setItem(refreshKey, refreshValue);
        }
      } catch {
        /* ignore */
      }
    },
    [
      AUTH_TOKEN_STORAGE_KEY,
      token,
      AUTH_REFRESH_STORAGE_KEY,
      refreshToken ?? "",
    ] as const,
  );
}

/**
 * Seed zustand privacy store so check-in can start in skip-face mode
 * (toggle still works; this avoids race before rehydrate).
 */
export async function injectSkipFaceCapture(page: Page, skip = true): Promise<void> {
  await page.addInitScript((wantSkip) => {
    try {
      const key = "dadiary:privacy";
      const payload = {
        state: {
          consentAcknowledged: true,
          consentAcknowledgedAt: new Date().toISOString(),
          skipFaceCapture: wantSkip,
          dataResetAt: null,
        },
        version: 1,
      };
      localStorage.setItem(key, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }, skip);
}

/**
 * After reload/navigation: sample auth chrome while access token is present.
 * Returns true if guest CTAs flashed (session regression).
 */
export async function didAuthFlashToGuest(
  page: Page,
  opts?: { samples?: number; intervalMs?: number },
): Promise<boolean> {
  const samples = opts?.samples ?? 25;
  const intervalMs = opts?.intervalMs ?? 80;
  for (let i = 0; i < samples; i++) {
    const state = await page.evaluate((accessKey) => {
      let token = false;
      try {
        token = Boolean(localStorage.getItem(accessKey));
      } catch {
        token = false;
      }
      const guest = Boolean(document.querySelector('[data-testid="auth-guest"]'));
      const signed = Boolean(
        document.querySelector('[data-testid="auth-signed-in"]'),
      );
      return { token, guest, signed };
    }, AUTH_TOKEN_STORAGE_KEY);
    if (state.token && state.guest) return true;
    if (state.signed) return false;
    await sleep(intervalMs);
  }
  return false;
}

/**
 * Block real SePay navigation and capture the form POST payload.
 * Call BEFORE clicking upgrade CTA.
 */
export async function mockSePayFormSubmit(page: Page): Promise<{
  waitForCheckoutPost: () => Promise<{
    url: string;
    fields: Record<string, string>;
  }>;
}> {
  let resolvePost: (v: { url: string; fields: Record<string, string> }) => void;
  const posted = new Promise<{ url: string; fields: Record<string, string> }>((r) => {
    resolvePost = r;
  });

  // Abort navigation to SePay hosts; still let us inspect the request body.
  await page.route(/pay(-sandbox)?\.sepay\.vn/, async (route) => {
    const req = route.request();
    const fields: Record<string, string> = {};
    const postData = req.postData() || "";
    for (const part of postData.split("&")) {
      if (!part) continue;
      const [k, v = ""] = part.split("=");
      fields[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, " "));
    }
    resolvePost!({ url: req.url(), fields });
    await route.abort("blockedbyclient");
  });

  return {
    waitForCheckoutPost: () => posted,
  };
}

/**
 * Pricing renders BillingToggle twice (header + sticky mobile bar).
 * Prefer the visible control to avoid Playwright strict-mode collisions.
 */
export async function selectBillingMonthly(page: Page): Promise<void> {
  const toggles = page.getByTestId("billing-toggle-monthly");
  const visible = toggles.filter({ visible: true });
  if ((await visible.count()) > 0) {
    await visible.first().click();
    return;
  }
  await toggles.first().click();
}

/**
 * After Premium CTA: read invoice/amount from checkout JSON when still available,
 * otherwise from the mocked SePay form fields (Chromium may drop response body
 * after we abort the SePay navigation).
 */
export async function resolveCheckoutFromUi(opts: {
  checkoutResp: import("@playwright/test").Response;
  posted: { url: string; fields: Record<string, string> };
}): Promise<{ invoice: string; amountVnd: number; signature?: string }> {
  let invoice = "";
  let amountVnd = 0;
  let signature: string | undefined;

  try {
    const checkoutJson = (await opts.checkoutResp.json()) as {
      data?: {
        invoice_number?: string;
        amount_vnd?: number;
        form_fields?: Record<string, string>;
      };
    };
    invoice = checkoutJson.data?.invoice_number || "";
    amountVnd = Number(checkoutJson.data?.amount_vnd || 0);
    signature = checkoutJson.data?.form_fields?.signature;
  } catch {
    // Response body gone after route.abort — fall through to form fields.
  }

  const fields = opts.posted.fields;
  invoice =
    invoice ||
    fields.order_invoice_number ||
    fields["order_invoice_number"] ||
    "";
  if (!amountVnd) {
    const raw =
      fields.order_amount ||
      fields["order_amount"] ||
      fields.amount ||
      "";
    amountVnd = Number(raw);
  }
  signature = signature || fields.signature || fields["signature"];

  if (!invoice) {
    throw new Error("checkout: missing invoice (response + SePay form empty)");
  }
  if (!Number.isFinite(amountVnd) || amountVnd <= 0) {
    throw new Error(`checkout: invalid amount from UI: ${amountVnd}`);
  }
  return { invoice, amountVnd, signature };
}
