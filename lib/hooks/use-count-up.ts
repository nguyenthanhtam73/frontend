"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animates an integer toward `value`. Pass `forceFrom` to start the first
 * animation from a specific number (e.g. 0 in a celebration modal).
 */
export function useCountUp(value: number, durationMs = 700, forceFrom?: number): number {
  const [display, setDisplay] = useState(forceFrom ?? value);
  const prevRef = useRef(forceFrom ?? value);
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = value;

    if (reduced || value === from) {
      setDisplay(value);
      return;
    }
    if (value < from && forceFrom == null) {
      setDisplay(value);
      return;
    }

    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs, reduced, forceFrom]);

  return display;
}
