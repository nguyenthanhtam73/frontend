"use client";

import {
  ArrowDown,
  ArrowUp,
  Check,
  GripVertical,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  normalizeCategory,
  ROUTINE_CATEGORIES,
  type RoutineCategory,
  type RoutineStepDTO,
} from "@/lib/types/routine";
import { cn } from "@/lib/utils";

import { useCanDragReorder } from "../hooks/use-can-drag-reorder";
import { AutoGrowTextarea } from "./auto-grow-textarea";
import type { StepSection } from "../routine-helpers";

export type SectionAlert = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export type SectionLabels = {
  add: string;
  remove: string;
  moveUp: string;
  moveDown: string;
  completeOn: string;
  completeOff: string;
  category: string;
  notesLabel: string;
  notesPlaceholder: string;
  placeholder: string;
  emptyAddMorning: string;
  emptyAddEvening: string;
  emptySectionHint: string;
  emptySectionBeginnerHint: string;
  categories: Record<RoutineCategory, string>;
};

const STEP_EXIT_MS = 220;

const desktopActionBtn =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-30";

function mobileActionBtn(variant: "neutral" | "danger") {
  return cn(
    "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border px-1.5 py-2 text-[11px] font-semibold leading-none transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-35 sm:flex-row sm:gap-1.5 sm:text-xs",
    variant === "neutral" &&
      "border-border/80 bg-muted/50 text-foreground shadow-sm hover:bg-muted/80 active:bg-muted",
    variant === "danger" &&
      "border-destructive/30 bg-destructive/10 text-destructive shadow-sm hover:bg-destructive/15 active:bg-destructive/20",
  );
}

/**
 * AM or PM section card.
 *
 * Mobile: labeled up/down/delete bar (≥44px). Desktop: drag + compact icons.
 */
