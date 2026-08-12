"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  META_PIXEL_ID,
  isMetaPixelAdminPath,
  shouldLoadMetaPixel,
  trackMetaEvent,
} from "@/lib/meta-pixel";

/**
 * Meta (Facebook) Pixel — PageView on first load + client navigations.
 * Skipped on localhost/dev and /admin so those hits do not pollute ad audiences.
 */
export function MetaPixel() {
  const pathname = usePathname();
  const skipInitialPageView = useRef(true);
  const isAdmin = isMetaPixelAdminPath(pathname);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(shouldLoadMetaPixel());
  }, []);

  useEffect(() => {
    if (!enabled || isAdmin) return;
    // First PageView is fired by the inline init snippet.
    if (skipInitialPageView.current) {
      skipInitialPageView.current = false;
      return;
    }
    trackMetaEvent("PageView");
  }, [pathname, isAdmin, enabled]);

  if (!enabled || isAdmin) return null;

  return (
    <>
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];
t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');
          `.trim(),
        }}
      />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element -- Meta Pixel noscript fallback */}
        <img
          height={1}
          width={1}
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
