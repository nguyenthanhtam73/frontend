# Bé Da layers

Every file uses **viewBox `0 0 220 250`** and the anchors in `anchors.json` (same numbers as `lib/mascot/layers.ts`). Stack the files in the order below. Do not rescale a single layer on its own — scale the whole stack.

Shop item ids live in `lib/mascot/catalog.ts` (`MASCOT_CATALOG`). The backend free grants must use those strings. Those replacements must use this viewBox and these anchors. Outfits and accessories are independent: an outfit stays on the torso (top edge at y=146) and a clip stays on `accessoryClip`, so bought items still fit a new face or hair.

Hair art must leave the eye, brow, mouth, cheek, and accessory-clip anchors clear (no opaque pixels on them).

## Anchors

| Name | Point |
| --- | --- |
| headCenter | 110, 104 (radius 42) |
| eyeLeft / eyeRight | 94, 102 / 126, 102 |
| browLeft / browRight | 94, 90 / 126, 90 |
| mouth | 110, 122 |
| cheekLeft / cheekRight | 80, 116 / 140, 116 |
| hairCrown | 110, 58 |
| hairBunLeft / hairBunRight | 64, 86 / 156, 86 |
| accessoryClip | 156, 62 |
| torsoCenter | 110, 168 |
| outfitTop | y=146 |
| ground | 110, 228 |

## Stack order (back → front)

1. `props/room_*` — background only
2. `body/<id>` — head skin, ears, limbs. Sitting moods use `body/body_sit.svg`. Back view uses `body/body_back.svg` and **skips face parts**
3. `outfit/<id>` — clothes only, never the face
4. `hair/<id>` — shop or photo hair
5. `faces/<mood>/cheeks.svg` — or `faces/items/<faceId>/cheeks.svg` when a photo face is equipped
6. `skin_marks/<concern>_<level>.svg` — one file per active mark (`acne`, `oily`, `dark_spot`, `dry`, `red` × `light` | `medium` | `heavy`)
7. `messy/<1-4>.svg` — bed-head overlay. Does not replace shop hair. Hidden on hug / after a finished routine
8. `faces/<mood>/brows.svg`
9. `faces/<mood>/eyes.svg`
10. `faces/<mood>/mouth.svg`
11. `accessory/accessory_pink_headband.svg` — on the hair, above the eyes. Separate from the star clip
12. `accessory/<other>` — star clip and later shop clips, after the face
13. Foreground props (`pillow`, `mirror`, `suitcase`, `pot`, `door`, `sign_*`, `zzz`, `sparkles`, `pose_*`)
12. Foreground props (`pillow`, `mirror`, `suitcase`, `pot`, `door`, `sign_*`, `zzz`, `sparkles`, `pose_*`)
13. `fx/eyelids.svg` — blink
14. `fx/yawn.svg` — idle yawn
15. `fx/flies/flies.svg` — day 21 only; flies leave on hug or a finished routine

Face parts for one expression are `eyes`, `brows`, `mouth`, and `cheeks`. A photo face replaces all four files under `faces/items/<id>/` and does not change outfit or accessory paths.

## Shop expiry

Items may set `expires_at` (`null` = permanent). In the last 24 hours draw that layer at opacity 0.5. After expiry, omit it. Body, hair, and outfit fall back to the default file so the character stays dressed. The web shows `Chăm da tiếp để lấy lại nha` once per expired item.
