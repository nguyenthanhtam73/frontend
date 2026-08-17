"use client";

import type { RoutineDTO, RoutineHistoryDTO } from "@/lib/types/routine";
import { cn } from "@/lib/utils";

import { addDaysUTC, entryCompletionPct, hasAnyCompleted } from "./history-stats";
import { formatShortDate } from "../routine-helpers";

const MINI_DAYS = 5;

type Labels = {
  streak: (n: number) => string;
  streakUnit: string;
  today: string;
  yesterday: string;
  openHistory: string;
};

/**
 * Compact last-N-days strip for above-the-fold streak context.
 * Full HistoryStrip stays at the bottom of the page.
 */
export function MiniStreakStrip({
  history,
  todayISO,
  labels,
  onSelectDay,
  onOpenHistory,
  embedded = false,
}: {
  history: RoutineHistoryDTO | null;
  todayISO: string;
  labels: Labels;
  onSelectDay?: (date: string) => void;
  onOpenHistory?: () => void;
  /** Inside RoutineStatusPanel — skip outer card chrome. */
  embedded?: boolean;
}) {
  const streak = history?.streak_days ?? 0;
  const entries = history?.entries ?? [];
  if (entries.length === 0 && streak === 0) return null;

  const byDate = new Map(entries.map((e) => [e.routine_date, e]));
  const dates: string[] = [];
  for (let i = MINI_DAYS - 1; i >= 0; i--) {
    dates.push(addDaysUTC(todayISO, -i));
  }

  return (
    <div
      className={cn(
        embedded
          ? "border-t border-border/50 pt-2.5"
          : "rounded-xl border border-border/80 bg-card px-3 py-2.5 sm:px-3.5 sm:py-3",
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold tabular-nums text-foreground">
          {labels.streak(streak)}{" "}
          <span className="font-normal text-muted-foreground">{labels.streakUnit}</span>
        </p>
        {onOpenHistory ? (
          <button
            type="button"
            onClick={onOpenHistory}
            className="text-[11px] font-medium text-primary underline-offset-2 hover:underline"
          >
            {labels.openHistory}
          </button>
        ) : null}
      </div>
      <ol className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {dates.map((date) => (
          <MiniDayPill
            key={date}
            date={date}
            todayISO={todayISO}
            entry={byDate.get(date)}
            labels={labels}
            onClick={() => onSelectDay?.(date)}
          />
        ))}
      </ol>
    </div>
  );
}

function MiniDayPill({
  date,
  todayISO,
  entry,
  labels,
  onClick,
}: {
  date: string;
  todayISO: string;
  entry?: RoutineDTO;
  labels: Pick<Labels, "today" | "yesterday">;
  onClick?: () => void;
}) {
  const isToday = date === todayISO;
  const label = humanize(date, todayISO, labels.today, labels.yesterday);
  const pct = entry ? entryCompletionPct(entry) : null;
  const ticked = entry ? hasAnyCompleted(entry) : false;

  return (
    <li className="shrink-0">
      <button
        type="button"
        onClick={onClick}
        disabled={!entry}
        title={entry ? `${label} · ${pct}%` : label}
        data-testid={isToday ? "routine-mini-streak-today" : undefined}
        className={cn(
          "flex min-w-[3.25rem] flex-col items-center rounded-lg border px-2 py-1.5 text-center transition-colors",
          isToday && "border-primary/50 bg-primary/10",
          !isToday && entry && "border-border/80 bg-muted/30 hover:bg-muted/50",
          !entry && "border-dashed border-border/60 bg-muted/15 opacity-70",
        )}
      >
        <span className="max-w-[4rem] truncate text-[9px] font-semibold leading-tight">
          {label}
        </span>
        <span className="mt-0.5 text-sm font-bold tabular-nums leading-none">
          {pct != null ? `${pct}%` : "—"}
        </span>
        <span
          className={cn(
            "mt-1 size-1.5 rounded-full",
            ticked ? "bg-emerald-500" : "bg-muted-foreground/30",
          )}
          aria-hidden
        />
      </button>
    </li>
  );
}

function humanize(
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
