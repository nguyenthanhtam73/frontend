"use client";

/** ProgressSparkline — tiny inline SVG line+area chart for overall-score over time.
 *
 *  Why a hand-rolled SVG instead of recharts/chart.js?
 *  - We render at most ~30 points; a full charting lib (~80kb gzipped) is overkill.
 *  - Bundling tradeoff matters for a mobile-first page on first load.
 *  - Custom SVG also matches our soft teal palette via `currentColor` perfectly.
 *
 *  Interactivity (added on top of the decorative chart):
 *  - Hover / touch shows a tooltip with the date + overall score for the nearest
 *    point, and marks that point with a dot.
 *  - Clicking / tapping a point calls `onPointSelect(entryId)` so the parent can
 *    scroll to and highlight the matching timeline entry. */

import { useCallback, useId, useMemo, useRef, useState } from "react";

export type SparklinePoint = {
  date: string; // YYYY-MM-DD
  value: number; // 0..1
  /** Owning check-in id, so a click can jump to that entry. Optional to keep the
   *  chart usable in purely decorative contexts. */
  entryId?: string;
};

export function ProgressSparkline({
  points,
  height = 56,
  ariaLabel = "Score trend",
  onPointSelect,
}: {
  points: SparklinePoint[];
  height?: number;
  ariaLabel?: string;
  /** Called with the entry id when the user clicks/taps a point (if it has one). */
  onPointSelect?: (entryId: string) => void;
}) {
  // Stable, instance-unique gradient id so multiple sparklines on the same
  // page (e.g. mini summary + detail view) don't collide on the SVG <defs>.
  const reactId = useId();
  const gradientId = `dadiary-sparkline-fill-${reactId.replace(/:/g, "")}`;

  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Need at least 2 points to draw a line; less than 2 → render a quiet placeholder.
  const hasData = points.length >= 2;

  // Values clamped to 0..1 once so both the path and the overlay agree.
  const ys = useMemo(() => points.map((p) => Math.max(0, Math.min(1, p.value))), [points]);

  const { d, area } = useMemo(() => {
    if (!hasData) return { d: "", area: "" };
    const w = 100; // viewBox uses 0..100 so the SVG scales fluidly with the parent width.
    const h = 40;
    const step = w / (points.length - 1);
    const xs = points.map((_, i) => i * step);
    const segments = xs.map(
      (x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${(h - ys[i] * h).toFixed(2)}`,
    );
    const line = segments.join(" ");
    const areaPath = `${line} L ${w} ${h} L 0 ${h} Z`;
    return { d: line, area: areaPath };
  }, [hasData, points, ys]);

  // Map a pointer X coordinate to the nearest point index. Works regardless of the
  // non-uniform SVG scaling because x is a simple linear fraction of the width.
  const indexFromClientX = useCallback(
    (clientX: number): number | null => {
      const el = containerRef.current;
      if (!el || points.length === 0) return null;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0) return null;
      const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Math.round(frac * (points.length - 1));
    },
    [points.length],
  );

  // Hover / touch-drag → update the active point. pointer events unify mouse+touch,
  // so a tap on mobile also lands here (tooltip shows on touch).
  const handleMove = useCallback(
    (clientX: number) => {
      const idx = indexFromClientX(clientX);
      setHoveredIndex(idx);
    },
    [indexFromClientX],
  );

  // Click / tap → resolve the point under the pointer and hand its entry up. We
  // recompute the index from the event (not state) to avoid any stale-closure race
  // between the pointerdown and click that fire on the same tap.
  const handleClick = useCallback(
    (clientX: number) => {
      const idx = indexFromClientX(clientX);
      if (idx == null) return;
      const entryId = points[idx]?.entryId;
      if (entryId && onPointSelect) onPointSelect(entryId);
    },
    [indexFromClientX, points, onPointSelect],
  );

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

  const interactive = Boolean(onPointSelect);
  const active =
    hoveredIndex != null && hoveredIndex >= 0 && hoveredIndex < points.length
      ? hoveredIndex
      : null;

  // Overlay geometry (percentages so we never need to measure pixels):
  //  - x: the point's horizontal fraction of the width.
  //  - y: (1 - value) since 0 is the top of the box.
  const activeXPct = active != null ? (active / (points.length - 1)) * 100 : 0;
  const activeYPct = active != null ? (1 - ys[active]) * 100 : 0;
  // Tooltip clamps horizontally so it doesn't spill past the chart edges.
  const tooltipLeftPct = Math.min(92, Math.max(8, activeXPct));
  // Smart vertical placement: prefer above the point; if the point sits high in the
  // chart (little room above), flip the tooltip below it instead.
  const tooltipBelow = active != null && ys[active] > 0.6;

  return (
    <div
      ref={containerRef}
      className="relative select-none"
      style={{ height, touchAction: "none", cursor: interactive ? "pointer" : "default" }}
      onPointerMove={(e) => handleMove(e.clientX)}
      onPointerDown={(e) => handleMove(e.clientX)}
      onPointerLeave={() => setHoveredIndex(null)}
      onPointerCancel={() => setHoveredIndex(null)}
      onClick={(e) => handleClick(e.clientX)}
    >
      <svg
        role="img"
        aria-label={ariaLabel}
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        className="size-full text-primary"
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

      {/* Active-point marker + tooltip, drawn as HTML overlay so the dot stays a
          perfect circle (the SVG itself is non-uniformly stretched). */}
      {active != null ? (
        <>
          <span
            className="pointer-events-none absolute z-10 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow ring-2 ring-background"
            style={{ left: `${activeXPct}%`, top: `${activeYPct}%` }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute z-20 whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-[10px] leading-tight text-popover-foreground shadow-md motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150"
            style={{
              left: `${tooltipLeftPct}%`,
              top: `${activeYPct}%`,
              transform: tooltipBelow
                ? "translate(-50%, 10px)"
                : "translate(-50%, calc(-100% - 10px))",
            }}
            role="status"
          >
            <span className="font-semibold tabular-nums">{formatDate(points[active].date)}</span>
            <span className="mx-1 text-muted-foreground">·</span>
            <span className="font-semibold tabular-nums text-primary">
              {Math.round(ys[active] * 100)}%
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
}

/** Format an ISO "YYYY-MM-DD" date as "DD/MM/YYYY" for the tooltip. */
function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}
