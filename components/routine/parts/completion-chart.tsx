"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import { formatShortDate } from "../routine-helpers";
import { cn } from "@/lib/utils";

import {
  buildWeeklyAverages,
  type ChartPoint,
  type Trend,
  type WeeklyAvg,
} from "./history-stats";

const LONG_PRESS_MS = 450;

type CompletionChartLabels = {
  title: string;
  trendImproving: string;
  trendDeclining: string;
  trendSteady: string;
  weeklyAvg: string;
  weekLabel: (n: number) => string;
  today: string;
  yesterday: string;
  detailPct: (pct: number) => string;
  noSave: string;
};

export function CompletionChart({
  points,
  trend,
  todayISO,
  selectedDate,
  labels,
  onSelectDay,
}: {
  points: ChartPoint[];
  trend: Trend;
  todayISO: string;
  selectedDate: string | null;
  labels: CompletionChartLabels;
  onSelectDay: (date: string) => void;
}) {
  const weekly = useMemo(
    () => buildWeeklyAverages(points, labels.weekLabel),
    [points, labels.weekLabel],
  );

  if (points.length === 0) return null;

  return (
    <div className="space-y-2.5 sm:space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold tracking-tight">{labels.title}</p>
        <TrendBadge trend={trend} labels={labels} />
      </div>

      <div className="-mx-1 overflow-x-auto overscroll-x-contain px-1 pb-1 [scrollbar-width:thin]">
        <BarChart
          points={points}
          todayISO={todayISO}
          labels={labels}
          selectedDate={selectedDate}
          onSelectDay={onSelectDay}
        />
      </div>

      {weekly.length >= 2 ? (
        <WeeklyRow weekly={weekly} title={labels.weeklyAvg} />
      ) : null}
    </div>
  );
}

