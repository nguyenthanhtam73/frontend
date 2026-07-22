import type { Page } from "@playwright/test";

import { AUTH_TOKEN_STORAGE_KEY } from "../../../lib/auth-token";

/** Inject JWT so Next.js client treats the session as logged-in. */
export async function injectAccessToken(page: Page, token: string): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      try {
        localStorage.setItem(key, value);
      } catch {
        /* ignore */
      }
    },
    [AUTH_TOKEN_STORAGE_KEY, token] as const,
  );
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
