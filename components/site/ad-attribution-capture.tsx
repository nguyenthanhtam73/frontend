"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

import { captureAdAttribution } from "@/lib/analytics/ad-attribution";

function AdAttributionCaptureInner() {
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  useEffect(() => {
    captureAdAttribution(window.location.search);
  }, [search]);

  return null;
}

/** Remember ad params from the landing URL. Renders nothing. */
export function AdAttributionCapture() {
  return (
    <Suspense fallback={null}>
      <AdAttributionCaptureInner />
    </Suspense>
  );
}
