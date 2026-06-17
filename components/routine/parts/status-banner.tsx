"use client";

import { CircleCheck, CloudUpload, Sparkles, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Compact status banner: badge + progress + autosave indicator.
 * Stacks vertically on mobile so the progress bar stays readable.
 */
export function StatusBanner({
  saved,
  source,
  autoSaving,
  labels,
  completed,
  total,
  progressPct,
}: {
  saved: boolean;
  source: string;
  autoSaving: boolean;
  labels: { saved: string; carried: string; ai: string; autosaving: string };
  completed: number;
  total: number;
  progressPct: number;
}) {
  let badge = labels.saved;
  let tone: "ok" | "muted" | "accent" = "ok";
  let Icon = CircleCheck;
  if (!saved && source === "ai_suggested") {
    badge = labels.ai;
    tone = "accent";
    Icon = Sparkles;
  } else if (!saved) {
    badge = labels.carried;
    tone = "muted";
    Icon = Sun;
  }
  const toneCls =
    tone === "ok"
      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
      : tone === "accent"
        ? "border-primary/30 bg-primary/5 text-primary"
        : "border-amber-500/30 bg-amber-500/5 text-amber-800 dark:text-amber-200";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border px-3.5 py-3 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:px-3 sm:py-2.5 sm:text-sm",
        toneCls,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 font-medium">
          <Icon className="size-4 shrink-0" aria-hidden />
          <span className="leading-snug">{badge}</span>
        </span>
        {autoSaving ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-background/70 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground in-animate animate-in fade-in duration-200">
            <CloudUpload className="size-3.5 animate-pulse" aria-hidden />
            {labels.autosaving}
          </span>
        ) : null}
      </div>

      <div className="flex w-full items-center gap-3 sm:ml-auto sm:w-auto">
        <span className="shrink-0 text-sm tabular-nums text-foreground/80">
          {completed}/{total}
        </span>
        <div
          className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted sm:h-1.5 sm:w-28 sm:flex-none"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${completed}/${total}`}
        >
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="shrink-0 text-xs tabular-nums text-foreground/60 sm:hidden">
          {progressPct}%
        </span>
      </div>
    </div>
  );
}
