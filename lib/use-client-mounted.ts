"use client";

import { useEffect, useState } from "react";

/**
 * True only after the component has mounted on the client. Use to gate UI that
 * reads `localStorage`, `sessionStorage`, or other browser-only APIs during
 * render so the first client paint matches SSR HTML.
 */
export function useClientMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}
