"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ChevronDown } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { RoutineDTO, RoutineHistoryDTO } from "@/lib/types/routine";
import { cn } from "@/lib/utils";

import { CompletionChart } from "./completion-chart";
import {
  avgCompletion,
  buildCalendarRange,
  buildChartPoints,
  computeBestStreak,
  computeTrend,
  entryCompletionPct,
} from "./history-stats";
import { HistoryDaySheet, type HistoryDaySheetLabels } from "./history-day-sheet";
import { StreakSummary } from "./streak-summary";
import { formatShortDate } from "../routine-helpers";

export type HistoryRangeDays = 14 | 30;

type HistoryLabels = HistoryDaySheetLabels & {
  title: string;
  hint: string;
  empty: string;
  streak: (n: number) => string;
  streakUnit: string;
  avg: string;
  bestStreak: string;
  bestStreakUnit: string;
  tapHint: string;
  chartTitle: string;
  trendImproving: string;
  trendDeclining: string;
  trendSteady: string;
  weeklyAvg: string;
  weekLabel: (n: number) => string;
  range14: string;
  range30: string;
  rangeLabel: string;
  noSave: string;
};

/**
 * History section — streak hero, completion chart, and day pills that open
 * a bottom sheet (mobile) or dialog (desktop).
 */
export function HistoryStrip({
  history,
  todayISO,
  labels,
  editAllowed = true,
  onEditDay,
  onSelectToday,
  onEditLockedAttempt,
}: {
  history: RoutineHistoryDTO | null;
  todayISO: string;
  labels: HistoryLabels;
  editAllowed?: boolean;
  onEditDay?: (entry: RoutineDTO) => void;
  onSelectToday?: () => void;
  onEditLockedAttempt?: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const didInitialScroll = useRef(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [rangeDays, setRangeDays] = useState<HistoryRangeDays>(14);

  const allEntries = useMemo(() => history?.entries ?? [], [history?.entries]);
  const streak = history?.streak_days ?? 0;

  const calendarDays = useMemo(
    () => buildCalendarRange(todayISO, rangeDays),
    [todayISO, rangeDays],
  );

  const entriesByDate = useMemo(
    () => new Map(allEntries.map((e) => [e.routine_date, e])),
    [allEntries],
  );

  const filteredEntries = useMemo(
    () => calendarDays.map((d) => entriesByDate.get(d)).filter(Boolean) as RoutineDTO[],
    [calendarDays, entriesByDate],
  );

  const avgPct = Math.round(avgCompletion(filteredEntries) * 100);
  const bestStreak = computeBestStreak(allEntries, calendarDays);
  const chartPoints = buildChartPoints(allEntries, calendarDays);
  const trend = computeTrend(chartPoints);

  const selectedEntry = selectedDate ? (entriesByDate.get(selectedDate) ?? null) : null;

  useEffect(() => {
    didInitialScroll.current = false;
  }, [rangeDays]);

  useEffect(() => {
    if (didInitialScroll.current) return;
    const el = scrollRef.current;
    if (!el || calendarDays.length === 0) return;
    const pill = el.querySelector<HTMLElement>(`[data-date="${todayISO}"]`);
    pill?.scrollIntoView({ behavior: "auto", inline: "center", block: "nearest" });
    didInitialScroll.current = true;
  }, [calendarDays, todayISO]);

  function handleDayClick(date: string) {
    const entry = entriesByDate.get(date);
    if (!entry) return;
    if (selectedDate === date) return;
    setSelectedDate(date);
  }

  function handleEdit(entry: RoutineDTO) {
    onEditDay?.(entry);
    if (entry.routine_date === todayISO) {
      onSelectToday?.();
    }
  }

  const handleSheetClose = useCallback(() => {
    setSelectedDate(null);
  }, []);

  const hasAnyHistory = allEntries.length > 0;

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="space-y-4 p-3.5 sm:space-y-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-2.5 sm:gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold tracking-tight sm:text-lg">{labels.title}</p>
              <p className="mt-0.5 hidden text-sm leading-snug text-muted-foreground sm:block sm:text-xs">
                {labels.hint}
              </p>
            </div>
            {hasAnyHistory ? (
              <RangeToggle
                value={rangeDays}
                onChange={setRangeDays}
                labels={{
                  range14: labels.range14,
                  range30: labels.range30,
                  rangeLabel: labels.rangeLabel,
                }}
              />
            ) : null}
          </div>

          {hasAnyHistory ? (
            <>
              <StreakSummary
                streak={streak}
                avgPct={avgPct}
                bestStreak={bestStreak}
                labels={{
                  streak: labels.streak,
                  streakUnit: labels.streakUnit,
                  avg: labels.avg,
                  bestStreak: labels.bestStreak,
                  bestStreakUnit: labels.bestStreakUnit,
                }}
              />

              <CompletionChart
                points={chartPoints}
                trend={trend}
                todayISO={todayISO}
                selectedDate={selectedDate}
                labels={{
                  title: labels.chartTitle,
                  trendImproving: labels.trendImproving,
                  trendDeclining: labels.trendDeclining,
                  trendSteady: labels.trendSteady,
                  weeklyAvg: labels.weeklyAvg,
                  weekLabel: labels.weekLabel,
                  today: labels.today,
                  yesterday: labels.yesterday,
                  detailPct: labels.detailPct,
                  noSave: labels.noSave,
                }}
                onSelectDay={handleDayClick}
              />
            </>
          ) : null}

          {allEntries.length === 0 ? (
            <p className="rounded-xl border border-dashed bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
              {labels.empty}
            </p>
          ) : (
            <>
              <div className="border-t border-border/50 pt-3 sm:pt-4">
                <p className="text-[11px] font-medium text-muted-foreground sm:text-xs">
                  {labels.tapHint}
                </p>
                <div
                  ref={scrollRef}
                  className="-mx-1 mt-1.5 overflow-x-auto overscroll-x-contain px-1 py-1 pb-1.5 [scrollbar-width:thin] snap-x snap-mandatory scroll-smooth touch-pan-x sm:mt-2 sm:py-1.5 sm:pb-2"
                >
                  <ol className="flex min-w-min gap-2.5 px-1">
                    {calendarDays.map((date) => {
                      const entry = entriesByDate.get(date);
                      return (
                        <HistoryDayPill
                          key={date}
                          date={date}
                          entry={entry}
                          todayISO={todayISO}
                          selected={selectedDate === date}
                          labels={labels}
                          onClick={() => handleDayClick(date)}
                        />
                      );
                    })}
                  </ol>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <HistoryDaySheet
        open={!!selectedEntry}
        entry={selectedEntry}
        todayISO={todayISO}
        labels={labels}
        editAllowed={editAllowed}
        onClose={handleSheetClose}
        onEdit={handleEdit}
        onEditLockedAttempt={onEditLockedAttempt}
      />
    </>
  );
}

function RangeToggle({
  value,
  onChange,
  labels,
}: {
  value: HistoryRangeDays;
  onChange: (v: HistoryRangeDays) => void;
  labels: { range14: string; range30: string; rangeLabel: string };
}) {
  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <span className="text-[10px] font-medium text-muted-foreground">{labels.rangeLabel}</span>
      <div
        className="relative inline-grid grid-cols-2 rounded-lg border border-border/80 bg-muted/40 p-0.5 dark:bg-muted/25"
        role="group"
        aria-label={labels.rangeLabel}
      >
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0.5 w-[calc(50%-2px)] rounded-md bg-background shadow-sm transition-[left] duration-200 ease-out dark:bg-background/90 dark:shadow-md",
            value === 14 ? "left-0.5" : "left-[calc(50%+1px)]",
          )}
        />
        {([14, 30] as const).map((days) => (
          <button
            key={days}
            type="button"
            onClick={() => onChange(days)}
            className={cn(
              "relative z-10 min-w-[4.25rem] rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors duration-200 sm:min-w-[4.75rem]",
              value === days
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground/80",
            )}
          >
            {days === 14 ? labels.range14 : labels.range30}
          </button>
        ))}
      </div>
    </div>
  );
}

