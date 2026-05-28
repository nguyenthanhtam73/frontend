"use client";

import { useEffect, useState } from "react";

/**
 * Only show the progress bar when navigation takes longer than a beat.
 * Prefetched locale swaps and fast route changes finish within ~1–2 frames;
 * showing the bar immediately on every transition felt janky (especially
 * combined with the old locale veil).
 */
const SHOW_AFTER_MS = 280;

export default function LocaleLoading() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[2px] overflow-hidden bg-primary/15"
    >
      <span className="sr-only">Loading…</span>
      <div className="nav-progress h-full w-1/3 rounded-r-full bg-primary motion-reduce:animate-none motion-reduce:opacity-60" />
    </div>
  );
}
