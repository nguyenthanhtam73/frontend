"use client";

import { AlertCircle, AlertTriangle, Plus, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { ValidationIssue } from "../routine-helpers";

/**
 * Inline validation above the AM/PM editor.
 * Renders nothing when `issues` is empty (auto-hides when fixed).
 */
export function ValidationPanel({
  issues,
  beginnerSimple,
  labels,
  onAddMorning,
  onAddEvening,
  onAddSpf,
}: {
  issues: ValidationIssue[];
  beginnerSimple: boolean;
  labels: {
    addMorning: string;
    addEvening: string;
    addSpf: string;
    blockerLabel: string;
    warningLabel: string;
  };
  onAddMorning: () => void;
  onAddEvening: () => void;
  onAddSpf: () => void;
}) {
  if (issues.length === 0) return null;

  const blockers = issues.filter((i) => i.severity === "blocker");
  const warnings = issues.filter((i) => i.severity === "warning");

  return (
    <div
      className="space-y-2 in-animate animate-in fade-in slide-in-from-top-1 duration-200"
      role="status"
      aria-live="polite"
    >
      {blockers.length > 0 ? (
        <IssueGroup
          kind="blocker"
          groupLabel={labels.blockerLabel}
          issues={blockers}
          beginnerSimple={beginnerSimple}
          actionLabels={labels}
          onAddMorning={onAddMorning}
          onAddEvening={onAddEvening}
          onAddSpf={onAddSpf}
        />
      ) : null}
      {!beginnerSimple && warnings.length > 0 ? (
        <IssueGroup
          kind="warning"
          groupLabel={labels.warningLabel}
          issues={warnings}
          beginnerSimple={beginnerSimple}
          actionLabels={labels}
          onAddMorning={onAddMorning}
          onAddEvening={onAddEvening}
          onAddSpf={onAddSpf}
        />
      ) : null}
    </div>
  );
}

function IssueGroup({
  kind,
  groupLabel,
  issues,
  beginnerSimple,
  actionLabels,
  onAddMorning,
  onAddEvening,
  onAddSpf,
}: {
  kind: "blocker" | "warning";
  groupLabel: string;
  issues: ValidationIssue[];
  beginnerSimple: boolean;
  actionLabels: { addMorning: string; addEvening: string; addSpf: string };
  onAddMorning: () => void;
  onAddEvening: () => void;
  onAddSpf: () => void;
}) {
  const isBlocker = kind === "blocker";
  const Icon = isBlocker ? AlertCircle : AlertTriangle;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border",
        isBlocker
          ? "border-amber-500/40 bg-amber-500/8"
          : "border-sky-500/35 bg-sky-500/6",
      )}
    >
      <p
        className={cn(
          "border-b px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wider",
          isBlocker
            ? "border-amber-500/20 text-amber-800 dark:text-amber-200"
            : "border-sky-500/20 text-sky-800 dark:text-sky-200",
        )}
      >
        {groupLabel}
      </p>
      <div className="divide-y divide-border/50">
        {issues.map((issue) => (
          <div
            key={issue.code}
            className="flex flex-col gap-3 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <p
              className={cn(
                "inline-flex items-start gap-2 text-sm leading-snug",
                isBlocker
                  ? "text-amber-950 dark:text-amber-50"
                  : "text-sky-950 dark:text-sky-50",
              )}
            >
              <Icon className="mt-0.5 size-4 shrink-0 opacity-80" aria-hidden />
              <span>{issue.message}</span>
            </p>
            <IssueActions
              issue={issue}
              beginnerSimple={beginnerSimple}
              labels={actionLabels}
              onAddMorning={onAddMorning}
              onAddEvening={onAddEvening}
              onAddSpf={onAddSpf}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function IssueActions({
  issue,
  beginnerSimple,
  labels,
  onAddMorning,
  onAddEvening,
  onAddSpf,
}: {
  issue: ValidationIssue;
  beginnerSimple: boolean;
  labels: { addMorning: string; addEvening: string; addSpf: string };
  onAddMorning: () => void;
  onAddEvening: () => void;
  onAddSpf: () => void;
}) {
  if (issue.code === "no_steps") {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:flex sm:shrink-0">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-11 border-amber-500/35 bg-background/90 text-sm sm:min-h-10"
          onClick={onAddMorning}
        >
          <Sun className="size-4 shrink-0 text-amber-500" aria-hidden />
          <span className="truncate">{labels.addMorning}</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-11 border-indigo-500/35 bg-background/90 text-sm sm:min-h-10"
          onClick={onAddEvening}
        >
          <Plus className="size-4 shrink-0 text-indigo-500" aria-hidden />
          <span className="truncate">{labels.addEvening}</span>
        </Button>
      </div>
    );
  }

  if (issue.code === "missing_spf" && !beginnerSimple) {
    return (
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="min-h-11 w-full shrink-0 bg-sky-500/15 text-sm hover:bg-sky-500/25 sm:min-h-10 sm:w-auto"
        onClick={onAddSpf}
      >
        <Plus className="size-4 shrink-0" aria-hidden />
        {labels.addSpf}
      </Button>
    );
  }

  return null;
}

/** Decide which issues to surface in the panel. */
export function getVisibleValidationIssues(
  issues: ValidationIssue[],
  opts: {
    beginnerSimple: boolean;
    engaged: boolean;
    saveAttempted: boolean;
  },
): ValidationIssue[] {
  if (issues.length === 0) return [];
  if (!opts.engaged && !opts.saveAttempted) return [];

  let visible = issues;

  if (opts.saveAttempted && !opts.engaged) {
    visible = issues.filter((i) => i.severity === "blocker");
  }

  if (opts.beginnerSimple) {
    const blockers = visible.filter((i) => i.severity === "blocker");
    return blockers.slice(0, 1);
  }

  return visible;
}
