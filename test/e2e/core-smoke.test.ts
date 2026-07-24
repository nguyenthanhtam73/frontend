/**
 * Core product smoke (Playwright) — auth session, skip-face check-in,
 * guest preview poll, payment success → full /me.
 *
 * Prerequisites: API + Next already running (see README-SMOKE.txt).
 * Run: npm run test:e2e -- core-smoke
 */

import { expect, test } from "@playwright/test";

import {
  assertPremiumFeatures,
  assertPremiumSubscriptionFields,
  createGuestPreviewJob,
  fetchMe,
  fetchUsage,
  pollGuestPreviewJob,
  postSePayWebhook,
  registerFreeUser,
  waitForGuestPreviewReady,
  waitForPlanTier,
  waitForSkinAnalysis,
} from "./helpers/api";
import {
  didAuthFlashToGuest,
  injectAccessToken,
  injectSkipFaceCapture,
  mockSePayFormSubmit,
  resolveCheckoutFromUi,
  selectBillingMonthly,
} from "./helpers/browser";
import { apiURL, defaultPassword } from "./helpers/env";
import {
  AUTH_REFRESH_STORAGE_KEY,
  AUTH_TOKEN_STORAGE_KEY,
} from "../../lib/auth-token";

test.describe.configure({ mode: "serial" });

