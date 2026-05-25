"use client";

import { CircleCheck, CloudUpload, Sparkles, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Compact status banner shown above the editor when there is already a
 * routine on file. Combines: badge ("Saved" / "AI suggested" / "Carried over"),
 * progress (`completed/total` + bar), and an optional autosave indicator.
 *
 * Three tone presets keep the visual hierarchy clear at a glance:
 *   - emerald: today is saved → green check
 *   - primary: AI-suggested but not yet saved → primary tint
 *   - amber: carried-over draft → soft warning so the user knows to confirm
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
        "flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2.5 text-xs sm:text-sm",
        toneCls,
      )}
    >
      <span className="inline-flex items-center gap-2 font-medium">
        <Icon className="size-4" aria-hidden />
        <span>{badge}</span>
      </span>
      {autoSaving ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground in-animate animate-in fade-in duration-200">
          <CloudUpload className="size-3 animate-pulse" aria-hidden />
          {labels.autosaving}
        </span>
      ) : null}
      <span className="ml-auto inline-flex items-center gap-3 text-foreground/70">
        <span className="tabular-nums">
          {completed}/{total}
        </span>
        <span className="relative inline-flex h-1.5 w-24 overflow-hidden rounded-full bg-muted">
          <span
            className="absolute inset-y-0 left-0 bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
            aria-hidden
          />
        </span>
      </span>
    </div>
  );
}
