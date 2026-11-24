<!-- Polish complete - ready for Beta -->

# DaDiary Frontend

Next.js 15 PWA for daily skincare check-ins, AI coach feedback, routines, and progress tracking.

## Quick start

```powershell
npm install
npm run dev
```

Copy env vars from the project root `.env.example` into `.env.local` as needed.

## Weekly Shopee affiliate batch

Drop the new CSV in `data/affiliate/`, then convert it and commit both files:

```bash
npm run import:affiliate -- data/affiliate/w20261124.csv
```

That rewrites `lib/affiliate/products.json`. `batch` is the CSV `sub_id2` value. Shoppers only open `affLink`.

`hoa_hong` above 8% is kept. A row at 8% or below is kept only when `ban_chay` is `1` or `true` (empty or `0` means false). At most 15 rows in a file may be flagged. `ban_chay` and the commission are not written into the JSON. A step with no rows is omitted, so the shop card does not show an empty slot for it.

## Production checks

```powershell
npm run lint
npm run build
```

## Beta status

UI polish, loading/empty states, accessibility, and 44px touch targets are complete. Ready for Beta Test.