test.describe("Core product smoke", () => {
  test("1) Auth session — login → reload / new tab keeps JWT session", async ({
    page,
    context,
    request,
  }) => {
    // --- Step 1: create Free user via API (avoid Turnstile on register UI) ---
    const session = await registerFreeUser(request, {
      password: defaultPassword(),
    });
    expect(
      session.accessToken,
      "register/login must return access_token",
    ).toBeTruthy();
    expect(
      session.refreshToken,
      "register/login must return refresh_token for session persistence",
    ).toBeTruthy();

    // --- Step 2: login through UI so tokens land in localStorage the real way ---
    await page.goto("/login");
    await page.locator("#login-email").fill(session.email);
    await page.locator("#login-password").fill(session.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/(check-in|routine|pricing|cabinet)?/, {
      timeout: 20_000,
    });

    await expect(
      page.getByTestId("auth-signed-in").first(),
      "after login, header must show signed-in chrome (not guest CTAs)",
    ).toBeVisible({ timeout: 20_000 });

    const stored = await page.evaluate(
      ([accessKey, refreshKey]) => ({
        access: localStorage.getItem(accessKey),
        refresh: localStorage.getItem(refreshKey),
      }),
      [AUTH_TOKEN_STORAGE_KEY, AUTH_REFRESH_STORAGE_KEY] as const,
    );
    expect(stored.access, "access token missing from localStorage after login").toBeTruthy();
    expect(
      stored.refresh,
      "refresh token missing from localStorage after login",
    ).toBeTruthy();

    // --- Step 3: reload — must not flash guest UI while token is present ---
    await page.reload({ waitUntil: "domcontentloaded" });
    const flashed = await didAuthFlashToGuest(page);
    expect(
      flashed,
      "session flashed to guest (logout) UI after reload — refresh/auth race?",
    ).toBe(false);
    await expect(
      page.getByTestId("auth-signed-in").first(),
      "signed-in header must remain after reload",
    ).toBeVisible({ timeout: 20_000 });

    // --- Step 4: new tab in same context shares storage — still signed in ---
    const tab2 = await context.newPage();
    await tab2.goto("/check-in");
    await expect(
      tab2.getByTestId("auth-signed-in").first(),
      "new tab must reuse session (same origin storage)",
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      tab2.getByTestId("auth-guest"),
      "new tab must not show guest CTAs while session exists",
    ).toHaveCount(0);

    // --- Step 5: JWT-protected /me succeeds from the browser ---
    const meCall = await tab2.evaluate(async (base) => {
      const token = localStorage.getItem("dadiary_access_token");
      if (!token) return { status: 0, error: "no_token" as const };
      const res = await fetch(`${base}/api/v1/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      const body = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: { email?: string; id?: string };
      };
      return {
        status: res.status,
        ok: res.ok && body.success === true && Boolean(body.data?.id),
        email: body.data?.email,
      };
    }, apiURL());

    expect(
      meCall.status,
      `GET /me with stored JWT failed: ${JSON.stringify(meCall)}`,
    ).toBe(200);
    expect(meCall.ok, `/me envelope incomplete: ${JSON.stringify(meCall)}`).toBe(
      true,
    );
    expect(meCall.email).toBe(session.email);

    // Cross-check via API helper (same token)
    const me = await fetchMe(request, stored.access!);
    expect(me.email).toBe(session.email);

    await tab2.close();
  });

  test("2) Skip-face check-in — no photo, skip_mode=true, text-only analysis", async ({
    page,
    request,
  }) => {
    test.setTimeout(120_000);
    // --- Step 1: Free user + inject session + prefer skip-face privacy ---
    const session = await registerFreeUser(request, {
      password: defaultPassword(),
    });
    await injectAccessToken(page, session.accessToken, session.refreshToken);
    await injectSkipFaceCapture(page, true);

    // --- Step 2: open check-in and ensure skip mode is active ---
    await page.goto("/check-in");
    await expect(
      page.getByTestId("checkin-mode-skip"),
      "skip-face mode tab missing — add CaptureModeToggle testids?",
    ).toBeVisible({ timeout: 20_000 });

    // Click skip tab even if already seeded (idempotent UX)
    await page.getByTestId("checkin-mode-skip").click();
    await expect(page.getByTestId("checkin-mode-skip")).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // --- Step 3: pick a condition tag so skip-mode form is valid (no photos) ---
    await page.getByTestId("checkin-condition-oily").click();
    const submit = page.getByTestId("checkin-submit");
    await expect(
      submit,
      "submit should enable with skip-mode + tags (photos not required)",
    ).toBeEnabled();

    // --- Step 4: capture POST body — must include skip_mode=true, no image parts ---
    const postPromise = page.waitForRequest(
      (req) =>
        req.url().includes("/api/v1/skin-checks") &&
        req.method() === "POST",
      { timeout: 30_000 },
    );
    const respPromise = page.waitForResponse(
      (r) =>
        r.url().includes("/api/v1/skin-checks") &&
        r.request().method() === "POST",
      { timeout: 30_000 },
    );

    await submit.click();

    const postReq = await postPromise;
    const postData = postReq.postData() || "";
    expect(
      postData.includes("skip_mode") && postData.includes("true"),
      `POST must send skip_mode=true; body snippet=${postData.slice(0, 400)}`,
    ).toBe(true);
    expect(
      /name="images"/.test(postData) || /filename=/.test(postData),
      "skip-face POST must not attach image files",
    ).toBe(false);

    const postResp = await respPromise;
    expect(
      postResp.ok(),
      `skip-face create failed ${postResp.status()}: ${await postResp.text()}`,
    ).toBeTruthy();

    const created = (await postResp.json()) as {
      success?: boolean;
      data?: {
        check?: { id?: string };
        image_urls?: string[];
        analysis?: { status?: string };
      };
      error?: { code?: string; message?: string };
    };
    expect(
      created.success && created.data?.check?.id,
      `create envelope missing check id: ${JSON.stringify(created)}`,
    ).toBeTruthy();
    expect(
      created.data?.image_urls?.length ?? 0,
      "skip-face check must have zero image_urls",
    ).toBe(0);

    const checkId = created.data!.check!.id!;

    // --- Step 5: UI must not show missing-image / hard error banner ---
    await expect(
      page.getByText(/missing.?image|need.?image|cần.?ảnh|thiếu.?ảnh/i),
    ).toHaveCount(0);

    // --- Step 6: poll analysis until terminal — text-only coach success ---
    const done = await waitForSkinAnalysis(
      request,
      session.accessToken,
      checkId,
      { timeoutMs: 90_000 },
    );
    const status = done.analysis?.status;
    expect(
      status,
      `analysis never completed for skip-face check ${checkId}: ${JSON.stringify(done.analysis)}`,
    ).toBe("completed");
    expect(
      done.analysis?.coach?.error_message,
      `coach error on text-only analysis: ${done.analysis?.coach?.error_message}`,
    ).toBeFalsy();

    // Soft UI signal: feedback / loading area settled without crash
    await expect(page.getByTestId("checkin-submit")).toBeVisible();
  });

  test("3) Guest onboarding poll — token required, result with token, 404 without", async ({
    request,
  }) => {
    test.setTimeout(120_000);
    // --- Step 1: guest creates preview routine job ---
    const job = await createGuestPreviewJob(request, { locale: "vi" });
    expect(job.previewJobId, "preview_job_id missing").toBeTruthy();
    expect(
      job.previewAccessToken,
      "preview_access_token missing — FE cannot poll securely",
    ).toBeTruthy();

    // --- Step 2: poll WITHOUT token → not_found (no leak / no 401 oracle) ---
    const noToken = await pollGuestPreviewJob(request, {
      jobId: job.previewJobId,
    });
    expect(
      noToken.status,
      `missing token should 404 (not leak); got ${noToken.status} body=${JSON.stringify(noToken.body)}`,
    ).toBe(404);

    // Wrong token also 404 (existence oracle closed)
    const badToken = await pollGuestPreviewJob(request, {
      jobId: job.previewJobId,
      token: "definitely-not-the-real-token",
    });
    expect(
      badToken.status,
      `wrong token should 404; got ${badToken.status}`,
    ).toBe(404);

    // --- Step 3: poll WITH token → 200 and eventually ready routine ---
    const withToken = await pollGuestPreviewJob(request, {
      jobId: job.previewJobId,
      token: job.previewAccessToken,
    });
    expect(
      withToken.status,
      `valid token poll failed: ${withToken.status} ${JSON.stringify(withToken.body)}`,
    ).toBe(200);

    const ready = await waitForGuestPreviewReady(request, {
      jobId: job.previewJobId,
      token: job.previewAccessToken,
      timeoutMs: 90_000,
    });
    expect(ready.status).toBe(200);
    expect(
      ready.hasRoutine,
      `preview ready but starter_routine missing: ${JSON.stringify(ready.body)}`,
    ).toBe(true);

    // Header token path also works
    const viaHeader = await pollGuestPreviewJob(request, {
      jobId: job.previewJobId,
      headerToken: job.previewAccessToken,
    });
    expect(
      viaHeader.status,
      `X-Preview-Token should authenticate poll; got ${viaHeader.status}`,
    ).toBe(200);
  });

  test("4) Payment success → /me full Premium + features open", async ({
    page,
    request,
  }) => {
    // --- Step 1: Free user session in browser ---
    const session = await registerFreeUser(request, {
      password: defaultPassword(),
    });
    const meFree = await fetchMe(request, session.accessToken);
    expect(
      meFree.plan_tier || "free",
      "precondition: user must start Free",
    ).toBe("free");

    await injectAccessToken(page, session.accessToken, session.refreshToken);

    // --- Step 2: Pricing → Premium Monthly CTA ---
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

    await page.getByTestId("pricing-cta-premium").click();
    const checkoutResp = await checkoutRespPromise;
    expect(
      checkoutResp.ok(),
      `checkout failed ${checkoutResp.status()}`,
    ).toBeTruthy();

    // --- Step 3: mock SePay form POST (no real redirect) ---
    const posted = await sepay.waitForCheckoutPost();
    const { invoice, amountVnd } = await resolveCheckoutFromUi({
      checkoutResp,
      posted,
    });
    expect(amountVnd, "Premium Monthly amount should be 99000 VND").toBe(
      99_000,
    );

    // --- Step 4: simulate SePay ORDER_PAID IPN ---
    const ipn = await postSePayWebhook(request, { invoice, amountVnd });
    expect(
      ipn.status,
      `ORDER_PAID IPN failed: ${ipn.status} ${JSON.stringify(ipn.body)}`,
    ).toBeLessThan(400);

    await waitForPlanTier(request, session.accessToken, "premium");

    // --- Step 5: /payment/success polls until active ---
    await page.goto("/payment/success");
    const result = page.getByTestId("payment-result-success");
    await expect(result).toBeVisible();
    await expect(result).toHaveAttribute("data-phase", "active", {
      timeout: 35_000,
    });

    // --- Step 6: /me full subscription fields ---
    const me = await fetchMe(request, session.accessToken);
    assertPremiumSubscriptionFields(me);

    // --- Step 7: features open (wardrobe, AI unlimited, export) ---
    const usage = await fetchUsage(request, session.accessToken);
    expect(usage.plan_tier).toBe("premium");
    assertPremiumFeatures(usage);
  });
});
