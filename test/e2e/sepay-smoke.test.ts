/**
 * SePay Sandbox — full-stack smoke (Playwright).
 *
 * Prerequisites (both running):
 *   - Backend API  (E2E_API_URL, SePay sandbox env, optional DADIARY_E2E_SECRET)
 *   - Frontend Next (E2E_WEB_URL, NEXT_PUBLIC_API_URL → same API)
 *
 * Run:
 *   cd frontend
 *   cp .env.e2e.example .env.e2e   # edit URLs / secrets
 *   npx playwright install chromium
 *   npm run test:e2e
 *
 * Strategy:
 *   - Browser: login → /pricing → Premium Monthly CTA → mock SePay form POST
 *   - API: simulate ORDER_PAID IPN → assert /me + /me/usage features
 *   - Browser: /payment/success polling until plan active
 *   - API: webhook idempotency + force-plan expiry → Free
 *
 * Telegram / payment_success alert coverage lives in premium-sepay-upgrade.test.ts
 * (requires DADIARY_E2E_SECRET so the API mounts the in-memory alert recorder).
 */

import { expect, test } from "@playwright/test";

import {
  assertPremiumFeatures,
  createCheckout,
  e2eForcePlanAvailable,
  fetchMe,
  fetchUsage,
  forcePlan,
  postSePayWebhook,
  registerFreeUser,
  waitForPlanTier,
} from "./helpers/api";
import {
  injectAccessToken,
  mockSePayFormSubmit,
  resolveCheckoutFromUi,
  selectBillingMonthly,
} from "./helpers/browser";
import { defaultPassword, e2eSecret } from "./helpers/env";
import { sleep } from "./helpers/retry";

test.describe.configure({ mode: "serial" });

