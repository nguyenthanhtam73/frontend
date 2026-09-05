# In-article guide diagrams

Simple labeled **SVG** figures rendered inside each article (`<img>`, not only `og:image`).
No brand packaging. Vietnamese labels sit on the diagram; alt text is in the catalog (vi + en).

Regenerate:

```bash
node scripts/write-guide-svgs.mjs
```

| Guide | Files |
| --- | --- |
| `da-dau` | `hero.svg` `steps.svg` `do-avoid.svg` `climate.svg` |
| `mun` | `hero.svg` `one-active.svg` `friction.svg` `doctor.svg` |
| `kem-chong-nang` | `amount.svg` `zones.svg` `textures.svg` `where.svg` |
| `routine-cham-da` | `ampm.svg` `order.svg` `two-weeks.svg` `photo.svg` |
| `tham-mun` | `hero.svg` `protect.svg` `weekly.svg` |
| `da-dau-van-phong` | `hero.svg` `desk.svg` `lunch.svg` |
| `da-kho` | `hero.svg` `layers.svg` `climate.svg` |
| `da-nhay-cam` | `hero.svg` `minimal.svg` `patch.svg` |
| `retinol-cho-nguoi-moi` | `calendar.svg` `sandwich.svg` `daytime.svg` |

Open Graph cards stay at `/og/guides/{slug}.png`.
