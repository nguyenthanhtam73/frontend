SePay Playwright smoke + Premium upgrade / Telegram
=====================================================

Prereqs
-------
1. API running with SePay sandbox + DADIARY_E2E_SECRET
   (same value as E2E_SECRET — enables force-plan + in-memory alert recorder)
2. Next.js running with NEXT_PUBLIC_API_URL pointing at that API
3. frontend/.env.e2e from .env.e2e.example

Commands
--------
  npm run test:e2e:install   # once — download Chromium
  npm run test:e2e           # all e2e specs
  npm run test:e2e -- premium-sepay-upgrade
  npm run test:e2e:ui        # Playwright UI mode

What is covered
---------------
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
