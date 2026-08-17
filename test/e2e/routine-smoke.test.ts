/**
 * Routine page smoke (Playwright) — save/tick persistence, dirty refresh, carried-over banner.
 *
 * Prerequisites: API + Next running (see README-SMOKE.txt).
 * Run: npm run test:e2e -- routine-smoke
 */

import { expect, test } from "@playwright/test";

import {
  completeOnboardingViaApi,
  registerFreeUser,
  seedRoutineCarriedOverFixture,
  upsertRoutineViaApi,
} from "./helpers/api";
import { injectAccessToken } from "./helpers/browser";
import { defaultPassword, e2eSecret } from "./helpers/env";

test.describe.configure({ mode: "serial" });

const ROUTINE_STEPS = {
  morning: [{ id: "e2e-m1", title: "E2E Cleanser AM", category: "cleanser", completed: false }],
  evening: [{ id: "e2e-e1", title: "E2E Moist PM", category: "moisturizer", completed: false }],
};

async function openRoutineAuthenticated(
  page: import("@playwright/test").Page,
  token: string,
  refreshToken?: string,
) {
  await injectAccessToken(page, token, refreshToken);
  await page.goto("/routine");
  await expect(page.getByTestId("routine-section-morning")).toBeVisible({ timeout: 20_000 });
}

test.describe("Routine smoke", () => {
  test("A) first save + tick persists after reload", async ({ page, request }) => {
    const session = await registerFreeUser(request, { password: defaultPassword() });
    await completeOnboardingViaApi(request, session.accessToken, {
      morning: ["E2E Cleanser AM"],
      evening: ["E2E Moist PM"],
    });

    await openRoutineAuthenticated(page, session.accessToken, session.refreshToken);
    await expect(page.getByTestId("routine-first-save-banner")).toBeVisible({
      timeout: 10_000,
    });

    const tick = page.getByTestId("routine-step-tick-morning-0");
    await page.getByTestId("routine-save").click();
    await expect(page.getByTestId("routine-first-save-banner")).toHaveCount(0, {
      timeout: 15_000,
    });

    await tick.click();
    await expect(tick).toHaveAttribute("aria-pressed", "true");
    await page.waitForTimeout(1_500);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("routine-section-morning")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("routine-step-tick-morning-0")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("B) dirty structural edit is lost on refresh before Save", async ({ page, request }) => {
    const session = await registerFreeUser(request, { password: defaultPassword() });
    await upsertRoutineViaApi(request, session.accessToken, {
      ...ROUTINE_STEPS,
      save_kind: "manual_edit",
      skill_mode: "beginner",
    });

    await openRoutineAuthenticated(page, session.accessToken, session.refreshToken);
    await page.getByTestId("routine-save").click();
    await expect(page.getByTestId("routine-first-save-banner")).toHaveCount(0, {
      timeout: 15_000,
    });

    const title = page.getByTestId("routine-step-title-morning-0");
    await title.fill("Dirty rename should vanish");
    await expect(page.getByTestId("routine-save")).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("routine-section-morning")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("routine-step-title-morning-0")).toHaveValue("E2E Cleanser AM");
  });

  test("C) carried-over shows FirstSaveBanner until Save", async ({ page, request }) => {
    test.skip(!e2eSecret(), "E2E_SECRET required for carried-over fixture");

    const session = await registerFreeUser(request, { password: defaultPassword() });
    await seedRoutineCarriedOverFixture(request, session.email);

    await openRoutineAuthenticated(page, session.accessToken, session.refreshToken);
    await expect(page.getByTestId("routine-first-save-banner")).toBeVisible({
      timeout: 10_000,
    });

    await page.getByTestId("routine-save").click();
    await expect(page.getByTestId("routine-first-save-banner")).toHaveCount(0, {
      timeout: 15_000,
    });
  });

  test("D) dirty in-app nav prompts; Cancel stays, OK leaves", async ({ page, request }) => {
    const session = await registerFreeUser(request, { password: defaultPassword() });
    await upsertRoutineViaApi(request, session.accessToken, {
      ...ROUTINE_STEPS,
      save_kind: "manual_edit",
      skill_mode: "beginner",
    });

    await openRoutineAuthenticated(page, session.accessToken, session.refreshToken);
    await page.getByTestId("routine-save").click();
    await expect(page.getByTestId("routine-first-save-banner")).toHaveCount(0, {
      timeout: 15_000,
    });

    await page.getByTestId("routine-step-title-morning-0").fill("Dirty nav guard");
    await expect(page.getByTestId("routine-save")).toBeVisible();

    const checkInNav = page.getByRole("link", { name: /check-in|ghi nhật ký/i });

    page.once("dialog", (dialog) => {
      expect(dialog.type()).toBe("confirm");
      void dialog.dismiss();
    });
    await checkInNav.click();
    await expect(page).toHaveURL(/\/routine/, { timeout: 5_000 });

    page.once("dialog", (dialog) => {
      expect(dialog.type()).toBe("confirm");
      void dialog.accept();
    });
    await checkInNav.click();
    await page.waitForURL(/\/check-in/, { timeout: 15_000 });
  });
});