function TrendBadge({
  trend,
  labels,
}: {
  trend: Trend;
  labels: Pick<
    CompletionChartLabels,
    "trendImproving" | "trendDeclining" | "trendSteady"
  >;
}) {
  const config = {
    improving: {
      text: labels.trendImproving,
      icon: TrendingUp,
      tone: "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    },
    declining: {
      text: labels.trendDeclining,
      icon: TrendingDown,
      tone: "border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    },
    steady: {
      text: labels.trendSteady,
      icon: Minus,
      tone: "border-border/80 bg-muted/40 text-muted-foreground",
    },
  }[trend];

  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        config.tone,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {config.text}
    </span>
  );
}

type BarLayout = {
  date: string;
  x: number;
  y: number;
  barW: number;
  barH: number;
  centerX: number;
  point: ChartPoint;
};

function BarChart({
  points,
  todayISO,
  labels,
  selectedDate,
  onSelectDay,
}: {
  points: ChartPoint[];
  todayISO: string;
  labels: CompletionChartLabels;
  selectedDate: string | null;
  onSelectDay: (date: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const pointerMovedRef = useRef(false);

  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [pinnedTooltipDate, setPinnedTooltipDate] = useState<string | null>(null);

  const barW =
    points.length <= 6 ? 22 : points.length <= 10 ? 18 : points.length > 20 ? 10 : 14;
  const gap =
    points.length <= 6 ? 10 : points.length <= 10 ? 8 : points.length > 20 ? 3 : 5;
  const chartH = 96;
  const padX = 12;
  const padTop = 8;
  const padBottom = 28;
  const hitPad = 8;
  const tooltipReserve = 44;
  const width = padX * 2 + points.length * barW + (points.length - 1) * gap;
  const height = chartH + padTop + padBottom;
  const labelEvery =
    points.length <= 8 ? 1 : points.length <= 14 ? 2 : points.length > 20 ? 5 : 3;

  const bars: BarLayout[] = useMemo(
    () =>
      points.map((p, i) => {
        const x = padX + i * (barW + gap);
        const barH = p.hasEntry ? Math.max(2, (p.pct / 100) * chartH) : 2;
        const y = padTop + chartH - barH;
        return { date: p.date, x, y, barW, barH, centerX: x + barW / 2, point: p };
      }),
    [points, barW, gap, chartH, padTop, padX],
  );

  const tooltipDate = pinnedTooltipDate ?? hoveredDate;
  const tooltipBar = bars.find((b) => b.date === tooltipDate) ?? null;

  const clearLongPress = useCallback(() => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearLongPress();
  }, [clearLongPress]);

  useEffect(() => {
    if (!pinnedTooltipDate) return;
    const dismiss = () => setPinnedTooltipDate(null);
    window.addEventListener("pointerup", dismiss);
    window.addEventListener("scroll", dismiss, true);
    return () => {
      window.removeEventListener("pointerup", dismiss);
      window.removeEventListener("scroll", dismiss, true);
    };
  }, [pinnedTooltipDate]);

  function dateLabelFor(iso: string): string {
    if (iso === todayISO) return labels.today;
    const dToday = new Date(`${todayISO}T00:00:00Z`);
    const dEntry = new Date(`${iso}T00:00:00Z`);
    const diffDays = Math.round((dToday.getTime() - dEntry.getTime()) / (24 * 3600 * 1000));
    if (diffDays === 1) return labels.yesterday;
    return formatShortDate(iso);
  }

  function handlePointerDown(bar: BarLayout, clientX: number, clientY: number) {
    pointerStartRef.current = { x: clientX, y: clientY };
    pointerMovedRef.current = false;
    setActiveDate(bar.date);
    longPressTriggeredRef.current = false;
    clearLongPress();
    longPressRef.current = setTimeout(() => {
      if (pointerMovedRef.current) return;
      longPressTriggeredRef.current = true;
      setPinnedTooltipDate(bar.date);
      setHoveredDate(bar.date);
    }, LONG_PRESS_MS);
  }

  function handlePointerMove(clientX: number, clientY: number) {
    const start = pointerStartRef.current;
    if (!start) return;
    const dx = Math.abs(clientX - start.x);
    const dy = Math.abs(clientY - start.y);
    if (dx > 8 || dy > 8) {
      pointerMovedRef.current = true;
      clearLongPress();
      setActiveDate(null);
    }
  }

  function handlePointerUp(bar: BarLayout) {
    clearLongPress();
    setActiveDate(null);
    setHoveredDate(null);
    pointerStartRef.current = null;
    if (!bar.point.hasEntry || pointerMovedRef.current) return;
    if (!longPressTriggeredRef.current) {
      onSelectDay(bar.date);
    }
  }

  function barFillClass(p: ChartPoint, state: "default" | "hover" | "active" | "selected"): string {
    const vivid = state === "active" || state === "selected" || state === "hover";
    if (!p.hasEntry) return vivid ? "fill-muted/70" : "fill-muted/45";
    if (p.pct >= 80) return vivid ? "fill-emerald-400" : "fill-emerald-500";
    if (p.pct >= 40) return vivid ? "fill-primary/80" : "fill-primary";
    return vivid ? "fill-amber-300" : "fill-amber-400";
  }

  return (
    <div
      ref={containerRef}
      className="relative touch-pan-x sm:touch-auto"
      style={{
        minWidth: `${Math.max(width, 280)}px`,
        paddingTop: tooltipReserve,
        minHeight: height + tooltipReserve,
      }}
    >
      {tooltipBar ? (
        <ChartTooltip
          bar={tooltipBar}
          dateLabel={dateLabelFor(tooltipBar.date)}
          valueLabel={labels.detailPct(tooltipBar.point.pct)}
          chartWidth={width}
          tooltipReserve={tooltipReserve}
        />
      ) : null}

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="block w-full select-none"
        role="img"
        aria-label="Daily completion chart"
        style={{ height: `${height}px` }}
      >
        {[0, 25, 50, 75, 100].map((tick) => {
          const y = padTop + chartH - (tick / 100) * chartH;
          return (
            <g key={tick}>
              <line
                x1={padX}
                y1={y}
                x2={width - padX}
                y2={y}
                className="stroke-border/50"
                strokeWidth={1}
                strokeDasharray={tick === 0 ? undefined : "3 3"}
              />
              <text
                x={padX - 2}
                y={y + 3}
                textAnchor="end"
                className="fill-muted-foreground text-[8px]"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {bars.map((bar, i) => {
          const { point: p } = bar;
          const isToday = p.date === todayISO;
          const isSelected = p.date === selectedDate;
          const isHovered = p.date === hoveredDate;
          const isActive = p.date === activeDate;

          const visualState = isActive
            ? "active"
            : isSelected
              ? "selected"
              : isHovered
                ? "hover"
                : "default";

          const showLabel = i === 0 || i === points.length - 1 || i % labelEvery === 0;

          return (
            <g key={p.date}>
              <rect
                x={bar.x}
                y={bar.y}
                width={bar.barW}
                height={bar.barH}
                rx={3}
                className={cn(
                  "transition-[fill,opacity] duration-100",
                  barFillClass(p, visualState),
                  isSelected && "opacity-100",
                  isActive && "opacity-100",
                )}
              />
              {(isSelected || isActive) && (
                <rect
                  x={bar.x - 1.5}
                  y={bar.y - 1.5}
                  width={bar.barW + 3}
                  height={bar.barH + 3}
                  rx={4}
                  fill="none"
                  className="stroke-primary"
                  strokeWidth={2}
                />
              )}

              {/* Wider hit target for touch / hover */}
              <rect
                x={bar.x - hitPad / 2}
                y={padTop}
                width={bar.barW + hitPad}
                height={chartH}
                fill="transparent"
                className="cursor-pointer"
                onPointerEnter={() => setHoveredDate(p.date)}
                onPointerLeave={() => {
                  if (pinnedTooltipDate !== p.date) setHoveredDate(null);
                  setActiveDate((cur) => (cur === p.date ? null : cur));
                  clearLongPress();
                }}
                onPointerDown={(e) => {
                  if (e.pointerType === "mouse" && e.button !== 0) return;
                  handlePointerDown(bar, e.clientX, e.clientY);
                }}
                onPointerMove={(e) => handlePointerMove(e.clientX, e.clientY)}
                onPointerUp={() => handlePointerUp(bar)}
                onPointerCancel={() => {
                  clearLongPress();
                  setActiveDate(null);
                }}
              />

              {showLabel && (
                <text
                  x={bar.centerX}
                  y={height - 6}
                  textAnchor="middle"
                  className={cn(
                    "fill-muted-foreground text-[9px]",
                    isToday && "fill-primary font-semibold",
                    (isSelected || isActive) && "fill-foreground font-semibold",
                  )}
                >
                  {formatShortDate(p.date)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ChartTooltip({
  bar,
  dateLabel,
  valueLabel,
  chartWidth,
  tooltipReserve,
}: {
  bar: BarLayout;
  dateLabel: string;
  valueLabel: string;
  chartWidth: number;
  tooltipReserve: number;
}) {
  const leftPct = (bar.centerX / chartWidth) * 100;
  const topPx = tooltipReserve - 8;

  return (
    <div
      className="pointer-events-none absolute z-20 -translate-x-1/2"
      style={{ left: `${leftPct}%`, top: topPx }}
    >
      <div className="whitespace-nowrap rounded-lg border bg-popover px-2.5 py-1.5 text-popover-foreground shadow-md text-[11px] leading-tight sm:text-xs">
        <p className="font-semibold text-foreground">{dateLabel}</p>
        <p className="mt-0.5 tabular-nums text-muted-foreground">{valueLabel}</p>
      </div>
    </div>
  );
}

function WeeklyRow({ weekly, title }: { weekly: WeeklyAvg[]; title: string }) {
  return (
    <div className="rounded-xl border border-dashed bg-muted/15 px-2.5 py-2 sm:px-3 sm:py-2.5">
      <p className="text-[10px] font-medium text-muted-foreground sm:text-[11px]">{title}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5 sm:mt-2 sm:gap-2">
        {weekly.map((w) => (
          <div
            key={w.label}
            className="flex min-w-[3.75rem] flex-col items-center rounded-lg border bg-background/70 px-2 py-1 sm:min-w-[4.5rem] sm:py-1.5"
          >
            <span className="text-[9px] font-medium text-muted-foreground sm:text-[10px]">
              {w.label}
            </span>
            <span className="text-xs font-semibold tabular-nums sm:text-sm">{w.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
