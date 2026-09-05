# Guide Open Graph images

Each guide article uses a **unique** 1200×630 image:

| URL path | File |
| --- | --- |
| `/guides/da-dau` | `da-dau.png` |
| `/guides/mun` | `mun.png` |
| `/guides/kem-chong-nang` | `kem-chong-nang.png` |
| `/guides/routine-cham-da` | `routine-cham-da.png` |
| `/guides/tham-mun` | `tham-mun.png` |
| `/guides/da-dau-van-phong` | `da-dau-van-phong.png` |
| `/guides/da-kho` | `da-kho.png` |
| `/guides/da-nhay-cam` | `da-nhay-cam.png` |
| `/guides/retinol-cho-nguoi-moi` | `retinol-cho-nguoi-moi.png` |

SVG sources sit next to the PNGs (accent + kicker differ per slug). Metadata in `lib/guides/catalog.ts` points at `/og/guides/{slug}.png`.

Regenerate after copy or accent changes:

```bash
npm run og:guides
```

That script needs `sharp` (same as `npm run og:default`). If PNGs are missing, crawlers will 404 the `og:image` — do not ship metadata-only placeholders without a file.

Do **not** put stock “after photos” or invented testimonials on these cards.
