SePay Playwright smoke + Premium upgrade / Telegram
=====================================================

Prereqs
-------
1. API running with SePay sandbox + DADIARY_E2E_SECRET
   (same value as E2E_SECRET — enables force-plan + in-memory alert recorder)
   and DADIARY_SEPAY_CHECKOUT_ENABLED=true (Beta prod keeps this false)
2. Next.js running with NEXT_PUBLIC_API_URL pointing at that API
   and NEXT_PUBLIC_SEPAY_CHECKOUT_ENABLED=true (from .env.e2e)
3. frontend/.env.e2e from .env.e2e.example

Commands
--------
  npm run test:e2e:install   # once — download Chromium
  npm run test:e2e           # all e2e specs
  npm run test:e2e -- core-smoke
  npm run test:e2e -- onboarding-smoke
  npm run test:e2e -- premium-sepay-upgrade
  npm run test:e2e:ui        # Playwright UI mode

What is covered
---------------
onboarding-smoke.test.ts (P1 + P2)
- 1a) Token inject: edit AM/PM → finish → GET /profile/skin snapshot contains marks →
  /routine + reload still shows edits
- 1b) Login UI incomplete → /onboarding → skip-face edit → finish → same API + /routine asserts
  (skipGoto — no redundant /onboarding navigation after login)
- 2) Gate-only: incomplete login → /onboarding; marketing `/` stays open; /check-in redirects
- 3) Complete login (register + POST /profile/onboarding/complete) → lands on /check-in
- 4) Skip / “enter app” → /check-in; GET /me onboarding_skipped=true; reload + localStorage
  clear still respects server skip (home not bounced to /onboarding)
  Requires API with users.onboarding_skipped (AutoMigrate or migrations/013_*.sql).
  After pull: restart the Go API so AutoMigrate adds the column (or run 013_*.up.sql).
  If e2e #4 fails on onboarding_skipped, the column is missing — restart API first.
  Fixtures: incomplete = register only; complete = register + completeOnboardingViaApi()
  Snapshot assert: GET /api/v1/profile/skin → onboarding_snapshot.starter_routine.{morning,evening}
  Reset: DELETE /profile/onboarding (helper deleteOnboardingViaApi) if you need to re-run UI onboard

core-smoke.test.ts
- Auth session: UI login → reload + new tab keep signed-in (no guest flash) → GET /me with JWT
- Skip-face check-in: mode toggle → submit without photos → skip_mode=true → text-only analysis completed
- Guest onboarding poll: preview-complete → preview_job_id + preview_access_token;
  poll without/wrong token → 404; with token (query or X-Preview-Token) → routine ready
- Payment success → /me full: Free → Pricing Premium Monthly → mock SePay + ORDER_PAID IPN →
  /payment/success active → plan_tier + days_left + plan_expires_at + Premium features

sepay-smoke.test.ts
- Free user login + /pricing Premium Monthly checkout
- Mock SePay form POST (no real payment UI)
- Simulated ORDER_PAID IPN
- /payment/success polling → plan_tier premium
- /me/usage feature gates (wardrobe, AI unlimited, export)
- /payment/cancel + /payment/error
- Webhook idempotency (replay)
- Past grace expiry → effective Free (needs E2E_SECRET; force expiry ≥4d ago)

premium-sepay-upgrade.test.ts
- Full upgrade path + plan_expires_at ≈ +30 days
- Features: wardrobe / AI unlimited / export
- Telegram alert path via GET /api/v1/internal/e2e/alerts
  (records the same Event that Fanout would send to Telegram — no real bot needed)
- IPN replay: expiry unchanged + single payment_success alert

Alert capture notes
-------------------
When DADIARY_E2E_SECRET is set, the API wraps pkg/alert with an in-memory Recorder.
Playwright polls /internal/e2e/alerts?key=payment_success&invoice=...
Real Telegram still fires if DADIARY_ALERT_TELEGRAM_* is configured.
