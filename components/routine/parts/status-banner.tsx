"use client";

import { CloudUpload } from "lucide-react";

import { cn } from "@/lib/utils";

import type { RoutineSourceInfo } from "../routine-helpers";
import { RoutineSourceBadge, type RoutineSourceLabels } from "./routine-source-badge";

/**
 * Compact status banner: routine source + progress + autosave indicator.
 * Stacks vertically on mobile so source copy and progress stay readable.
 */
export function StatusBanner({
  sourceInfo,
  sourceLabels,
  autoSaving,
  labels,
  completed,
  total,
  progressPct,
}: {
  sourceInfo: RoutineSourceInfo;
  sourceLabels: RoutineSourceLabels;
  autoSaving: boolean;
  labels: { autosaving: string };
  completed: number;
  total: number;
  progressPct: number;
}) {
  const tone =
    sourceInfo.kind === "saved_today"
      ? "ok"
      : sourceInfo.kind === "ai_suggested"
        ? "accent"
        : sourceInfo.kind === "onboarding_seed"
          ? "seed"
          : "muted";

  const shellCls =
    tone === "ok"
      ? "border-emerald-500/25 bg-emerald-500/[0.03]"
      : tone === "accent"
        ? "border-primary/25 bg-primary/[0.03]"
        : tone === "seed"
          ? "border-teal-500/25 bg-teal-500/[0.03]"
          : "border-amber-500/25 bg-amber-500/[0.03]";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border px-3.5 py-3.5 sm:gap-4 sm:px-4 sm:py-4",
        shellCls,
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <RoutineSourceBadge info={sourceInfo} labels={sourceLabels} className="flex-1" />
        {autoSaving ? (
          <span className="inline-flex min-h-9 shrink-0 items-center gap-1.5 self-start rounded-full bg-background/80 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground in-animate animate-in fade-in duration-200">
            <CloudUpload className="size-3.5 animate-pulse" aria-hidden />
            {labels.autosaving}
          </span>
        ) : null}
      </div>

      <div className="flex w-full items-center gap-3 border-t border-border/50 pt-3 sm:pt-3">
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
