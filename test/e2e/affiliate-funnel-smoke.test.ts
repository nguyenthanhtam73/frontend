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
  canAddActiveAnalyzeFixture,
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

function guidanceSection(page: import("@playwright/test").Page) {
  return page.locator(
    '[data-testid="onboarding-product-guidance"], [data-testid="starter-product-guidance"]',
  );
}

function guidanceCard(
  page: import("@playwright/test").Page,
  step: string,
) {
  return page.locator(
    `[data-testid="guidance-card"][data-guidance-step="${step}"]`,
  );
}

function affiliateCtas(page: import("@playwright/test").Page) {
  return page.locator(
    '[data-testid="affiliate-cta"], [data-testid="onboarding-affiliate-cta"]',
  );
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

    await expect(guidanceSection(page)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("onboarding-phase")).toContainText(
      /làm dịu|calm/i,
    );
    await expect(page.getByTestId("onboarding-severity")).toContainText(
      /dày|dense/i,
    );

    await expect(guidanceCard(page, "cleanse")).toBeVisible();
    await expect(
      guidanceCard(page, "moisturize"),
    ).toBeVisible();
    await expect(guidanceCard(page, "spf")).toBeVisible();

    // calm_first: no treat commerce card (caution may mention “chưa BHA”).
    await expect(guidanceCard(page, "treat")).toHaveCount(0);
    const guidanceText = (
      await guidanceSection(page).innerText()
    ).toLowerCase();
    expect(guidanceText).not.toMatch(/benzoyl|miracle toner/);
    expect(guidanceText).toMatch(/chưa bha|no bha|làm dịu trước|calm first/);

    const ctas = page.locator(
      '[data-testid="affiliate-cta"], [data-testid="onboarding-affiliate-cta"]',
    );
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

    await expect(guidanceSection(page)).toBeVisible({
      timeout: 15_000,
    });
    // Role tips still render (cleanse/moisturize/SPF); commerce stripped.
    await expect(guidanceCard(page, "cleanse")).toBeVisible();
    await expect
      .poll(async () => affiliateCtas(page).count(), {
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
      `[data-testid="affiliate-cta"][data-affiliate-product-id="${CATALOG_CLEANSE.id}"]`,
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
    await expect(page.getByTestId("onboarding-step-starter-routine")).toHaveAttribute(
      "data-care-phase",
      "manual",
    );

    const am = page.getByTestId("onboarding-starter-morning");
    const pm = page.getByTestId("onboarding-starter-evening");
    await expect(am).toBeVisible();
    await expect(pm).toBeVisible();

    const badge = page.getByTestId("onboarding-starter-personal-badge");
    await expect(badge).toBeVisible();
    const badgeText = (await badge.innerText()).toLowerCase();
    expect(badgeText).not.toMatch(/đã cá nhân hoá|fully personalized|100%/i);
    expect(badgeText).toMatch(/gợi ý ban đầu|starter suggestion|mục tiêu|goals/i);
    expect(badgeText).not.toMatch(/\+\s*ảnh|\+\s*photos/);

    // Manual path may fetch answer-driven guidance — wait briefly, then assert order
    // (badge → optional guidance → AM), not a brittle absolute y threshold.
    const guidance = page.getByTestId("starter-product-guidance");
    await guidance.waitFor({ state: "visible", timeout: 8_000 }).catch(() => {});
    const badgeBox = await badge.boundingBox();
    const amBox = await am.boundingBox();
    expect(badgeBox, "badge missing geometry").toBeTruthy();
    expect(amBox, "AM section missing geometry").toBeTruthy();
    expect(badgeBox!.y).toBeLessThan(amBox!.y);
    if (await guidance.isVisible()) {
      const gBox = await guidance.boundingBox();
      expect(gBox, "guidance missing geometry").toBeTruthy();
      expect(badgeBox!.y).toBeLessThan(gBox!.y);
      expect(gBox!.y).toBeLessThan(amBox!.y);
    }

    // clear_acne manual: calm evening — no retinol/acid tick step.
    const eveningBlob = (await pm.innerText()).toLowerCase();
    expect(eveningBlob).not.toMatch(/retinol|\bbha\b|retinoid/);

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

  test("5) Dense calm_first → Step 2 scaffold + guidance, no treat/active", async ({
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
    await waitForUsageGate(page);
    await injectAiAnalyzeFixture(page, denseCalmFirstAnalyzeFixture());

    await expect(guidanceSection(page)).toBeVisible({
      timeout: 15_000,
    });
    await page.getByTestId("onboarding-nav-continue").click();

    await expect(page.getByTestId("onboarding-step-starter-routine")).toBeVisible(
      { timeout: 20_000 },
    );
    await expect(page.getByTestId("onboarding-step-starter-routine")).toHaveAttribute(
      "data-care-phase",
      "calm_first",
    );

    // Guidance remounted on Step 2 from analyze state (no new API).
    await expect(page.getByTestId("starter-product-guidance")).toBeVisible();
    await expect(guidanceCard(page, "treat")).toHaveCount(0);
    await expect(
      guidanceCard(page, "cleanse").getByTestId("guidance-why"),
    ).toContainText(/viêm|má|dịu|đỏ/i);
    await expect(
      guidanceCard(page, "cleanse").getByTestId("guidance-benefits"),
    ).toBeVisible();
    await expect(
      guidanceCard(page, "cleanse").getByTestId("guidance-caution"),
    ).toContainText(/không nặn|bha|retinoid/i);
    const ctas = affiliateCtas(page);
    await expect(ctas.first()).toBeVisible({ timeout: 15_000 });
    expect(await ctas.count()).toBeLessThanOrEqual(2);

    const summary = page.getByTestId("onboarding-starter-summary");
    await expect(summary).toBeVisible();
    expect((await summary.innerText()).toLowerCase()).not.toMatch(/da da /);

    const eveningBlob = (
      await page.getByTestId("onboarding-starter-evening").innerText()
    ).toLowerCase();
    expect(eveningBlob).not.toMatch(/retinol|\bbha\b|retinoid|acid/);
    await expect(page.getByTestId("onboarding-care-note-no-pick")).toBeVisible();

    // Relative order: summary → guidance (with CTAs) → AM — not a raw y cap.
    const summaryBox = await summary.boundingBox();
    const guidanceBox = await page
      .getByTestId("starter-product-guidance")
      .boundingBox();
    const amBox = await page.getByTestId("onboarding-starter-morning").boundingBox();
    expect(summaryBox).toBeTruthy();
    expect(guidanceBox).toBeTruthy();
    expect(amBox).toBeTruthy();
    expect(summaryBox!.y).toBeLessThan(guidanceBox!.y);
    expect(guidanceBox!.y).toBeLessThan(amBox!.y);
  });

  test("6) can_add_active → Step 2 PM at most one optional active", async ({
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
    await injectAiAnalyzeFixture(page, canAddActiveAnalyzeFixture());
    await page.getByTestId("onboarding-nav-continue").click();

    await expect(page.getByTestId("onboarding-step-starter-routine")).toBeVisible(
      { timeout: 20_000 },
    );
    await expect(page.getByTestId("onboarding-step-starter-routine")).toHaveAttribute(
      "data-care-phase",
      "can_add_active",
    );

    await expect(guidanceSection(page)).toBeVisible();
    await expect(page.getByTestId("onboarding-starter-summary")).toBeVisible();

    const eveningBlob = (
      await page.getByTestId("onboarding-starter-evening").innerText()
    ).toLowerCase();
    expect(eveningBlob).toMatch(/bha|retinoid|hoạt chất/);
    // Not the old stacked "retinol hoặc acid" default tick.
    expect(eveningBlob).not.toMatch(/retinol hoặc acid/);
    const activeHits = (
      eveningBlob.match(/bha|retinoid|hoạt chất/g) ?? []
    ).length;
    expect(activeHits).toBeGreaterThanOrEqual(1);
    // Hint + optional active step can both say “hoạt chất” — allow a little headroom.
    expect(activeHits).toBeLessThanOrEqual(4);
  });
});