function HistoryDayPill({
  date,
  entry,
  todayISO,
  selected,
  labels,
  onClick,
}: {
  date: string;
  entry?: RoutineDTO;
  todayISO: string;
  selected: boolean;
  labels: HistoryLabels;
  onClick: () => void;
  }) {
  const hasEntry = !!entry;
  const pct = entry ? entryCompletionPct(entry) : 0;
  const total = entry ? entry.morning.length + entry.evening.length : 0;
  const done = entry
    ? entry.morning.filter((s) => s.completed).length +
      entry.evening.filter((s) => s.completed).length
    : 0;

  const dateLabel = humanizeDateLabel(date, todayISO, labels.today, labels.yesterday);
  const isToday = date === todayISO;
  const isYesterday = isYesterdayDate(date, todayISO);
  const tooltip = hasEntry
    ? `${date} · ${labels.detailPct(pct)} · ${labels.done(done, total)}`
    : `${date} · ${labels.noSave}`;

  return (
    <li className="snap-start">
      <button
        type="button"
        data-date={date}
        title={tooltip}
        disabled={!hasEntry}
        aria-expanded={selected}
        aria-haspopup={hasEntry ? "dialog" : undefined}
        aria-label={
          hasEntry
            ? `${dateLabel}, ${labels.done(done, total)}, ${labels.detailPct(pct)}`
            : `${dateLabel}, ${labels.noSave}`
        }
        onClick={onClick}
        className={cn(
          "group flex min-h-[5.5rem] min-w-[4.25rem] flex-col rounded-2xl border px-2.5 py-2.5 text-left text-xs transition-[border-color,background-color,box-shadow,transform] duration-200 ease-out sm:min-h-[6.25rem] sm:min-w-[5.5rem] sm:px-3 sm:py-3",
          hasEntry && "active:scale-[0.97]",
          !hasEntry &&
            "cursor-default border-dashed border-border/60 bg-muted/15 opacity-70",
          hasEntry &&
            isToday &&
            "border-primary/70 bg-primary/12 shadow-md ring-2 ring-inset ring-primary/35 hover:border-primary hover:bg-primary/16 hover:shadow-lg",
          hasEntry &&
            isYesterday &&
            !isToday &&
            "border-indigo-500/55 bg-indigo-500/12 ring-1 ring-inset ring-indigo-500/35 hover:border-indigo-500/70 hover:bg-indigo-500/16 hover:shadow-md",
          hasEntry &&
            !isToday &&
            !isYesterday &&
            "border-border/80 bg-card/80 hover:border-primary/40 hover:bg-card hover:shadow-md",
          hasEntry &&
            selected &&
            "border-primary/80 bg-primary/14 shadow-lg ring-2 ring-inset ring-primary/50",
        )}
      >
        <span className="flex items-center gap-1.5">
          {isToday ? (
            <span className="size-2 shrink-0 rounded-full bg-primary shadow-[0_0_6px] shadow-primary/50" aria-hidden />
          ) : null}
          <span
            className={cn(
              "text-[11px] font-bold leading-tight tracking-tight",
              isToday
                ? "text-primary"
                : isYesterday
                  ? "text-indigo-700 dark:text-indigo-300"
                  : hasEntry
                    ? "text-foreground/90"
                    : "text-muted-foreground",
            )}
          >
            {dateLabel}
          </span>
        </span>

        {hasEntry ? (
          <>
            <span className="mt-1 text-base font-bold tabular-nums leading-none sm:mt-1.5 sm:text-lg">
              {pct}%
            </span>
            <span className="mt-1 tabular-nums text-[10px] text-muted-foreground">
              {labels.done(done, total)}
            </span>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted/80">
              <span
                className={cn(
                  "block h-full rounded-full transition-[width] duration-500 ease-out",
                  pct >= 80 ? "bg-emerald-500" : pct >= 40 ? "bg-primary" : "bg-amber-400",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </>
        ) : (
          <span className="mt-3 text-[10px] font-medium text-muted-foreground/80">
            {labels.noSave}
          </span>
        )}

        <div className="mt-1.5 flex h-3.5 shrink-0 items-center justify-center" aria-hidden>
          {hasEntry ? (
            <ChevronDown
              className={cn(
                "size-3.5 text-primary transition-opacity duration-200",
                selected ? "opacity-100" : "opacity-0 group-hover:opacity-60",
              )}
            />
          ) : null}
        </div>
      </button>
    </li>
  );
}

function isYesterdayDate(iso: string, todayISO: string): boolean {
  const dToday = new Date(`${todayISO}T00:00:00Z`);
  const dEntry = new Date(`${iso}T00:00:00Z`);
  const diffDays = Math.round((dToday.getTime() - dEntry.getTime()) / (24 * 3600 * 1000));
  return diffDays === 1;
}

function humanizeDateLabel(
  iso: string,
  todayISO: string,
  todayLabel: string,
  yesterdayLabel: string,
): string {
  if (iso === todayISO) return todayLabel;
  const dToday = new Date(`${todayISO}T00:00:00Z`);
  const dEntry = new Date(`${iso}T00:00:00Z`);
  const diffDays = Math.round((dToday.getTime() - dEntry.getTime()) / (24 * 3600 * 1000));
  if (diffDays === 1) return yesterdayLabel;
  return formatShortDate(iso);
}