export function SectionCard({
  section,
  title,
  desc,
  icon,
  steps,
  beginnerSimple,
  onAdd,
  onRemove,
  onMove,
  onReorder,
  onUpdate,
  onToggle,
  labels,
  accent,
  editLocked = false,
  highlightEmptyTitles = false,
  sectionAlert,
  onEditLockedAttempt,
}: {
  section: StepSection;
  title: string;
  desc: string;
  icon: React.ReactNode;
  steps: RoutineStepDTO[];
  beginnerSimple: boolean;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onMove: (id: string, delta: -1 | 1) => void;
  onReorder: (from: number, to: number) => void;
  onUpdate: (id: string, patch: Partial<RoutineStepDTO>) => void;
  onToggle: (id: string) => void;
  labels: SectionLabels;
  accent: "am" | "pm";
  editLocked?: boolean;
  highlightEmptyTitles?: boolean;
  sectionAlert?: SectionAlert | null;
  onEditLockedAttempt?: () => void;
}) {
  const canDrag = useCanDragReorder();
  const dragIdx = useRef<number | null>(null);
  const dragEnabled = canDrag && !beginnerSimple && !editLocked;
  const [exitingIds, setExitingIds] = useState<Set<string>>(() => new Set());

  const accentRing =
    accent === "am"
      ? "from-amber-400/20 to-primary/10 ring-amber-300/50 dark:ring-amber-300/30"
      : "from-indigo-400/20 to-primary/10 ring-indigo-300/50 dark:ring-indigo-300/30";

  const handleRemove = useCallback(
    (id: string) => {
      setExitingIds((prev) => {
        if (prev.has(id)) return prev;
        window.setTimeout(() => {
          onRemove(id);
          setExitingIds((current) => {
            const next = new Set(current);
            next.delete(id);
            return next;
          });
        }, STEP_EXIT_MS);
        return new Set(prev).add(id);
      });
    },
    [onRemove],
  );

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="space-y-3 p-3.5 sm:space-y-4 sm:p-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br ring-1 sm:size-8",
                accentRing,
              )}
            >
              {icon}
            </span>
            <div className="min-w-0">
              <p className="text-base font-semibold leading-tight sm:text-sm">{title}</p>
              <p className="text-sm leading-snug text-muted-foreground sm:text-xs">{desc}</p>
            </div>
          </div>
          {steps.length > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                if (editLocked) {
                  onEditLockedAttempt?.();
                  return;
                }
                onAdd();
              }}
              aria-disabled={editLocked}
              className={cn(
                "min-h-11 w-full text-sm sm:min-h-9 sm:w-auto",
                editLocked && "cursor-not-allowed opacity-60",
              )}
            >
              <Plus className="size-4" aria-hidden />
              <span>{labels.add}</span>
            </Button>
          ) : null}
        </header>

        {sectionAlert ? (
          <div className="flex flex-col gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/[0.05] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <p className="text-xs leading-snug text-amber-900/90 dark:text-amber-100/90">
              {sectionAlert.message}
            </p>
            {sectionAlert.actionLabel && sectionAlert.onAction ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="min-h-10 w-full shrink-0 gap-1.5 border-amber-500/30 bg-background/90 text-xs sm:w-auto"
                onClick={sectionAlert.onAction}
              >
                <Plus className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                {sectionAlert.actionLabel}
              </Button>
            ) : null}
          </div>
        ) : null}

        {steps.length === 0 ? (
          <SectionEmptyState
            section={section}
            accent={accent}
            beginnerSimple={beginnerSimple}
            editLocked={editLocked}
            onAdd={onAdd}
            onEditLockedAttempt={onEditLockedAttempt}
            labels={labels}
          />
        ) : (
          <ol className="space-y-2.5 sm:space-y-2">
            {steps.map((step, idx) => {
              const exiting = exitingIds.has(step.id);
              return (
                <li
                  key={step.id}
                  draggable={dragEnabled && !exiting}
                  onDragStart={
                    dragEnabled && !exiting
                      ? () => {
                          dragIdx.current = idx;
                        }
                      : undefined
                  }
                  onDragOver={
                    dragEnabled
                      ? (e) => {
                          e.preventDefault();
                        }
                      : undefined
                  }
                  onDrop={
                    dragEnabled
                      ? (e) => {
                          e.preventDefault();
                          const from = dragIdx.current;
                          dragIdx.current = null;
                          if (from === null || from === idx) return;
                          onReorder(from, idx);
                        }
                      : undefined
                  }
                  onDragEnd={
                    dragEnabled
                      ? () => {
                          dragIdx.current = null;
                        }
                      : undefined
                  }
                  className={cn(
                    "group rounded-xl border ease-out will-change-[transform,opacity,max-height]",
                    exiting
                      ? "pointer-events-none max-h-0 scale-[0.98] overflow-hidden border-transparent opacity-0 duration-200"
                      : "opacity-100 duration-300 in-animate animate-in fade-in slide-in-from-bottom-2",
                    !exiting &&
                      (dragEnabled
                        ? "lg:cursor-grab lg:active:cursor-grabbing"
                        : undefined),
                    !exiting &&
                      (step.completed
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : "border-border/80 bg-card/60 hover:border-primary/30 hover:bg-card"),
                  )}
                >
                  <StepRow
                    index={idx}
                    total={steps.length}
                    step={step}
                    beginnerSimple={beginnerSimple}
                    editLocked={editLocked}
                    onEditLockedAttempt={onEditLockedAttempt}
                    showDragHandle={dragEnabled}
                    onRemove={() => handleRemove(step.id)}
                    onMoveUp={() => onMove(step.id, -1)}
                    onMoveDown={() => onMove(step.id, 1)}
                    onChange={(patch) => onUpdate(step.id, patch)}
                  onToggle={() => onToggle(step.id)}
                  labels={labels}
                  highlightEmptyTitle={highlightEmptyTitles && !step.title.trim()}
                />
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function SectionEmptyState({
  section,
  accent,
  beginnerSimple,
  editLocked,
  onAdd,
  onEditLockedAttempt,
  labels,
}: {
  section: StepSection;
  accent: "am" | "pm";
  beginnerSimple: boolean;
  editLocked: boolean;
  onAdd: () => void;
  onEditLockedAttempt?: () => void;
  labels: SectionLabels;
}) {
  const cta =
    section === "morning" ? labels.emptyAddMorning : labels.emptyAddEvening;
  const hint = beginnerSimple ? labels.emptySectionBeginnerHint : labels.emptySectionHint;
  const accentBg =
    accent === "am"
      ? "from-amber-500/15 via-primary/5 to-background ring-amber-400/30"
      : "from-indigo-500/15 via-primary/5 to-background ring-indigo-400/30";

  return (
    <button
      type="button"
      onClick={() => {
        if (editLocked) {
          onEditLockedAttempt?.();
          return;
        }
        onAdd();
      }}
      aria-disabled={editLocked}
      className={cn(
        "group flex w-full min-h-[10.5rem] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-all duration-200 active:scale-[0.99] sm:min-h-[9rem]",
        editLocked
          ? "cursor-not-allowed border-border bg-muted/30 opacity-60"
          : "border-primary/25 bg-linear-to-b hover:border-primary/45 hover:shadow-md active:border-primary/50",
        !editLocked && accentBg,
      )}
    >
      <span
        className={cn(
          "inline-flex size-14 items-center justify-center rounded-2xl bg-background/90 shadow-sm ring-1 transition-transform duration-200 group-hover:scale-105 group-active:scale-95",
          accent === "am" ? "ring-amber-400/40" : "ring-indigo-400/40",
        )}
      >
        {beginnerSimple ? (
          <Sparkles className="size-6 text-primary" aria-hidden />
        ) : (
          <Plus className="size-7 text-primary" aria-hidden />
        )}
      </span>
      <div className="space-y-1.5">
        <p className="text-base font-semibold text-foreground sm:text-sm">{cta}</p>
        <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{hint}</p>
      </div>
      {!editLocked ? (
        <span className="inline-flex min-h-11 w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors group-hover:bg-primary/90 sm:w-auto sm:min-w-[12rem]">
          <Plus className="size-4" aria-hidden />
          {labels.add}
        </span>
      ) : null}
    </button>
  );
}

function MobileStepActions({
  index,
  total,
  showReorder,
  showRemove,
  onMoveUp,
  onMoveDown,
  onRemove,
  labels,
}: {
  index: number;
  total: number;
  showReorder: boolean;
  showRemove: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  labels: Pick<SectionLabels, "moveUp" | "moveDown" | "remove">;
}) {
  if (!showReorder && !showRemove) return null;

  const colClass =
    showReorder && showRemove
      ? "grid-cols-3"
      : showReorder
        ? "grid-cols-2"
        : "grid-cols-1";

  return (
    <div
      className={cn("grid gap-2 lg:hidden", colClass)}
      role="group"
      aria-label={`${labels.moveUp}, ${labels.moveDown}, ${labels.remove}`}
    >
      {showReorder ? (
        <>
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            aria-label={labels.moveUp}
            className={mobileActionBtn("neutral")}
          >
            <ArrowUp className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{labels.moveUp}</span>
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            aria-label={labels.moveDown}
            className={mobileActionBtn("neutral")}
          >
            <ArrowDown className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{labels.moveDown}</span>
          </button>
        </>
      ) : null}
      {showRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={labels.remove}
          className={mobileActionBtn("danger")}
        >
          <Trash2 className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{labels.remove}</span>
        </button>
      ) : null}
    </div>
  );
}

function StepRow({
  index,
  total,
  step,
  beginnerSimple,
  editLocked,
  showDragHandle,
  onEditLockedAttempt,
  onRemove,
  onMoveUp,
  onMoveDown,
  onChange,
  onToggle,
  labels,
  highlightEmptyTitle = false,
}: {
  index: number;
  total: number;
  step: RoutineStepDTO;
  beginnerSimple: boolean;
  editLocked: boolean;
  showDragHandle: boolean;
  onEditLockedAttempt?: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onChange: (patch: Partial<RoutineStepDTO>) => void;
  onToggle: () => void;
  labels: SectionLabels;
  highlightEmptyTitle?: boolean;
}) {
  const [showNotes, setShowNotes] = useState(!!step.notes);
  const cat = useMemo(() => normalizeCategory(step.category), [step.category]);
  const showReorder = !beginnerSimple && !editLocked;
  const showRemove = !editLocked;

  return (
    <div className="space-y-2.5 p-3 sm:space-y-2 sm:p-3.5">
      <div className="flex items-start gap-2.5 sm:gap-2">
        {showDragHandle ? (
          <div
            className="hidden shrink-0 cursor-grab pt-3 text-muted-foreground/50 transition-colors group-hover:text-muted-foreground lg:block"
            aria-hidden
          >
            <GripVertical className="size-4" />
          </div>
        ) : null}

        <button
          type="button"
          onClick={onToggle}
          aria-label={step.completed ? labels.completeOn : labels.completeOff}
          aria-pressed={step.completed}
          className={cn(
            "inline-flex size-11 shrink-0 items-center justify-center rounded-full border transition-all duration-200 active:scale-[0.95] sm:size-10",
            step.completed
              ? "border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-500/30"
              : "border-border bg-background hover:border-primary/40 hover:bg-primary/5",
          )}
        >
          {step.completed ? (
            <Check
              className="size-5 in-animate animate-in zoom-in-50 fade-in duration-150 sm:size-4"
              aria-hidden
            />
          ) : (
            <span className="text-xs font-semibold tabular-nums text-muted-foreground sm:text-[10px]">
              {index + 1}
            </span>
          )}
        </button>

        <div className="min-w-0 flex-1 space-y-2">
          <AutoGrowTextarea
            value={step.title}
            onChange={(value) => onChange({ title: value })}
            placeholder={labels.placeholder}
            readOnly={editLocked}
            onLockedAttempt={onEditLockedAttempt}
            className={cn(
              "block w-full rounded-xl border bg-background px-3 py-2.5 text-base leading-snug outline-none ring-ring/40 transition focus:border-primary focus:ring-2 sm:rounded-lg sm:py-2 sm:text-sm",
              step.completed ? "text-muted-foreground line-through" : "",
              editLocked ? "cursor-default bg-muted/30" : "",
              highlightEmptyTitle &&
                "border-amber-500/40 bg-amber-500/[0.04] ring-1 ring-amber-500/20 focus:border-amber-500/50 focus:ring-amber-500/25",
            )}
          />
          {!beginnerSimple && !editLocked ? (
            <>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-1.5">
                <select
                  value={cat}
                  onChange={(e) => onChange({ category: e.target.value })}
                  aria-label={labels.category}
                  className="min-h-11 w-full rounded-xl border bg-background px-3 text-sm text-muted-foreground outline-none ring-ring/40 transition focus:border-primary focus:ring-2 sm:h-8 sm:w-auto sm:rounded-full sm:px-2 sm:text-xs"
                >
                  {ROUTINE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {labels.categories[c]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNotes((v) => !v)}
                  aria-pressed={showNotes}
                  className={cn(
                    "min-h-11 rounded-xl border border-dashed px-3 text-sm transition-colors active:scale-[0.98] sm:min-h-0 sm:rounded-full sm:px-2 sm:py-0.5 sm:text-[11px]",
                    showNotes
                      ? "border-primary/40 bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {labels.notesLabel}
                </button>
              </div>
              {showNotes ? (
                <AutoGrowTextarea
                  value={step.notes ?? ""}
                  onChange={(value) => onChange({ notes: value })}
                  placeholder={labels.notesPlaceholder}
                  minRows={2}
                  allowNewlines
                  className="w-full rounded-xl border bg-background px-3 py-2.5 text-base leading-relaxed outline-none ring-ring/40 transition focus:border-primary focus:ring-2 sm:rounded-lg sm:py-2 sm:text-sm"
                />
              ) : null}
            </>
          ) : null}
        </div>

        {/* Desktop (lg+): icon-only vertical stack */}
        {(showReorder || showRemove) && (
          <div className="hidden shrink-0 flex-col gap-1 pt-0.5 lg:flex">
            {showReorder ? (
              <>
                <button
                  type="button"
                  onClick={onMoveUp}
                  disabled={index === 0}
                  aria-label={labels.moveUp}
                  className={cn(
                    desktopActionBtn,
                    "border-border/80 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <ArrowUp className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={onMoveDown}
                  disabled={index === total - 1}
                  aria-label={labels.moveDown}
                  className={cn(
                    desktopActionBtn,
                    "border-border/80 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <ArrowDown className="size-4" aria-hidden />
                </button>
              </>
            ) : null}
            {showRemove ? (
              <button
                type="button"
                onClick={onRemove}
                aria-label={labels.remove}
                className={cn(
                  desktopActionBtn,
                  "border-destructive/25 bg-destructive/10 text-destructive hover:bg-destructive/15",
                )}
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            ) : null}
          </div>
        )}

        {/* Beginner mobile: compact delete beside row */}
        {beginnerSimple && showRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label={labels.remove}
            className={cn(
              "inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-destructive/30 bg-destructive/10 text-destructive transition-all duration-150 active:scale-[0.97] hover:bg-destructive/15 lg:hidden",
            )}
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>

      {/* Mobile / tablet: labeled action bar */}
      {!beginnerSimple ? (
        <MobileStepActions
          index={index}
          total={total}
          showReorder={showReorder}
          showRemove={showRemove}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onRemove={onRemove}
          labels={labels}
        />
      ) : null}
    </div>
  );
}
