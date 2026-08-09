/**
 * Affiliate + product-guidance funnel smoke (Playwright).
 *
 * Prerequisites: API + Next already running (see README-SMOKE.txt).
 * Run: npm run test:e2e -- affiliate-funnel-smoke
 *
 * Fixtures:
 * - Free: registerFreeUser() (no force-plan)
 * - Premium no_ads: registerFreeUser() + forcePlan(plan_tier=premium) + E2E_SECRET
 * - Dense calm_first: injectAiAnalyzeFixture (dev window.__DADIARY_E2E__) — no photo upload
 * - Admin metrics: E2E_ADMIN_EMAIL must be in API DADIARY_ADMIN_EMAILS
 */

import { expect, test } from "@playwright/test";

import {
  e2eAdminEmail,
  fetchAffiliateMetrics,
  injectAiAnalyzeFixture,
  registerOrLoginAdminUser,
  skuClicksTotal,
} from "./helpers/affiliate";
import {
  ALLOWED_AFFILIATE_HOST_RE,
  CATALOG_CLEANSE,
  denseCalmFirstAnalyzeFixture,
} from "./helpers/affiliate-fixture";
import {
  forcePlan,
  registerFreeUser,
} from "./helpers/api";
import {
  injectAccessToken,
  injectSkipFaceCapture,
} from "./helpers/browser";
import { defaultPassword, e2eSecret } from "./helpers/env";

test.describe.configure({ mode: "serial" });

async function landOnStep1WithGoals(page: import("@playwright/test").Page) {
  await page.goto("/onboarding");
  await expect(page.getByTestId("onboarding-step-skin-profile")).toBeVisible({
    timeout: 20_000,
  });
  await page.getByTestId("onboarding-goal-clear_acne").click();
  await page.getByTestId("onboarding-concern-acne").click();
}

/** Wait until /me/usage settles so Free CTAs / Premium hideCommerce are stable. */
async function waitForUsageGate(page: import("@playwright/test").Page) {
  await page
    .waitForResponse(
      (r) =>
        r.url().includes("/api/v1/me/usage") &&
        r.request().method() === "GET" &&
        r.ok(),
      { timeout: 20_000 },
    )
    .catch(() => {
      /* already cached / raced before listener */
    });
}

