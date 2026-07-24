/**
 * One-shot prod smoke: register 3 Free users → Premium Monthly via mock SePay IPN.
 *
 *   E2E_WEB_URL=https://dadiary.vn \
 *   E2E_API_URL=https://api.dadiary.vn \
 *   E2E_SEPAY_SECRET_KEY=... \
 *   npm run test:e2e -- prod-register-upgrade-3
 */

import { expect, test } from "@playwright/test";

import {
  assertPremiumFeatures,
  createCheckout,
  fetchMe,
  fetchUsage,
  postSePayWebhook,
  registerFreeUser,
  waitForPlanTier,
} from "./helpers/api";
import { defaultPassword } from "./helpers/env";

const COUNT = 3;

test.describe.configure({ mode: "serial" });

test("register + upgrade Premium Monthly × 3 on production", async ({
  request,
}) => {
  const password = defaultPassword();
  const stamp = Date.now().toString(36);
  const results: Array<{
    n: number;
    email: string;
    password: string;
    userId: string;
    invoice: string;
    plan_tier: string;
    plan_expires_at?: string;
    is_premium: boolean;
  }> = [];

  for (let i = 1; i <= COUNT; i++) {
    const email = `prem.prod.${stamp}.${i}@e2e.dadiary.test`;

    // 1) Register Free
    const session = await registerFreeUser(request, { email, password });
    expect(session.email).toBe(email);
    expect(session.planTier === "free" || session.planTier === "").toBeTruthy();

    const meFree = await fetchMe(request, session.accessToken);
    expect(meFree.plan_tier || "free").toBe("free");

    // 2) Checkout Premium Monthly
    const checkout = await createCheckout(request, session.accessToken, {
      plan_tier: "premium",
      billing_interval: "monthly",
      locale: "vi",
    });
    expect(checkout.amount_vnd).toBe(99_000);
    expect(checkout.invoice_number).toBeTruthy();

    // 3) Mock SePay ORDER_PAID IPN
    const ipn = await postSePayWebhook(request, {
      invoice: checkout.invoice_number,
      amountVnd: checkout.amount_vnd,
      orderId: `prod3-ord-${stamp}-${i}`,
      txId: `prod3-tx-${stamp}-${i}`,
    });
    expect(ipn.status).toBeLessThan(400);

    // 4) Assert Premium + features
    const me = await waitForPlanTier(request, session.accessToken, "premium");
    expect(me.plan_tier).toBe("premium");
    expect(me.plan_expires_at).toBeTruthy();

    const usage = await fetchUsage(request, session.accessToken);
    expect(usage.plan_tier).toBe("premium");
    assertPremiumFeatures(usage);

    results.push({
      n: i,
      email,
      password,
      userId: session.userId || me.id,
      invoice: checkout.invoice_number,
      plan_tier: me.plan_tier || "premium",
      plan_expires_at: me.plan_expires_at,
      is_premium: usage.is_premium,
    });

    // eslint-disable-next-line no-console
    console.log(
      `[${i}/${COUNT}] OK ${email} → premium expires=${me.plan_expires_at} invoice=${checkout.invoice_number}`,
    );
  }

  expect(results).toHaveLength(COUNT);
  // eslint-disable-next-line no-console
  console.log("\n=== 3 Premium accounts ready ===");
  for (const r of results) {
    // eslint-disable-next-line no-console
    console.log(
      `#${r.n} email=${r.email} password=${r.password} plan=${r.plan_tier} expires=${r.plan_expires_at}`,
    );
  }
});
