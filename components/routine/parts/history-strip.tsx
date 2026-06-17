"use client";

import { useEffect, useRef, useState } from "react";

import { Calendar, ChevronDown, Flame } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { RoutineDTO, RoutineHistoryDTO } from "@/lib/types/routine";
import { cn } from "@/lib/utils";

import { HistoryDaySheet, type HistoryDaySheetLabels } from "./history-day-sheet";
import { formatShortDate } from "../routine-helpers";

type HistoryLabels = HistoryDaySheetLabels & {
  title: string;
  hint: string;
  empty: string;
  streak: (n: number) => string;
  avg: string;
  tapHint: string;
};

/**
 * Horizontal history strip — day pills open a bottom sheet (mobile) or dialog (desktop).
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
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const entries = history?.entries ?? [];
  const avgPct = Math.round(((history?.completion_avg ?? 0) as number) * 100);
  const streak = history?.streak_days ?? 0;
  const streakTone = streakColorFor(streak);
  const selectedEntry = entries.find((e) => e.routine_date === selectedDate) ?? null;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || entries.length === 0) return;
    const pill = el.querySelector<HTMLElement>(`[data-date="${todayISO}"]`);
    pill?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [entries, todayISO]);

  function handleDayClick(entry: RoutineDTO) {
    setSelectedDate((cur) => (cur === entry.routine_date ? null : entry.routine_date));
  }

  function handleEdit(entry: RoutineDTO) {
    onEditDay?.(entry);
    if (entry.routine_date === todayISO) {
      onSelectToday?.();
    }
  }

  return (
    <>
      <Card>
        <CardContent className="space-y-4 p-3.5 sm:p-6">
          <div className="space-y-3">
            <div className="min-w-0">
              <p className="text-base font-semibold tracking-tight sm:text-sm">{labels.title}</p>
              <p className="mt-0.5 text-sm leading-snug text-muted-foreground sm:text-xs">
                {labels.hint}
              </p>
            </div>

            {history && entries.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
                <SummaryStat
                  icon={<Flame className="size-4" aria-hidden />}
                  tone={streakTone}
                  value={String(streak)}
                  sub={labels.streak(streak)}
                />
                <SummaryStat
                  icon={<Calendar className="size-4" aria-hidden />}
                  tone="border-primary/30 bg-primary/5 text-primary"
                  value={`${avgPct}%`}
                  sub={labels.avg}
                />
              </div>
            ) : null}
          </div>

          {entries.length === 0 ? (
            <p className="rounded-xl border border-dashed bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
              {labels.empty}
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">{labels.tapHint}</p>
              <div
                ref={scrollRef}
                className="-mx-1 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:thin] snap-x snap-mandatory scroll-smooth touch-pan-x"
              >
                <ol className="flex min-w-min gap-2 px-1">
                  {entries.map((e) => (
                    <HistoryDayPill
                      key={e.routine_date}
                      entry={e}
                      todayISO={todayISO}
                      selected={selectedDate === e.routine_date}
                      labels={labels}
                      onClick={() => handleDayClick(e)}
                    />
                  ))}
                </ol>
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
        onClose={() => setSelectedDate(null)}
        onEdit={handleEdit}
        onEditLockedAttempt={onEditLockedAttempt}
      />
    </>
  );
}

function SummaryStat({
  icon,
  tone,
  value,
  sub,
}: {
  icon: React.ReactNode;
  tone: string;
  value: string;
  sub: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 rounded-xl border px-3 py-2.5 sm:min-w-[9rem]", tone)}>
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-background/70">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-lg font-semibold tabular-nums leading-none">{value}</p>
        <p className="mt-1 truncate text-[11px] font-medium opacity-80">{sub}</p>
      </div>
    </div>
  );
}

function HistoryDayPill({
  entry,
  todayISO,
  selected,
  labels,
  onClick,
}: {
  entry: RoutineDTO;
  todayISO: string;
  selected: boolean;
  labels: HistoryLabels;
  onClick: () => void;
}) {
  const total = entry.morning.length + entry.evening.length;
  const done =
    entry.morning.filter((s) => s.completed).length +
    entry.evening.filter((s) => s.completed).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const dateLabel = humanizeDateLabel(
    entry.routine_date,
    todayISO,
    labels.today,
    labels.yesterday,
  );
  const isToday = entry.routine_date === todayISO;
  const isYesterday = isYesterdayDate(entry.routine_date, todayISO);
  const tooltip = `${entry.routine_date} · ${labels.detailPct(pct)} · ${labels.done(done, total)}`;

  return (
    <li className="snap-start">
      <button
        type="button"
        data-date={entry.routine_date}
        title={tooltip}
        aria-expanded={selected}
        aria-haspopup="dialog"
        aria-label={`${dateLabel}, ${labels.done(done, total)}, ${labels.detailPct(pct)}`}
        onClick={onClick}
        className={cn(
          "flex min-h-[5.5rem] min-w-[5.75rem] flex-col rounded-xl border px-3 py-2.5 text-left text-xs transition-all duration-200 active:scale-[0.98] sm:min-w-[6.5rem]",
          isToday &&
            "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/25",
          isYesterday &&
            !isToday &&
            "border-indigo-400/35 bg-indigo-500/8 ring-1 ring-indigo-400/25",
          !isToday &&
            !isYesterday &&
            "border-border/80 bg-card/60 hover:border-primary/30 hover:bg-card",
          selected && "ring-2 ring-primary/40 shadow-md",
        )}
      >
        <span
          className={cn(
            "font-semibold leading-tight",
            isToday ? "text-primary" : isYesterday ? "text-indigo-700 dark:text-indigo-300" : "",
          )}
        >
          {dateLabel}
        </span>
        <span className="mt-1 tabular-nums text-muted-foreground">{labels.done(done, total)}</span>
        <span className="mt-0.5 text-[10px] font-medium tabular-nums text-foreground/60">
          {labels.detailPct(pct)}
        </span>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <span
            className={cn(
              "block h-full rounded-full transition-[width] duration-500 ease-out",
              pct >= 80 ? "bg-emerald-500" : pct >= 40 ? "bg-primary" : "bg-amber-400",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        {selected ? (
          <ChevronDown className="mt-1.5 size-3.5 self-center text-primary" aria-hidden />
        ) : null}
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

function streakColorFor(n: number): string {
  if (n >= 7) return "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-200";
  if (n >= 3)
    return "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-200";
  if (n >= 1)
    return "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-200";
  return "border-muted bg-muted/20 text-muted-foreground";
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
