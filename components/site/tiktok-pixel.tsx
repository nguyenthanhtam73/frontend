"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  TIKTOK_PIXEL_ID,
  isTikTokPixelAdminPath,
  isTikTokPixelId,
  shouldLoadTikTokPixel,
  tikTokPixelBootstrap,
  trackTikTokPage,
} from "@/lib/tiktok-pixel";

/**
 * TikTok Pixel — `ttq.page()` on first load + client navigations.
 * Skipped on localhost/dev and /admin, same gate as Meta Pixel.
 */
export function TikTokPixel() {
  const pathname = usePathname();
  const skipInitialPageView = useRef(true);
  const isAdmin = isTikTokPixelAdminPath(pathname);
  // Production SSR includes the snippet so Events Manager can see the Pixel in HTML.
  // After mount, drop it on localhost (`next start`) so test traffic stays out.
  const [enabled, setEnabled] = useState(
    () => process.env.NODE_ENV === "production",
  );

  useEffect(() => {
    setEnabled(shouldLoadTikTokPixel());
  }, []);

  useEffect(() => {
    if (!enabled || isAdmin) return;
    // First page view is fired by the inline init snippet (`ttq.page()`).
    if (skipInitialPageView.current) {
      skipInitialPageView.current = false;
      return;
    }
    trackTikTokPage();
  }, [pathname, isAdmin, enabled]);

  if (!enabled || isAdmin || !isTikTokPixelId(TIKTOK_PIXEL_ID)) return null;

  return (
    <Script
      id="tiktok-pixel"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: tikTokPixelBootstrap(TIKTOK_PIXEL_ID),
      }}
    />
  );
}
