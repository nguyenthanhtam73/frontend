/**
 * Onboarding smoke (Playwright) — P1 persist edited starter + P2 login gate / skip.
 *
 * Prerequisites: API + Next already running (see README-SMOKE.txt).
 * Run: npm run test:e2e -- onboarding-smoke
 *
 * Users:
 * - Incomplete: registerFreeUser() with no complete call (onboarding_completed=false)
 * - Complete: registerFreeUser() + completeOnboardingViaApi()
 */

import { expect, test } from "@playwright/test";

import {
  assertSnapshotContainsEditedSteps,
  completeOnboardingViaApi,
  fetchMe,
  fetchSkinProfile,
  registerFreeUser,
} from "./helpers/api";
import {
  injectAccessToken,
  injectSkipFaceCapture,
  loginViaUi,
} from "./helpers/browser";
import { defaultPassword } from "./helpers/env";
import { completeOnboardingViaUi } from "./helpers/onboarding";

test.describe.configure({ mode: "serial" });

test.describe("Onboarding smoke (P1 + P2)", () => {
  test("1a) Edit starter (token inject) → API snapshot + /routine persist", async ({
    page,
    request,
  }) => {
    test.setTimeout(120_000);
    const stamp = Date.now().toString(36);
    const markAm = `E2E-AM-${stamp}`;
    const markPm = `E2E-PM-${stamp}`;

    const session = await registerFreeUser(request, {
      password: defaultPassword(),
    });
    const me = await fetchMe(request, session.accessToken);
    expect(
      me.onboarding_completed,
      "fresh register must be incomplete",
    ).toBeFalsy();

    await injectAccessToken(page, session.accessToken, session.refreshToken);
    await injectSkipFaceCapture(page, true);

    await completeOnboardingViaUi(page, {
      morningEdit: markAm,
      eveningEdit: markPm,
    });

    await expect(page.getByTestId("coach-welcome-morning-0")).toContainText(
      markAm,
      { timeout: 20_000 },
    );
    await expect(page.getByTestId("coach-welcome-evening-0")).toContainText(
      markPm,
    );

    const meDone = await fetchMe(request, session.accessToken);
    expect(
      meDone.onboarding_completed,
      "complete via UI must flip onboarding_completed",
    ).toBeTruthy();

    // P1 hard assert: persisted snapshot must contain the same marks (not UI-only).
    const skin = await fetchSkinProfile(request, session.accessToken);
    assertSnapshotContainsEditedSteps(skin, {
      morning: markAm,
      evening: markPm,
    });

    await page.goto("/routine");
    await expect(page.getByTestId("routine-section-morning")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("routine-step-title-morning-0")).toHaveValue(
      markAm,
    );
    await expect(page.getByTestId("routine-step-title-evening-0")).toHaveValue(
      markPm,
    );

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("routine-step-title-morning-0")).toHaveValue(
      markAm,
      { timeout: 20_000 },
    );
    await expect(page.getByTestId("routine-step-title-evening-0")).toHaveValue(
      markPm,
    );
  });

  test("1b) Login UI incomplete → onboard edit → API + /routine persist", async ({
    page,
    request,
  }) => {
    test.setTimeout(120_000);
    const stamp = Date.now().toString(36);
    const markAm = `E2E-LOGIN-AM-${stamp}`;
    const markPm = `E2E-LOGIN-PM-${stamp}`;

    const session = await registerFreeUser(request, {
      password: defaultPassword(),
    });
    expect(
      (await fetchMe(request, session.accessToken)).onboarding_completed,
    ).toBeFalsy();

    // Seed privacy before next navigation (login lands on /onboarding).
    await injectSkipFaceCapture(page, true);

    // Full post-login path: login → edit → finish (gate-only covered in test 2).
    await loginViaUi(page, session.email, session.password, {
      expectPath: /\/onboarding(?!\/coach-welcome)/,
    });
    expect(page.url()).not.toMatch(/\/check-in/);

    await completeOnboardingViaUi(page, {
      morningEdit: markAm,
      eveningEdit: markPm,
      skipGoto: true,
    });

    await expect(page.getByTestId("coach-welcome-morning-0")).toContainText(
      markAm,
      { timeout: 20_000 },
    );
    await expect(page.getByTestId("coach-welcome-evening-0")).toContainText(
      markPm,
    );

    expect(
      (await fetchMe(request, session.accessToken)).onboarding_completed,
      "login-UI onboard must flip onboarding_completed",
    ).toBeTruthy();

    const skin = await fetchSkinProfile(request, session.accessToken);
    assertSnapshotContainsEditedSteps(skin, {
      morning: markAm,
      evening: markPm,
    });

    await page.goto("/routine");
    await expect(page.getByTestId("routine-step-title-morning-0")).toHaveValue(
      markAm,
      { timeout: 20_000 },
    );
    await expect(page.getByTestId("routine-step-title-evening-0")).toHaveValue(
      markPm,
    );

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("routine-step-title-morning-0")).toHaveValue(
      markAm,
      { timeout: 20_000 },
    );
    await expect(page.getByTestId("routine-step-title-evening-0")).toHaveValue(
      markPm,
    );
  });

  // Gate-only (no edit/finish) — keeps P2 redirect regression separate from 1b.
  test("2) Incomplete login → /onboarding (not /check-in)", async ({
    page,
    request,
  }) => {
    const session = await registerFreeUser(request, {
      password: defaultPassword(),
    });
    const me = await fetchMe(request, session.accessToken);
    expect(me.onboarding_completed).toBeFalsy();

    await loginViaUi(page, session.email, session.password, {
      expectPath: /\/onboarding(?!\/coach-welcome)/,
    });

    expect(page.url()).toMatch(/\/onboarding/);
    expect(page.url()).not.toMatch(/\/check-in/);
    // Prefer wizard; skip CTA proves auth flow mounted (not guest trial gate).
    await expect(page.getByTestId("onboarding-step-skin-profile")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("onboarding-skip-to-app")).toBeVisible();

    // Marketing home stays open; core shells (e.g. /check-in) remain gated.
    await page.goto("/");
    await expect(page.getByTestId("auth-signed-in").first()).toBeVisible({
      timeout: 20_000,
    });
    expect(page.url()).not.toMatch(/\/onboarding/);
    await page.goto("/check-in");
    await page.waitForURL(/\/onboarding/, { timeout: 20_000 });
    expect(page.url()).toMatch(/\/onboarding/);
  });

  test("3) Complete login → /check-in (not trapped on onboarding)", async ({
    page,
    request,
  }) => {
    const session = await registerFreeUser(request, {
      password: defaultPassword(),
    });
    await completeOnboardingViaApi(request, session.accessToken, {
      locale: "vi",
      morning: ["API morning cleanser"],
      evening: ["API evening moisturizer"],
    });
    const me = await fetchMe(request, session.accessToken);
    expect(
      me.onboarding_completed,
      "fixture must be complete before login",
    ).toBeTruthy();

    await loginViaUi(page, session.email, session.password, {
      expectPath: /\/check-in/,
    });

    expect(page.url()).toMatch(/\/check-in/);
    expect(page.url()).not.toMatch(/\/onboarding/);
    await expect(page.getByTestId("auth-signed-in").first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("4) Skip → leave onboarding; reload does not loop back", async ({
    page,
    request,
  }) => {
    const session = await registerFreeUser(request, {
      password: defaultPassword(),
    });
    expect(
      (await fetchMe(request, session.accessToken)).onboarding_completed,
    ).toBeFalsy();

    await loginViaUi(page, session.email, session.password, {
      expectPath: /\/onboarding/,
    });

    // Wait for wizard (not review/skeleton) before skip — skip lives in OnboardingFlow.
    await expect(page.getByTestId("onboarding-step-skin-profile")).toBeVisible({
      timeout: 20_000,
    });
    const skip = page.getByTestId("onboarding-skip-to-app");
    await expect(skip).toBeVisible();
    await skip.click();

    await page.waitForURL(/\/check-in/, { timeout: 20_000 });
    expect(page.url()).toMatch(/\/check-in/);
    expect(page.url()).not.toMatch(/\/onboarding/);

    expect(
      (await fetchMe(request, session.accessToken)).onboarding_skipped,
      "skip must persist on server (users.onboarding_skipped)",
    ).toBeTruthy();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("auth-signed-in").first()).toBeVisible({
      timeout: 20_000,
    });
    expect(
      page.url(),
      "skip flag must prevent gate from bouncing back to /onboarding",
    ).toMatch(/\/check-in/);
    expect(page.url()).not.toMatch(/\/onboarding/);

    // Deep-link gate respect: incomplete + skipped stays on check-in
    await page.goto("/check-in");
    await expect(page.getByTestId("auth-signed-in").first()).toBeVisible({
      timeout: 20_000,
    });
    expect(page.url()).toMatch(/\/check-in/);
    expect(page.url()).not.toMatch(/\/onboarding/);

    // Server skip alone: wipe local cache + reload so /me must supply the flag.
    await page.evaluate(() => {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("dadiary_onboarding_skipped:")) {
          localStorage.removeItem(key);
        }
      }
    });
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("auth-signed-in").first()).toBeVisible({
      timeout: 20_000,
    });
    expect(page.url()).toMatch(/\/check-in/);
    expect(page.url()).not.toMatch(/\/onboarding/);

    await page.goto("/");
    await expect(page.getByTestId("auth-signed-in").first()).toBeVisible({
      timeout: 20_000,
    });
    expect(
      page.url(),
      "server onboarding_skipped must keep home ungated after local clear",
    ).not.toMatch(/\/onboarding/);
  });
});
