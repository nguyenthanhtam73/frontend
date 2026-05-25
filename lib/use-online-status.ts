"use client";

import { useEffect, useState } from "react";

/**
 * Reactive `navigator.onLine` with a small grace window so quick connectivity
 * blips (mobile dead-zones, Wi-Fi handoffs) don't flash the offline banner.
 *
 * SSR-safe: returns `true` (assume online) before hydration so we never render
 * an offline UI in the SSR/streaming HTML.
 *
 * Note: `navigator.onLine === true` only means the device has *some* network
 * interface; it doesn't guarantee internet reachability. The banner is
 * intentionally worded as "you may be offline" so we err on the side of being
 * informative without being wrong.
 */
export function useOnlineStatus(graceMs = 1500): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setOnline(navigator.onLine);

    let pendingTimer: ReturnType<typeof setTimeout> | null = null;

    const apply = (next: boolean) => {
      if (pendingTimer) clearTimeout(pendingTimer);
      // Going offline shows immediately so users get the warning fast; going
      // back online waits a beat to avoid bouncing the banner.
      if (!next) {
        setOnline(false);
      } else {
        pendingTimer = setTimeout(() => setOnline(true), graceMs);
      }
    };

    const onOnline = () => apply(true);
    const onOffline = () => apply(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      if (pendingTimer) clearTimeout(pendingTimer);
    };
  }, [graceMs]);

  return online;
}
