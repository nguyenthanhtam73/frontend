"use client";

/** ProgressSparkline — tiny inline SVG line+area chart for overall-score over time.
 *
 *  Why a hand-rolled SVG instead of recharts/chart.js?
 *  - We render at most ~30 points; a full charting lib (~80kb gzipped) is overkill.
 *  - Bundling tradeoff matters for a mobile-first page on first load.
 *  - Custom SVG also matches our soft teal palette via `currentColor` perfectly.
 *
 *  The chart is purely decorative — actual numbers live in the summary card and
 *  per-entry timeline rows. */

import { useId, useMemo } from "react";

export type SparklinePoint = {
  date: string; // YYYY-MM-DD
  value: number; // 0..1
};

export function ProgressSparkline({
  points,
  height = 56,
  ariaLabel = "Score trend",
}: {
  points: SparklinePoint[];
  height?: number;
  ariaLabel?: string;
}) {
  // Stable, instance-unique gradient id so multiple sparklines on the same
  // page (e.g. mini summary + detail view) don't collide on the SVG <defs>.
  const reactId = useId();
  const gradientId = `dadiary-sparkline-fill-${reactId.replace(/:/g, "")}`;
  // Need at least 2 points to draw a line; less than 2 → render a quiet placeholder.
  const hasData = points.length >= 2;
  const { d, area } = useMemo(() => {
    if (!hasData) return { d: "", area: "" };
    const w = 100; // viewBox uses 0..100 so the SVG scales fluidly with the parent width.
    const h = 40;
    const step = w / (points.length - 1);
    const ys = points.map((p) => Math.max(0, Math.min(1, p.value)));
    const xs = points.map((_, i) => i * step);
    // Line path.
    const segments = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${(h - ys[i] * h).toFixed(2)}`);
    const line = segments.join(" ");
    // Filled area below the line for a soft gradient look.
    const areaPath = `${line} L ${w} ${h} L 0 ${h} Z`;
    return { d: line, area: areaPath };
  }, [hasData, points]);

  if (!hasData) {
    return (
      <div
        className="flex items-center justify-center rounded-md bg-muted/30 text-[10px] text-muted-foreground"
        style={{ height }}
        role="img"
        aria-label={ariaLabel}
      >
        —
      </div>
    );
  }

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      className="w-full text-primary"
      style={{ height }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
