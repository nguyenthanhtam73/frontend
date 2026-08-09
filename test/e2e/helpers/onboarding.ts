import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Minimal skip-face onboarding UI path:
 * goal + concern → continue without photos → optional starter edits → finish.
 */
export async function completeOnboardingViaUi(
  page: Page,
  opts?: {
    goalId?: string;
    concernId?: string;
    morningEdit?: string;
    eveningEdit?: string;
    /** When already on /onboarding (e.g. post-login), skip the extra navigation. */
    skipGoto?: boolean;
  },
): Promise<void> {
  const goalId = opts?.goalId ?? "clear_acne";
  const concernId = opts?.concernId ?? "acne";

  if (!opts?.skipGoto) {
    await page.goto("/onboarding");
  }
  await expect(page.getByTestId("onboarding-step-skin-profile")).toBeVisible({
    timeout: 20_000,
  });

  await page.getByTestId(`onboarding-goal-${goalId}`).click();
  await page.getByTestId(`onboarding-concern-${concernId}`).click();
  await page.getByTestId("onboarding-continue-without-photos").click();

  await expect(page.getByTestId("onboarding-step-starter-routine")).toBeVisible({
    timeout: 20_000,
  });
  // Scaffold always seeds ≥1 AM + ≥1 PM step — fail early if that regresses.
  await expect(page.getByTestId("onboarding-starter-step-morning-0")).toBeVisible();
  await expect(page.getByTestId("onboarding-starter-step-evening-0")).toBeVisible();

  if (opts?.morningEdit || opts?.eveningEdit) {
    await page.getByTestId("onboarding-starter-edit-toggle").click();
    if (opts.morningEdit) {
      const am = page.getByTestId("onboarding-starter-input-morning-0");
      await expect(am).toBeVisible();
      await am.fill(opts.morningEdit);
      await expect(am).toHaveValue(opts.morningEdit);
    }
    if (opts.eveningEdit) {
      const pm = page.getByTestId("onboarding-starter-input-evening-0");
      await expect(pm).toBeVisible();
      await pm.fill(opts.eveningEdit);
      await expect(pm).toHaveValue(opts.eveningEdit);
    }
    // Exit edit mode so sticky "use routine" advances cleanly
    await page.getByTestId("onboarding-starter-edit-toggle").click();
  }

  await page.getByTestId("onboarding-nav-continue").click();
  await expect(page.getByTestId("onboarding-step-ready")).toBeVisible({
    timeout: 15_000,
  });

  if (opts?.morningEdit) {
    await expect(page.getByTestId("onboarding-ready-morning-0")).toContainText(
      opts.morningEdit,
    );
  }
  if (opts?.eveningEdit) {
    await expect(page.getByTestId("onboarding-ready-evening-0")).toContainText(
      opts.eveningEdit,
    );
  }

  const completeResp = page.waitForResponse(
    (r) =>
      r.url().includes("/api/v1/profile/onboarding/complete") &&
      r.request().method() === "POST",
    { timeout: 45_000 },
  );
  await page.getByTestId("onboarding-nav-continue").click();
  const resp = await completeResp;
  if (!resp.ok()) {
    throw new Error(
      `onboarding/complete failed ${resp.status()}: ${await resp.text()}`,
    );
  }

  await page.waitForURL(/\/onboarding\/coach-welcome/, { timeout: 20_000 });
  await expect(page.getByTestId("coach-welcome-starter-cards")).toBeVisible({
    timeout: 20_000,
  });
}