test.describe("Affiliate funnel smoke", () => {
  test("1) Free + dense calm_first → guidance, ≤2 Shopee CTAs, catalog hosts only", async ({
    page,
    request,
  }) => {
    test.setTimeout(120_000);
    const session = await registerFreeUser(request, {
      password: defaultPassword(),
    });
    await injectAccessToken(page, session.accessToken, session.refreshToken);
    await injectSkipFaceCapture(page, true);

    await landOnStep1WithGoals(page);
    await waitForUsageGate(page);
    await injectAiAnalyzeFixture(page, denseCalmFirstAnalyzeFixture());

    await expect(page.getByTestId("onboarding-product-guidance")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("onboarding-phase")).toContainText(
      /làm dịu|calm/i,
    );
    await expect(page.getByTestId("onboarding-severity")).toContainText(
      /dày|dense/i,
    );

    await expect(page.getByTestId("onboarding-guidance-cleanse")).toBeVisible();
    await expect(
      page.getByTestId("onboarding-guidance-moisturize"),
    ).toBeVisible();
    await expect(page.getByTestId("onboarding-guidance-spf")).toBeVisible();

    // calm_first: no treat / BHA / BP step cards
    await expect(page.getByTestId("onboarding-guidance-treat")).toHaveCount(0);
    const guidanceText = (
      await page.getByTestId("onboarding-product-guidance").innerText()
    ).toLowerCase();
    expect(guidanceText).not.toMatch(/\bbha\b/);
    expect(guidanceText).not.toMatch(/\bbp\b|benzoyl/);

    const ctas = page.getByTestId("onboarding-affiliate-cta");
    await expect(ctas.first()).toBeVisible({ timeout: 20_000 });
    const ctaCount = await ctas.count();
    expect(ctaCount).toBeGreaterThan(0);
    expect(ctaCount).toBeLessThanOrEqual(2);

    for (let i = 0; i < ctaCount; i++) {
      const href = (await ctas.nth(i).getAttribute("href")) || "";
      expect(href, `CTA[${i}] must be catalog s.shopee`).toMatch(
        ALLOWED_AFFILIATE_HOST_RE,
      );
      expect(href).not.toMatch(/example\.com|fake|localhost/i);
    }
  });

  test("2) Premium no_ads → no Shopee CTA / no brand commerce cards", async ({
    page,
    request,
  }) => {
    test.setTimeout(120_000);
    test.skip(!e2eSecret(), "E2E_SECRET required for forcePlan → Premium");

    const session = await registerFreeUser(request, {
      password: defaultPassword(),
    });
    await forcePlan(request, {
      email: session.email,
      planTier: "premium",
      planExpiresAt: null,
    });

    await injectAccessToken(page, session.accessToken, session.refreshToken);
    await injectSkipFaceCapture(page, true);

    await landOnStep1WithGoals(page);
    await waitForUsageGate(page);
    await injectAiAnalyzeFixture(page, denseCalmFirstAnalyzeFixture());

    await expect(page.getByTestId("onboarding-product-guidance")).toBeVisible({
      timeout: 15_000,
    });
    // Role tips still render (cleanse/moisturize/SPF); commerce stripped.
    await expect(page.getByTestId("onboarding-guidance-cleanse")).toBeVisible();
    await expect
      .poll(async () => page.getByTestId("onboarding-affiliate-cta").count(), {
        timeout: 8_000,
        intervals: [200, 400, 800],
      })
      .toBe(0);
    await expect(page.getByText(/xem trên shopee/i)).toHaveCount(0);
    await expect(page.getByText(/CeraVe/i)).toHaveCount(0);
    await expect(page.getByText(/Biore/i)).toHaveCount(0);
  });

  test("3) Click Shopee CTA → POST clicks + admin metrics product_id", async ({
    page,
    request,
  }) => {
    test.setTimeout(120_000);
    test.skip(
      !e2eAdminEmail(),
      "Set E2E_ADMIN_EMAIL (in DADIARY_ADMIN_EMAILS) for admin metrics",
    );

    const admin = await registerOrLoginAdminUser(request);
    const before = await fetchAffiliateMetrics(request, admin.accessToken);
    const beforeClicks = skuClicksTotal(before, CATALOG_CLEANSE.id);

    const session = await registerFreeUser(request, {
      password: defaultPassword(),
    });
    await injectAccessToken(page, session.accessToken, session.refreshToken);
    await injectSkipFaceCapture(page, true);

    await landOnStep1WithGoals(page);
    await injectAiAnalyzeFixture(page, denseCalmFirstAnalyzeFixture());

    const cta = page.locator(
      `[data-testid="onboarding-affiliate-cta"][data-affiliate-product-id="${CATALOG_CLEANSE.id}"]`,
    );
    await expect(cta).toBeVisible({ timeout: 15_000 });
    await expect(cta).toHaveAttribute("data-affiliate-source", "starter_routine");

    const clickReq = page.waitForRequest(
      (r) =>
        r.url().includes("/api/v1/affiliate/clicks") &&
        r.method() === "POST",
      { timeout: 20_000 },
    );
    const clickResp = page.waitForResponse(
      (r) =>
        r.url().includes("/api/v1/affiliate/clicks") &&
        r.request().method() === "POST",
      { timeout: 20_000 },
    );

    // Prevent leaving the app / opening Shopee tab mid-assert.
    await page.route(/s\.shopee\.vn/, async (route) => {
      await route.abort("blockedbyclient");
    });

    await cta.click();
    const req = await clickReq;
    const resp = await clickResp;
    expect(resp.ok(), `affiliate/clicks ${resp.status()}`).toBeTruthy();

    const body = req.postDataJSON() as {
      source?: string;
      affiliate_link?: string;
      product_name?: string;
      brand?: string;
    };
    expect(body.source).toBe("starter_routine");
    expect(body.affiliate_link).toMatch(ALLOWED_AFFILIATE_HOST_RE);
    expect(body.brand?.toLowerCase()).toContain("cerave");

    // Admin metrics aggregate by SKU (source verified on POST body above).
    await expect
      .poll(
        async () => {
          const after = await fetchAffiliateMetrics(
            request,
            admin.accessToken,
          );
          return skuClicksTotal(after, CATALOG_CLEANSE.id);
        },
        { timeout: 15_000, intervals: [300, 600, 1000] },
      )
      .toBeGreaterThan(beforeClicks);
  });

  test("4) Step 2 mobile → AM/PM early, badge not overclaim, no-pick is note", async ({
    page,
    request,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });

    const session = await registerFreeUser(request, {
      password: defaultPassword(),
    });
    await injectAccessToken(page, session.accessToken, session.refreshToken);
    await injectSkipFaceCapture(page, true);

    await landOnStep1WithGoals(page);
    await page.getByTestId("onboarding-continue-without-photos").click();

    await expect(page.getByTestId("onboarding-step-starter-routine")).toBeVisible(
      { timeout: 20_000 },
    );

    const am = page.getByTestId("onboarding-starter-morning");
    const pm = page.getByTestId("onboarding-starter-evening");
    await expect(am).toBeVisible();
    await expect(pm).toBeVisible();

    // AM/PM should win the first viewport (header is compact; rationale is collapsed).
    const amBox = await am.boundingBox();
    expect(amBox, "AM section missing geometry").toBeTruthy();
    expect(amBox!.y).toBeLessThan(420);

    const badge = page.getByTestId("onboarding-starter-personal-badge");
    await expect(badge).toBeVisible();
    const badgeText = (await badge.innerText()).toLowerCase();
    expect(badgeText).not.toMatch(/đã cá nhân hoá|fully personalized|100%/i);
    expect(badgeText).toMatch(/gợi ý ban đầu|starter suggestion|mục tiêu|goals/i);

    // "Không nặn" is a care note, not a tickable starter step.
    await expect(page.getByTestId("onboarding-care-note-no-pick")).toBeVisible();
    const noteText = await page
      .getByTestId("onboarding-care-note-no-pick")
      .innerText();
    expect(noteText.toLowerCase()).toMatch(/không nặn|don.?t pick|don’t pick/);

    const stepTexts = await page
      .locator('[data-testid^="onboarding-starter-step-"]')
      .allInnerTexts();
    for (const t of stepTexts) {
      expect(t.toLowerCase()).not.toMatch(/không nặn/);
    }
    await expect(
      page.locator(
        '[data-testid^="onboarding-starter-step-"] input[type="checkbox"]',
      ),
    ).toHaveCount(0);
  });
});
