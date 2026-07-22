/**
 * Premium upgrade via SePay Sandbox — full Playwright flow + Telegram alert capture.
 *
 * Flow under test:
 *   Login Free → /pricing → Premium Monthly → mock SePay checkout POST
 *   → simulate ORDER_PAID IPN → assert plan / features / success page
 *   → assert payment_success alert (in-memory recorder = Telegram path)
 *   → replay IPN (idempotency — no double-extend)
 *
 * Prerequisites:
 *   - API + Next running (see README-SMOKE.txt)
 *   - DADIARY_E2E_SECRET on API (= E2E_SECRET in .env.e2e) so alert recorder mounts
 *   - SePay sandbox secret matches E2E_SEPAY_SECRET_KEY
 *
 * Run:
 *   npm run test:e2e -- premium-sepay-upgrade
 */

import { expect, test } from "@playwright/test";

import {
  assertPlanExpiresInDays,
  assertPremiumFeatures,
  clearE2EAlerts,
  createCheckout,
  e2eAlertsAvailable,
  fetchE2EAlerts,
  fetchMe,
  fetchUsage,
  postSePayWebhook,
  registerFreeUser,
  waitForPaymentSuccessAlert,
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

test.describe("Premium SePay upgrade + Telegram alert", () => {
  test.beforeEach(async ({ request }) => {
    test.skip(
      !e2eSecret(),
      "Set E2E_SECRET and DADIARY_E2E_SECRET (same value) so /internal/e2e/alerts is available",
    );
    // Production must keep DADIARY_E2E_SECRET unset — skip instead of 404 mid-test.
    const available = await e2eAlertsAvailable(request);
    test.skip(
      !available,
      "API /internal/e2e/alerts not mounted (expected on production)",
    );
  });

  test("Free → Premium Monthly checkout → IPN → success poll → features → Telegram alert", async ({
    page,
    request,
  }) => {
    // Fresh buffer so we only see alerts from this case.
    await clearE2EAlerts(request);

    // --- Arrange: Free user (API register skips Turnstile) ---
    const session = await registerFreeUser(request, {
      password: defaultPassword(),
    });
    expect(session.planTier === "free" || session.planTier === "").toBeTruthy();

    await injectAccessToken(page, session.accessToken);

    // --- Login UI (session cookies / client store) ---
    await page.goto("/login");
    await page.locator("#login-email").fill(session.email);
    await page.locator("#login-password").fill(session.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/(check-in|routine|pricing)?/, { timeout: 20_000 });

    // --- Pricing: Premium Monthly ---
    await page.goto("/pricing");
    await expect(page.getByTestId("pricing-card-premium")).toBeVisible();
    await selectBillingMonthly(page);

    const sepay = await mockSePayFormSubmit(page);
    const checkoutRespPromise = page.waitForResponse(
      (r) =>
        r.url().includes("/api/v1/payment/sepay/checkout") &&
        r.request().method() === "POST",
      { timeout: 30_000 },
    );

    const beforeCheckout = Date.now();
    await page.getByTestId("pricing-cta-premium").click();

    const checkoutResp = await checkoutRespPromise;
    expect(checkoutResp.ok(), `checkout ${checkoutResp.status()}`).toBeTruthy();

    // Mocked SePay form POST (no real redirect).
    const posted = await sepay.waitForCheckoutPost();
    expect(posted.url).toMatch(/sepay\.vn/);

    const { invoice, amountVnd } = await resolveCheckoutFromUi({
      checkoutResp,
      posted,
    });
    expect(amountVnd).toBe(99_000);
    expect(
      posted.fields.order_invoice_number || posted.fields["order_invoice_number"],
    ).toBe(invoice);

    // --- Simulate SePay ORDER_PAID (sandbox IPN) ---
    const ipn = await postSePayWebhook(request, {
      invoice,
      amountVnd,
    });
    expect(ipn.status).toBeLessThan(400);

    await waitForPlanTier(request, session.accessToken, "premium");

    // --- Success page polls /me until active ---
    await page.goto("/payment/success");
    const result = page.getByTestId("payment-result-success");
    await expect(result).toBeVisible();
    await expect(result).toHaveAttribute("data-phase", /active|activating/, {
      timeout: 5_000,
    });
    await expect(result).toHaveAttribute("data-phase", "active", {
      timeout: 35_000,
    });

    // --- Plan + ~30d expiry ---
    const me = await fetchMe(request, session.accessToken);
    expect(me.plan_tier).toBe("premium");
    assertPlanExpiresInDays(me.plan_expires_at, 30, {
      from: new Date(beforeCheckout),
      toleranceHours: 3,
    });

    // --- Features: wardrobe, AI unlimited, export ---
    const usage = await fetchUsage(request, session.accessToken);
    expect(usage.plan_tier).toBe("premium");
    assertPremiumFeatures(usage);

    // --- Telegram path: in-memory recorder (same Event Fanout would send) ---
    const alert = await waitForPaymentSuccessAlert(request, {
      invoice,
      amountVnd,
      email: session.email,
    });
    expect(alert.key).toBe("payment_success");
    expect(alert.message).toMatch(/nâng cấp/i);
    expect(alert.message).toContain(String(amountVnd));
    // Prefer email in message when lookup succeeds; user_id is acceptable fallback.
    expect(
      (alert.message || "").includes(session.email) ||
        (alert.fields?.user_id as string)?.length > 0,
    ).toBeTruthy();
  });

  test("IPN replay is idempotent — expiry not double-extended + no second success alert required", async ({
    request,
  }) => {
    await clearE2EAlerts(request);

    const session = await registerFreeUser(request);
    const checkout = await createCheckout(request, session.accessToken, {
      plan_tier: "premium",
      billing_interval: "monthly",
      locale: "vi",
    });

    const first = await postSePayWebhook(request, {
      invoice: checkout.invoice_number,
      amountVnd: checkout.amount_vnd,
      orderId: "prem-idem-ord",
      txId: "prem-idem-tx",
    });
    expect(first.status).toBeLessThan(400);

    const me1 = await waitForPlanTier(request, session.accessToken, "premium");
    const exp1 = me1.plan_expires_at;
    expect(exp1).toBeTruthy();
    assertPlanExpiresInDays(exp1, 30, { toleranceHours: 3 });

    const alertsAfterFirst = await waitForPaymentSuccessAlert(request, {
      invoice: checkout.invoice_number,
      amountVnd: checkout.amount_vnd,
    });
    expect(alertsAfterFirst).toBeTruthy();

    await sleep(1100);

    const second = await postSePayWebhook(request, {
      invoice: checkout.invoice_number,
      amountVnd: checkout.amount_vnd,
      orderId: "prem-idem-ord",
      txId: "prem-idem-tx",
    });
    expect(second.status).toBeLessThan(400);

    const me2 = await fetchMe(request, session.accessToken);
    expect(me2.plan_tier).toBe("premium");
    expect(me2.plan_expires_at).toBe(exp1);

    // Idempotent IPN skips notifyPaymentSuccess — still exactly one success alert.
    const afterReplay = await fetchE2EAlerts(request, {
      key: "payment_success",
      invoice: checkout.invoice_number,
    });
    expect(afterReplay.length).toBe(1);
  });
});