test.describe("SePay sandbox smoke", () => {
  test("1) Free login → pricing → Premium Monthly → mock SePay → IPN → success poll → features", async ({
    page,
    request,
  }) => {
    // --- Arrange: Free user via API (avoids Turnstile on register UI) ---
    const session = await registerFreeUser(request, {
      password: defaultPassword(),
    });
    expect(session.planTier === "free" || session.planTier === "").toBeTruthy();

    const meFree = await fetchMe(request, session.accessToken);
    expect(meFree.plan_tier || "free").toBe("free");

    await injectAccessToken(page, session.accessToken, session.refreshToken);

    // --- Login UI path (smoke that /login works with same credentials) ---
    await page.goto("/login");
    await page.locator("#login-email").fill(session.email);
    await page.locator("#login-password").fill(session.password);
    await page.locator('button[type="submit"]').click();
    // After login we land on check-in (or stay if already tokenized).
    await page.waitForURL(/\/(check-in|routine|pricing)?/, { timeout: 20_000 });

    // --- Pricing: monthly Premium ---
    await page.goto("/pricing");
    await expect(page.getByTestId("pricing-card-premium")).toBeVisible();

    // Ensure monthly billing (default is monthly). Header + sticky bar both render toggles.
    await selectBillingMonthly(page);

    const sepay = await mockSePayFormSubmit(page);

    // Capture checkout API response for invoice / amount (source of truth).
    const checkoutRespPromise = page.waitForResponse(
      (r) =>
        r.url().includes("/api/v1/payment/sepay/checkout") && r.request().method() === "POST",
      { timeout: 30_000 },
    );

    await page.getByTestId("pricing-cta-premium").click();

    const checkoutResp = await checkoutRespPromise;
    expect(checkoutResp.ok(), `checkout status ${checkoutResp.status()}`).toBeTruthy();

    // Form should attempt SePay sandbox redirect (we abort it).
    const posted = await sepay.waitForCheckoutPost();
    expect(posted.url).toMatch(/sepay\.vn/);

    const { invoice, amountVnd, signature } = await resolveCheckoutFromUi({
      checkoutResp,
      posted,
    });
    expect(amountVnd).toBe(99_000);
    expect(
      posted.fields.order_invoice_number || posted.fields["order_invoice_number"],
    ).toBe(invoice);
    expect(signature || posted.fields.signature).toBeTruthy();

    // --- Simulate SePay success IPN (money settled) ---
    const ipn = await postSePayWebhook(request, {
      invoice,
      amountVnd,
    });
    expect(ipn.status).toBeLessThan(400);

    await waitForPlanTier(request, session.accessToken, "premium");

    // --- Success callback page polls /me until paid ---
    await page.goto("/payment/success");
    const result = page.getByTestId("payment-result-success");
    await expect(result).toBeVisible();
    // activating → active (or already active if poll is fast)
    await expect(result).toHaveAttribute("data-phase", /active|activating/, {
      timeout: 5_000,
    });
    await expect(result).toHaveAttribute("data-phase", "active", { timeout: 35_000 });

    // --- Verify entitlements ---
    const me = await fetchMe(request, session.accessToken);
    expect(me.plan_tier).toBe("premium");
    expect(me.plan_expires_at).toBeTruthy();

    const usage = await fetchUsage(request, session.accessToken);
    expect(usage.plan_tier).toBe("premium");
    assertPremiumFeatures(usage);
  });

  test("2) Cancel & error callback pages render", async ({ page, request }) => {
    const session = await registerFreeUser(request);
    await injectAccessToken(page, session.accessToken, session.refreshToken);

    await page.goto("/payment/cancel");
    await expect(page.getByTestId("payment-result-cancel")).toBeVisible();
    await expect(page.getByRole("heading")).toBeVisible();

    await page.goto("/payment/error");
    await expect(page.getByTestId("payment-result-error")).toBeVisible();
    await expect(page.getByRole("heading")).toBeVisible();

    // User remains Free (no IPN).
    const me = await fetchMe(request, session.accessToken);
    expect(me.plan_tier || "free").toBe("free");
  });

  test("3) Webhook idempotency — replay does not change plan / double-extend", async ({
    request,
  }) => {
    const session = await registerFreeUser(request);
    const checkout = await createCheckout(request, session.accessToken, {
      plan_tier: "premium",
      billing_interval: "monthly",
      locale: "vi",
    });

    const first = await postSePayWebhook(request, {
      invoice: checkout.invoice_number,
      amountVnd: checkout.amount_vnd,
      orderId: "idem-ord-1",
      txId: "idem-tx-1",
    });
    expect(first.status).toBeLessThan(400);

    const me1 = await waitForPlanTier(request, session.accessToken, "premium");
    const exp1 = me1.plan_expires_at;
    expect(exp1).toBeTruthy();

    // Tiny delay so a buggy double-extend would move the timestamp.
    await sleep(1100);

    const second = await postSePayWebhook(request, {
      invoice: checkout.invoice_number,
      amountVnd: checkout.amount_vnd,
      orderId: "idem-ord-1",
      txId: "idem-tx-1",
    });
    expect(second.status).toBeLessThan(400);

    const me2 = await fetchMe(request, session.accessToken);
    expect(me2.plan_tier).toBe("premium");
    expect(me2.plan_expires_at).toBe(exp1);
  });

  test("4) Plan expiry → effective Free (features locked)", async ({ request }) => {
    test.skip(
      !e2eSecret(),
      "Set E2E_SECRET / DADIARY_E2E_SECRET (and restart API) for expiry smoke",
    );
    test.skip(
      !(await e2eForcePlanAvailable(request)),
      "force-plan not mounted (expected on production — leave DADIARY_E2E_SECRET unset)",
    );

    const session = await registerFreeUser(request);
    const checkout = await createCheckout(request, session.accessToken, {
      plan_tier: "premium",
      billing_interval: "monthly",
    });
    await postSePayWebhook(request, {
      invoice: checkout.invoice_number,
      amountVnd: checkout.amount_vnd,
    });
    await waitForPlanTier(request, session.accessToken, "premium");

    // Force plan_expires_at past the grace window (default 3d) while leaving
    // stored tier as premium. Inside grace, EffectivePlanTier still returns Premium.
    const pastGrace = new Date(
      Date.now() - 4 * 24 * 60 * 60 * 1000,
    ).toISOString();
    await forcePlan(request, {
      email: session.email,
      planTier: "premium",
      planExpiresAt: pastGrace,
    });

    // Past grace → Free on /me immediately (no cron wait).
    const me = await fetchMe(request, session.accessToken);
    expect(me.plan_tier || "free").toBe("free");

    const usage = await fetchUsage(request, session.accessToken);
    expect(usage.is_premium).toBe(false);
    expect(usage.features?.wardrobe_full?.allowed).toBeFalsy();
    expect(usage.features?.export_data?.allowed).toBeFalsy();
  });
});
