"use client";

import { useLayoutEffect } from "react";

import { capturePageAttribution } from "@/lib/analytics/attribution";

/** Store first-touch attribution from the URL before page effects read it. */
export function AttributionCapture() {
  useLayoutEffect(() => {
    capturePageAttribution();
  }, []);
  return null;
}
