"use client";

import { Calendar, Flame } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { RoutineHistoryDTO } from "@/lib/types/routine";
import { cn } from "@/lib/utils";

import { formatShortDate } from "../routine-helpers";

/**
 * Compact horizontal strip of the last N routine days. Doubles as a "did I
 * actually do this?" reality check + a streak signal. Visual choices:
 *   - Streak pill uses a flame and goes from amber → red as the streak grows
 *     (subtle motivator; capped tone change at ~7 days).
 *   - Each day pill has a slim bar that fills with completion %.
 *   - First two pills are labelled "today" / "yesterday" so the dates feel
 *     human, not just digits.
 */
export function HistoryStrip({
  history,
  todayISO,
  labels,
}: {
  history: RoutineHistoryDTO | null;
  todayISO: string;
  labels: {
    title: string;
    hint: string;
    empty: string;
    streak: (n: number) => string;
    avg: string;
    today: string;
    yesterday: string;
    done: (done: number, total: number) => string;
  };
}) {
  const entries = history?.entries ?? [];
  const avgPct = Math.round(((history?.completion_avg ?? 0) as number) * 100);
  const streak = history?.streak_days ?? 0;
  const streakTone = streakColorFor(streak);

  return (
    <Card>
      <CardContent className="space-y-3 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight">{labels.title}</p>
            <p className="text-xs leading-snug text-muted-foreground">{labels.hint}</p>
          </div>
          {history && entries.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-medium tabular-nums",
                  streakTone,
                )}
              >
                <Flame className="size-3.5" aria-hidden />
                {labels.streak(streak)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-muted-foreground">
                <Calendar className="size-3" aria-hidden />
                <span className="tabular-nums">{avgPct}%</span>
                <span>{labels.avg}</span>
              </span>
            </div>
          ) : null}
        </div>

        {entries.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-muted/20 px-3 py-3 text-xs text-muted-foreground">
            {labels.empty}
          </p>
        ) : (
          <div className="-mx-1 overflow-x-auto pb-1 [scrollbar-width:thin]">
            <ol className="flex min-w-full gap-2 px-1">
              {entries.map((e) => {
                const total = e.morning.length + e.evening.length;
                const done =
                  e.morning.filter((s) => s.completed).length +
                  e.evening.filter((s) => s.completed).length;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                const dateLabel = humanizeDateLabel(
                  e.routine_date,
                  todayISO,
                  labels.today,
                  labels.yesterday,
                );
                const isToday = e.routine_date === todayISO;
                return (
                  <li
                    key={e.routine_date}
                    className={cn(
                      "min-w-32 shrink-0 rounded-xl border bg-card/60 p-2.5 text-xs transition-colors",
                      isToday
                        ? "border-primary/40 ring-1 ring-primary/20"
                        : "hover:border-primary/30",
                    )}
                    title={`${e.routine_date} · ${pct}%`}
                  >
                    <p
                      className={cn(
                        "font-medium",
                        isToday ? "text-primary" : "text-foreground",
                      )}
                    >
                      {dateLabel}
                    </p>
                    <p className="mt-0.5 text-muted-foreground">{labels.done(done, total)}</p>
                    <div className="mt-1.5 inline-flex h-1 w-full overflow-hidden rounded-full bg-muted">
                      <span
                        className={cn(
                          "transition-[width] duration-500 ease-out",
                          pct >= 80
                            ? "bg-emerald-500"
                            : pct >= 40
                              ? "bg-primary"
                              : "bg-amber-400",
                        )}
                        style={{ width: `${pct}%` }}
                        aria-hidden
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
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
  // Only treat "yesterday" as the day immediately before today so the label
  // doesn't get out of sync if the user time-warps via DevTools.
  const dToday = new Date(`${todayISO}T00:00:00Z`);
  const dEntry = new Date(`${iso}T00:00:00Z`);
  const diffDays = Math.round((dToday.getTime() - dEntry.getTime()) / (24 * 3600 * 1000));
  if (diffDays === 1) return yesterdayLabel;
  return formatShortDate(iso);
}
