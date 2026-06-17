"use client";

import { Calendar, Flame, Trophy } from "lucide-react";

import { cn } from "@/lib/utils";

type StreakSummaryLabels = {
  streak: (n: number) => string;
  streakUnit: string;
  avg: string;
  bestStreak: string;
  bestStreakUnit: string;
};

export function StreakSummary({
  streak,
  avgPct,
  bestStreak,
  labels,
}: {
  streak: number;
  avgPct: number;
  bestStreak: number;
  labels: StreakSummaryLabels;
}) {
  const streakTone = streakHeroTone(streak);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-3.5 sm:p-5",
        streakTone.container,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-6 -top-6 size-24 rounded-full blur-2xl sm:size-28",
          streakTone.glow,
        )}
        aria-hidden
      />

      <div className="relative grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr] sm:items-center sm:gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <span
            className={cn(
              "inline-flex size-12 shrink-0 items-center justify-center rounded-2xl shadow-sm sm:size-16",
              streakTone.icon,
            )}
          >
            <Flame className="size-6 sm:size-8" aria-hidden strokeWidth={2.25} />
          </span>
          <div className="min-w-0">
            <p className={cn("text-[11px] font-semibold uppercase tracking-wider", streakTone.label)}>
              {labels.streak(streak)}
            </p>
            <p className="mt-0.5 flex items-baseline gap-1.5">
              <span
                className={cn(
                  "text-3xl font-bold tabular-nums leading-none tracking-tight sm:text-5xl",
                  streakTone.value,
                )}
              >
                {streak}
              </span>
              <span className={cn("text-sm font-medium", streakTone.label)}>{labels.streakUnit}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:contents">
          <StatTile
            icon={<Calendar className="size-4" aria-hidden />}
            value={`${avgPct}%`}
            label={labels.avg}
            tone="avg"
          />

          {bestStreak > 0 ? (
            <StatTile
              icon={<Trophy className="size-4" aria-hidden />}
              value={String(bestStreak)}
              label={labels.bestStreak}
              sub={labels.bestStreakUnit}
              tone="best"
            />
          ) : (
            <div className="hidden sm:block" aria-hidden />
          )}
        </div>
      </div>
    </div>
  );
}

function StatTile({
  icon,
  value,
  label,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  sub?: string;
  tone: "avg" | "best";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 sm:gap-3 sm:px-3.5 sm:py-3",
        tone === "avg" &&
          "border-primary/30 bg-background/75 text-primary dark:border-primary/40 dark:bg-background/55 dark:text-primary",
        tone === "best" &&
          "border-amber-500/35 bg-background/75 text-amber-800 dark:border-amber-400/40 dark:bg-background/55 dark:text-amber-100",
      )}
    >
      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-background shadow-xs dark:bg-background/90 sm:size-9">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-lg font-bold tabular-nums leading-none sm:text-2xl">{value}</p>
        <p className="mt-1 text-[10px] font-medium leading-snug opacity-90 sm:text-[11px]">{label}</p>
        {sub ? (
          <p className="text-[9px] font-medium opacity-70 sm:text-[10px]">{sub}</p>
        ) : null}
      </div>
    </div>
  );
}

function streakHeroTone(n: number): {
  container: string;
  icon: string;
  glow: string;
  label: string;
  value: string;
} {
  if (n >= 7) {
    return {
      container:
        "border-rose-500/40 bg-gradient-to-br from-rose-500/18 via-rose-500/10 to-orange-500/8 dark:from-rose-500/28 dark:via-rose-500/16 dark:to-orange-500/10 dark:border-rose-400/45",
      glow: "bg-gradient-to-br from-rose-300/30 to-transparent dark:from-rose-400/25",
      icon: "bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-rose-500/30",
      label: "text-rose-800/80 dark:text-rose-100/90",
      value: "text-rose-950 dark:text-rose-50",
    };
  }
  if (n >= 3) {
    return {
      container:
        "border-orange-500/40 bg-gradient-to-br from-orange-500/18 via-orange-500/10 to-amber-500/8 dark:from-orange-500/28 dark:via-orange-500/16 dark:to-amber-500/10 dark:border-orange-400/45",
      glow: "bg-gradient-to-br from-orange-300/30 to-transparent dark:from-orange-400/25",
      icon: "bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-orange-500/30",
      label: "text-orange-800/80 dark:text-orange-100/90",
      value: "text-orange-950 dark:text-orange-50",
    };
  }
  if (n >= 1) {
    return {
      container:
        "border-amber-500/40 bg-gradient-to-br from-amber-500/18 via-amber-500/10 to-yellow-500/8 dark:from-amber-500/28 dark:via-amber-500/16 dark:to-yellow-500/10 dark:border-amber-400/45",
      glow: "bg-gradient-to-br from-amber-300/30 to-transparent dark:from-amber-400/25",
      icon: "bg-gradient-to-br from-amber-500 to-yellow-500 text-amber-950 dark:text-white shadow-amber-500/30",
      label: "text-amber-900/80 dark:text-amber-100/90",
      value: "text-amber-950 dark:text-amber-50",
    };
  }
  return {
    container:
      "border-border/80 bg-muted/35 dark:bg-muted/25 dark:border-border/70",
    glow: "bg-gradient-to-br from-muted/40 to-transparent",
    icon: "bg-muted text-muted-foreground dark:bg-muted/80",
    label: "text-muted-foreground dark:text-muted-foreground/90",
    value: "text-foreground dark:text-foreground",
  };
}
