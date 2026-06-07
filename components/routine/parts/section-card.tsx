"use client";

import {
  ArrowDown,
  ArrowUp,
  Check,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  normalizeCategory,
  ROUTINE_CATEGORIES,
  type RoutineCategory,
  type RoutineStepDTO,
} from "@/lib/types/routine";
import { cn } from "@/lib/utils";

import type { StepSection } from "../routine-helpers";

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
  categories: Record<RoutineCategory, string>;
};

/**
 * AM or PM section card.
 *
 * - Mobile-first vertical layout with comfortable touch targets.
 * - Native HTML5 drag-drop for desktop polish; arrows handle keyboard + mobile.
 * - Beginner mode strips chrome (no category, no per-step notes, no drag, no
 *   reorder arrows) so the card collapses to: tick · title · remove.
 * - Smooth enter animation per step (`animate-in fade-in slide-in-from-bottom`)
 *   so AI-applied suggestions feel intentional rather than jarring.
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
  /** Tints the section's icon ring; gives AM/PM cards distinct accent colors. */
  accent: "am" | "pm";
  /** Free plan: allow tick-only; block add/remove/reorder/title edits. */
  editLocked?: boolean;
}) {
  const dragIdx = useRef<number | null>(null);
  const accentRing =
    accent === "am"
      ? "from-amber-400/20 to-primary/10 ring-amber-300/50 dark:ring-amber-300/30"
      : "from-indigo-400/20 to-primary/10 ring-indigo-300/50 dark:ring-indigo-300/30";

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="space-y-3 p-4 sm:p-6">
        <header className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "inline-flex size-8 items-center justify-center rounded-full bg-linear-to-br ring-1",
                accentRing,
              )}
            >
              {icon}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">{title}</p>
              <p className="text-xs leading-snug text-muted-foreground">{desc}</p>
            </div>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={onAdd} disabled={editLocked}>
            <Plus className="size-3.5" aria-hidden />
            <span>{labels.add}</span>
          </Button>
        </header>

        {steps.length === 0 ? (
          <button
            type="button"
            onClick={editLocked ? undefined : onAdd}
            disabled={editLocked}
            className={cn(
              "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/40 px-3 py-7 text-muted-foreground transition-colors",
              editLocked
                ? "cursor-not-allowed opacity-60"
                : "hover:border-primary/40 hover:bg-primary/5 hover:text-foreground",
            )}
          >
            <Plus className="size-5" aria-hidden />
            <span className="text-sm font-medium">
              {section === "morning" ? labels.emptyAddMorning : labels.emptyAddEvening}
            </span>
          </button>
        ) : (
          <ol className="space-y-2">
            {steps.map((step, idx) => (
              <li
                key={step.id}
                draggable={!beginnerSimple && !editLocked}
                onDragStart={
                  beginnerSimple
                    ? undefined
                    : () => {
                        dragIdx.current = idx;
                      }
                }
                onDragOver={
                  beginnerSimple
                    ? undefined
                    : (e) => {
                        e.preventDefault();
                      }
                }
                onDrop={
                  beginnerSimple
                    ? undefined
                    : (e) => {
                        e.preventDefault();
                        const from = dragIdx.current;
                        dragIdx.current = null;
                        if (from === null) return;
                        onReorder(from, idx);
                      }
                }
                onDragEnd={
                  beginnerSimple
                    ? undefined
                    : () => {
                        dragIdx.current = null;
                      }
                }
                className={cn(
                  "group rounded-xl border transition-all in-animate animate-in fade-in slide-in-from-bottom-1 duration-200",
                  step.completed
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "bg-card/60 hover:border-primary/30 hover:bg-card",
                )}
              >
                <StepRow
                  index={idx}
                  total={steps.length}
                  step={step}
                  beginnerSimple={beginnerSimple}
                  editLocked={editLocked}
                  onRemove={() => onRemove(step.id)}
                  onMoveUp={() => onMove(step.id, -1)}
                  onMoveDown={() => onMove(step.id, 1)}
                  onChange={(patch) => onUpdate(step.id, patch)}
                  onToggle={() => onToggle(step.id)}
                  labels={labels}
                />
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Individual step row. The animated tick-circle is the centerpiece — when a
 * user marks a step complete, the circle scales briefly (`active:scale-95`),
 * the check fades in, and the row's background tints emerald. This gives the
 * "done" gesture the satisfying micro-feedback of a habit-tracker app.
 */
function StepRow({
  index,
  total,
  step,
  beginnerSimple,
  editLocked,
  onRemove,
  onMoveUp,
  onMoveDown,
  onChange,
  onToggle,
  labels,
}: {
  index: number;
  total: number;
  step: RoutineStepDTO;
  beginnerSimple: boolean;
  editLocked: boolean;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onChange: (patch: Partial<RoutineStepDTO>) => void;
  onToggle: () => void;
  labels: SectionLabels;
}) {
  const [showNotes, setShowNotes] = useState(!!step.notes);
  const cat = useMemo(() => normalizeCategory(step.category), [step.category]);

  return (
    <div className="space-y-2 p-3 sm:p-3.5">
      <div className="flex items-start gap-2">
        {!beginnerSimple ? (
          <div
            className="hidden cursor-grab pt-2 text-muted-foreground/50 transition-colors group-hover:text-muted-foreground sm:block"
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
            "mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full border transition-all duration-200 active:scale-90",
            step.completed
              ? "border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-500/30"
              : "border-border bg-background hover:border-primary/40 hover:bg-primary/5",
          )}
        >
          {step.completed ? (
            <Check
              className="size-4 in-animate animate-in zoom-in-50 fade-in duration-150"
              aria-hidden
            />
          ) : (
            <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
              {index + 1}
            </span>
          )}
        </button>

        <div className="min-w-0 flex-1 space-y-1.5">
          <AutoGrowTextarea
            value={step.title}
            onChange={(value) => onChange({ title: value })}
            placeholder={labels.placeholder}
            readOnly={editLocked}
            className={cn(
              "block w-full rounded-lg border bg-background px-3 py-2 text-base leading-snug outline-none ring-ring/40 transition focus:border-primary focus:ring-2 sm:py-1.5 sm:text-sm sm:leading-snug",
              step.completed ? "text-muted-foreground line-through" : "",
              editLocked ? "cursor-default bg-muted/30" : "",
            )}
          />
          {!beginnerSimple && !editLocked ? (
            <>
              <div className="flex flex-wrap items-center gap-1.5">
                <select
                  value={cat}
                  onChange={(e) => onChange({ category: e.target.value })}
                  aria-label={labels.category}
                  className="h-7 rounded-full border bg-background px-2 text-xs text-muted-foreground outline-none ring-ring/40 transition focus:border-primary focus:ring-2"
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
                    "rounded-full border border-dashed px-2 py-0.5 text-[11px] transition-colors",
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
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm leading-relaxed outline-none ring-ring/40 transition focus:border-primary focus:ring-2"
                />
              ) : null}
            </>
          ) : null}
        </div>

        <div className="flex flex-col gap-1 pt-0.5">
          {!beginnerSimple && !editLocked ? (
            <>
              <button
                type="button"
                onClick={onMoveUp}
                disabled={index === 0}
                aria-label={labels.moveUp}
                className="inline-flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ArrowUp className="size-4 sm:size-3.5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={onMoveDown}
                disabled={index === total - 1}
                aria-label={labels.moveDown}
                className="inline-flex size-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ArrowDown className="size-4 sm:size-3.5" aria-hidden />
              </button>
            </>
          ) : null}
          {!editLocked ? (
            <button
              type="button"
              onClick={onRemove}
              aria-label={labels.remove}
              className="inline-flex size-11 items-center justify-center rounded-md text-destructive/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-4 sm:size-3.5" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Single-line-feeling textarea that grows vertically with its content so long
 * Vietnamese step titles wrap fully instead of being clipped inside a fixed-
 * width input.
 *
 * Why a textarea instead of `<input>`:
 *   `<input type="text">` truncates overflow horizontally — long titles like
 *   "Rửa mặt với sữa rửa mặt dịu nhẹ và nước ấm" hide their tail behind the
 *   right edge of the field. A textarea wraps lines instead.
 *
 * Two complementary mechanisms:
 *   - CSS `field-sizing: content` (Tailwind `field-sizing-content`) — modern
 *     Chrome/Edge/Safari sizes the textarea to content with no JS, no flicker.
 *   - `useLayoutEffect` height sync — fallback for Firefox/older Safari, runs
 *     before paint so we never see a 1-row flash.
 *
 * `allowNewlines={false}` (default) blocks `Enter` and strips `\n` from pasted
 * text so the title stays semantically single-line — no surprise line breaks
 * when dragging steps or rendering them elsewhere.
 */
function AutoGrowTextarea({
  value,
  onChange,
  placeholder,
  className,
  minRows = 1,
  allowNewlines = false,
  readOnly = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minRows?: number;
  allowNewlines?: boolean;
  readOnly?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  // Sync height with content. `auto` first so shrinking works, then snap to
  // `scrollHeight`. useLayoutEffect avoids a paint with the wrong height.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => {
        const next = allowNewlines ? e.target.value : e.target.value.replace(/\r?\n/g, " ");
        onChange(next);
      }}
      onKeyDown={(e) => {
        if (!allowNewlines && e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      placeholder={placeholder}
      rows={minRows}
      readOnly={readOnly}
      className={cn("resize-none overflow-hidden field-sizing-content", className)}
    />
  );
}
