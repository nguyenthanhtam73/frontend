# Góc bình yên

The playable room is split so a native client can reuse the rules without taking React or Pixi.

## `lib/game/core`

Plain TypeScript. No imports from `react`, `pixi.js`, or `next`.

This folder owns:

- Movement: local walk, remote glide between position snapshots, camera-independent step size, drag versus tap, arrow-key goals.
- The frame clock. `requestAnimationFrame` and `document.hidden` are the browser defaults. A native port passes its own clock.
- Device pixel ratio, capped at 2.
- Room list shape from `GET /api/v1/mascot/rooms/mine`, and the button text `Vào phòng <code>`.
- Wardrobe grants: the default item, and the admin-only test shirt.
- Session contract: storage key `dadiary_access_token`. The token is never a query parameter.

It may call other plain modules (`lib/mascot/game/walk.ts`, `lib/mascot/game/wardrobe.ts`, `lib/mascot/layers.ts`). Those must stay free of React and Pixi too.

## Pixi layer

`lib/mascot/game/shell/pixi-runtime.ts` draws what core decides. `components/mascot/game/be-da-pixi-stage.tsx` loads that file with a dynamic import, and only from the Bé Da screen. Sprites, the canvas, and the camera transform live here. Walking rules do not.

## React screens

`components/mascot/game/*` is the HTML overlay: quests, the wardrobe cabinet, «Vào phòng» buttons, the nav, and the admin gate (`features.mascot` from `GET /me`). The group room socket stays as it is. Realtime position fan-out is a later step.

## Android WebView

Open `https://dadiary.vn/goc-binh-yen/game` (English: `/en/goc-binh-yen/game`) in a WebView that already holds the site login. The page reads the same `dadiary_access_token` the site stored. It does not show a second login and it does not accept the token in the URL.

The route is the existing game, full screen. Site header and footer are hidden. Walking is touch and drag through pointer events. Nothing in the room depends on hover. The framebuffer stays at a device pixel ratio of at most 2.

The shared lobby camera is `pixi-viewport`: drag with a short glide, pinch, wheel, clamp to the lobby, and zoom clamped from 0.6 to 2.5. Pinch and drag set the camera directly. The +/- buttons and the locate button use `viewport.animate`. A short tap (under 10px and 250ms) still walks Bé Da and follow resumes. Drag, pinch, wheel, and +/- pause follow and do not walk her. The framebuffer is capped at 2, and at 1.5 when the short side is at least 768 (iPad). Safari gesture events are cancelled and the lobby uses `touch-action: none`, including double-tap zoom. The backdrop Graphics is built once per sky and size, not every frame. Figure plates are loaded once through the texture cache and reused; a small stack is packed into one atlas texture, and a large stack keeps those cached textures instead of reallocating them.
