import type { Viewport } from "next";

/**
 * Game routes. The lobby handles pinch itself, so the WebView must not
 * zoom the page. `userScalable: false` is `user-scalable=no`.
 */
export const gameWebViewViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};
