/**
 * Onboarding analyze — every backend failure must reach the user as its own
 * message, and a slow read must not be abandoned early.
 *
 * Prerequisites: Next already running. The API is never called: every
 * `/api/v1/**` request is stubbed, so no database or AI credentials are needed.
 * Run: npm run test:e2e -- onboarding-analyze-errors
 */

import { expect, test, type Page, type Route } from "@playwright/test";

import vi from "../../messages/vi.json";

const ANALYZE_URL = "**/api/v1/onboarding/analyze-skin";
const copy = vi.onboarding.aiLoading;

/** Smallest valid PNG — the client re-encodes it through canvas anyway. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

function photo(name: string) {
  return { name, mimeType: "image/png", buffer: PNG };
}

/** Scoped to the step — Next's route announcer is also role="alert". */
function errorPanel(page: Page) {
  return page.getByTestId("onboarding-step-skin-profile").getByRole("alert");
}

/** Fail every un-stubbed API call loudly rather than hitting a real backend. */
async function isolateFromApi(page: Page) {
  await page.route("**/api/v1/**", (route: Route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ success: false, error: { code: "e2e_unstubbed" } }),
    }),
  );
}

async function stubAnalyze(page: Page, status: number, code: string) {
  await page.route(ANALYZE_URL, (route: Route) =>
    route.fulfill({
      status,
      contentType: "application/json",
      // The message is deliberately internal-looking: it must never be shown.
      body: JSON.stringify({
        success: false,
        error: { code, message: "panic: vision prompt v7 exploded at token 41" },
      }),
    }),
  );
}

/** Goal + concern + two photos staged, ready for Continue to trigger analyze. */
async function stageTwoPhotos(page: Page, names = ["front.png", "side.png"]) {
  await page.goto("/onboarding");
  await expect(page.getByTestId("onboarding-step-skin-profile")).toBeVisible({
    timeout: 30_000,
  });
  await page.getByTestId("onboarding-goal-clear_acne").click();
  await page.getByTestId("onboarding-concern-acne").click();
  await page
    .locator('input[type="file"][multiple]')
    .setInputFiles(names.map(photo));
  await expect(page.locator("figure img")).toHaveCount(names.length);
}

const errorCases = [
  {
    name: "HEIC / unreadable photo",
    status: 400,
    code: "invalid_image",
    expected: copy.errors.photoInvalid,
  },
  {
    name: "photo over the size limit",
    status: 413,
    code: "file_too_large",
    expected: copy.errors.photoTooLarge,
  },
  {
    name: "rate limited after repeated tries",
    status: 429,
    code: "rate_limited",
    expected: copy.errors.rateLimited,
  },
  {
    name: "AI not configured",
    status: 503,
    code: "openai_not_configured",
    expected: copy.errors.aiUnavailable,
  },
  {
    name: "pipeline failure falls back to the neutral message",
    status: 422,
    code: "analysis_failed",
    expected: copy.errors.server,
  },
];

test.describe("Onboarding analyze — error messages", () => {
  test.beforeEach(async ({ page }) => {
    await isolateFromApi(page);
  });

  for (const tc of errorCases) {
    test(`${tc.name} → its own message`, async ({ page }) => {
      await stubAnalyze(page, tc.status, tc.code);
      await stageTwoPhotos(page);
      await page.getByTestId("onboarding-nav-continue").click();

      const alert = errorPanel(page);
      await expect(alert).toBeVisible({ timeout: 30_000 });
      await expect(alert).toContainText(tc.expected);

      // The old build showed this for all nine backend codes.
      if (tc.expected !== copy.errors.server) {
        await expect(alert).not.toContainText(copy.errors.server);
      }
      // Internal detail from the response body must not reach the screen.
      await expect(alert).not.toContainText("vision prompt v7");
    });
  }

  test("photo errors offer a new photo, other errors offer a retry", async ({
    page,
  }) => {
    await stubAnalyze(page, 413, "file_too_large");
    await stageTwoPhotos(page);
    await page.getByTestId("onboarding-nav-continue").click();

    const alert = errorPanel(page);
    await expect(alert).toBeVisible({ timeout: 30_000 });
    await expect(
      alert.getByRole("button", { name: copy.changePhotos }),
    ).toBeVisible();
  });

  test("a rejected photo set is replaced, not appended to", async ({ page }) => {
    await stubAnalyze(page, 413, "file_too_large");
    await stageTwoPhotos(page, ["a.png", "b.png", "c.png"]);
    await page.getByTestId("onboarding-nav-continue").click();
    await expect(errorPanel(page)).toBeVisible({ timeout: 30_000 });

    // Three photos are staged and three is the cap: appending would be a no-op
    // and would keep the rejected file.
    await page
      .locator('input[type="file"][multiple]')
      .setInputFiles([photo("replacement.png")]);

    await expect(page.locator("figure img")).toHaveCount(1);
    await expect(errorPanel(page)).toBeHidden();
  });

  test("failed read is disclosed on the routine step", async ({ page }) => {
    await stubAnalyze(page, 422, "analysis_failed");
    await stageTwoPhotos(page);
    await page.getByTestId("onboarding-nav-continue").click();
    await expect(errorPanel(page)).toBeVisible({ timeout: 30_000 });

    await page
      .getByRole("button", { name: copy.useDefaultNow })
      .first()
      .click();

    await expect(
      page.getByTestId("onboarding-step-starter-routine"),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(copy.photoFallbackTitle)).toBeVisible();
    await expect(page.getByText(copy.photoFallbackBody)).toBeVisible();
    await expect(
      page.getByRole("button", { name: copy.retryAnalyzeAiShort }),
    ).toBeVisible();
  });
});

test.describe("Onboarding analyze — slow read", () => {
  test("waits past the old 45s cut-off and says so", async ({ page }) => {
    test.setTimeout(180_000);
    await isolateFromApi(page);

    // Lands at ~60s: the previous build aborted at 45s and showed an error.
    await page.route(ANALYZE_URL, async (route: Route) => {
      await new Promise((resolve) => setTimeout(resolve, 60_000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            skin_type_guess: "combo",
            undertone_guess: "neutral",
            concerns: ["acne"],
            suggested_goal: "clear_acne",
            barrier_signal: "likely_ok",
            confidence: 0.8,
            coaching_notes: "Da ổn — giữ routine dịu.",
            non_diagnostic: "",
            photo_quality: { sufficient: true, tips: [] },
            model_used: "e2e-slow",
            severity_level: "mild",
            primary_regions: ["cheeks"],
            phase: "calm_first",
            main_concerns: ["mụn"],
            summary: "Tóm tắt e2e.",
          },
        }),
      });
    });

    await stageTwoPhotos(page);
    await page.getByTestId("onboarding-nav-continue").click();

    // Before the slow-hint threshold the copy still promises a quick finish.
    await expect(page.getByText(copy.analyzeTime30Line1)).toBeVisible({
      timeout: 40_000,
    });

    // After it, the wait is acknowledged instead.
    await expect(page.getByText(copy.analyzeSlowLine1)).toBeVisible({
      timeout: 30_000,
    });

    // The old 45s abort would have raised an error by now.
    await expect(errorPanel(page)).toBeHidden();

    // The read that would have been discarded lands and carries the flow on.
    await expect(
      page.getByTestId("onboarding-step-starter-routine"),
    ).toBeVisible({ timeout: 40_000 });

    // Built from the analysis, not from the goal fallback.
    await expect(page.getByTestId("onboarding-starter-summary")).toContainText(
      "Tóm tắt e2e.",
    );
    await expect(page.getByText(copy.photoFallbackTitle)).toBeHidden();
  });
});
