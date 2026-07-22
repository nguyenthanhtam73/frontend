SePay Playwright smoke
======================

Prereqs
-------
1. API running with SePay sandbox + (optional) DADIARY_E2E_SECRET
2. Next.js running with NEXT_PUBLIC_API_URL pointing at that API
3. frontend/.env.e2e from .env.e2e.example

Commands
--------
  npm run test:e2e:install   # once — download Chromium
  npm run test:e2e           # headless smoke
  npm run test:e2e:ui        # Playwright UI mode

What is covered
---------------
- Free user login + /pricing Premium Monthly checkout
- Mock SePay form POST (no real payment UI)
- Simulated ORDER_PAID IPN
- /payment/success polling → plan_tier premium
- /me/usage feature gates (wardrobe, AI unlimited, export)
- /payment/cancel + /payment/error
- Webhook idempotency (replay)
- Past grace expiry → effective Free (needs E2E_SECRET; force expiry ≥4d ago)
