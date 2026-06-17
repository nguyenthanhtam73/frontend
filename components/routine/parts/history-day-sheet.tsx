"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Check, Lock, Moon, Pencil, Sun, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { RoutineDTO } from "@/lib/types/routine";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { cn } from "@/lib/utils";

import { formatShortDate } from "../routine-helpers";

export type HistoryDaySheetLabels = {
  detailTitle: (date: string) => string;
  detailAm: string;
  detailPm: string;
  detailEmpty: string;
  detailClose: string;
  detailPct: (pct: number) => string;
  done: (done: number, total: number) => string;
  today: string;
  yesterday: string;
  detailNotes: string;
  detailEdit: string;
  detailEditToday: string;
  sheetSwipeHint: string;
  editLocked: string;
};

const CLOSE_MS = 280;

/**
 * Mobile: bottom sheet with swipe-to-dismiss.
 * Desktop (lg+): centered dialog with backdrop click.
 */
export function HistoryDaySheet({
  open,
  entry,
  todayISO,
  labels,
  editAllowed,
  onClose,
  onEdit,
  onEditLockedAttempt,
}: {
  open: boolean;
  entry: RoutineDTO | null;
  todayISO: string;
  labels: HistoryDaySheetLabels;
  editAllowed: boolean;
  onClose: () => void;
  onEdit: (entry: RoutineDTO) => void;
  onEditLockedAttempt?: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [entered, setEntered] = useState(false);
  const [displayEntry, setDisplayEntry] = useState<RoutineDTO | null>(null);
  const dragY = useRef(0);
  const startY = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => setMounted(true), []);

  const finishClose = useCallback(() => {
    setClosing(false);
    setEntered(false);
    setVisible(false);
    setDisplayEntry(null);
    if (sheetRef.current) {
      sheetRef.current.style.transition = "";
      sheetRef.current.style.transform = "";
    }
  }, []);

  const requestClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setEntered(false);
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      finishClose();
      onClose();
    }, CLOSE_MS);
  }, [closing, finishClose, onClose]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (open && entry) {
      setDisplayEntry(entry);
      setVisible(true);
      setClosing(false);
      setEntered(false);
      return;
    }
    if (!open && visible && !closing) {
      requestClose();
    }
  }, [open, entry, visible, closing, requestClose]);

  useEffect(() => {
    if (!visible || closing) {
      setEntered(false);
      return;
    }
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true));
    });
    return () => cancelAnimationFrame(id);
  }, [visible, closing, displayEntry?.routine_date]);

  useBodyScrollLock(visible && !closing);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, requestClose]);

  if (!mounted || !visible || !displayEntry) return null;

  const dateLabel = humanizeDateLabel(
    displayEntry.routine_date,
    todayISO,
    labels.today,
    labels.yesterday,
  );
  const isToday = displayEntry.routine_date === todayISO;
  const total = displayEntry.morning.length + displayEntry.evening.length;
  const done =
    displayEntry.morning.filter((s) => s.completed).length +
    displayEntry.evening.filter((s) => s.completed).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const sheetTitle = labels.detailTitle(dateLabel);

  const sheetOpen = entered && !closing;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-end justify-center lg:items-center lg:p-4",
        closing ? "pointer-events-none" : "",
      )}
      role="presentation"
    >
      <button
        type="button"
        aria-label={labels.detailClose}
        className={cn(
          "absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity ease-out lg:bg-black/50",
          sheetOpen ? "opacity-100 duration-300" : "opacity-0 duration-200",
        )}
        onClick={requestClose}
      />

      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-day-sheet-title"
        onTouchStart={(e) => {
          startY.current = e.touches[0]?.clientY ?? 0;
          dragY.current = 0;
        }}
        onTouchMove={(e) => {
          const y = e.touches[0]?.clientY ?? 0;
          dragY.current = Math.max(0, y - startY.current);
          if (sheetRef.current && !closing) {
            sheetRef.current.style.transition = "none";
            sheetRef.current.style.transform = `translateY(${dragY.current}px)`;
          }
        }}
        onTouchEnd={() => {
          if (dragY.current > 72) {
            requestClose();
          } else if (sheetRef.current) {
            sheetRef.current.style.transition = "";
            sheetRef.current.style.transform = "";
          }
          dragY.current = 0;
        }}
        className={cn(
          "relative flex max-h-[min(88vh,640px)] w-full flex-col rounded-t-2xl border border-border/80 bg-background shadow-2xl will-change-transform",
          "transition-[transform,opacity] duration-300 ease-out lg:max-w-lg lg:rounded-2xl",
          sheetOpen
            ? "translate-y-0 opacity-100 lg:translate-y-0 lg:scale-100"
            : "translate-y-full opacity-0 lg:translate-y-3 lg:scale-[0.98]",
        )}
      >
        <div
          className="flex shrink-0 cursor-grab flex-col items-center border-b px-4 pb-2.5 pt-2.5 active:cursor-grabbing lg:hidden"
          aria-hidden
        >
          <span className="mb-1.5 h-1.5 w-12 rounded-full bg-muted-foreground/35" />
          <p className="text-[11px] text-muted-foreground">{labels.sheetSwipeHint}</p>
        </div>

        <div className="flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3.5 sm:px-5">
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="space-y-1">
              <p
                id="history-day-sheet-title"
                className="text-base font-semibold leading-snug tracking-tight sm:text-lg"
              >
                {sheetTitle}
              </p>
              <p className="text-sm text-muted-foreground">
                {labels.done(done, total)} · {labels.detailPct(pct)}
              </p>
            </div>
            <div className="h-2 max-w-xs overflow-hidden rounded-full bg-muted">
              <span
                className={cn(
                  "block h-full rounded-full transition-[width] duration-500 ease-out",
                  pct >= 80 ? "bg-emerald-500" : pct >= 40 ? "bg-primary" : "bg-amber-400",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label={labels.detailClose}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border bg-muted/40 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          {total === 0 ? (
            <p className="rounded-xl border border-dashed bg-muted/20 px-4 py-6 text-center text-sm leading-relaxed text-muted-foreground">
              {labels.detailEmpty}
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              <DetailStepList
                icon={<Sun className="size-4 text-amber-500" aria-hidden />}
                title={labels.detailAm}
                steps={displayEntry.morning}
              />
              <DetailStepList
                icon={<Moon className="size-4 text-indigo-500" aria-hidden />}
                title={labels.detailPm}
                steps={displayEntry.evening}
              />
            </div>
          )}

          {displayEntry.notes?.trim() ? (
            <div className="rounded-xl border bg-muted/25 px-3.5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {labels.detailNotes}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap">{displayEntry.notes}</p>
            </div>
          ) : null}
        </div>

        <div className="shrink-0 border-t px-4 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:px-5">
          {editAllowed ? (
            <Button
              type="button"
              variant="default"
              className="min-h-11 w-full gap-2 text-sm font-semibold shadow-sm"
              onClick={() => {
                onEdit(displayEntry);
                requestClose();
              }}
            >
              <Pencil className="size-4 shrink-0" aria-hidden />
              {isToday ? labels.detailEditToday : labels.detailEdit}
            </Button>
          ) : (
            <div className="space-y-1.5">
              <button
                type="button"
                title={labels.editLocked}
                onClick={() => onEditLockedAttempt?.()}
                className="flex w-full min-h-11 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-muted-foreground/35 bg-muted/25 px-4 py-2.5 text-center transition-colors hover:border-muted-foreground/50 hover:bg-muted/40 active:scale-[0.99]"
              >
                <span className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Lock className="size-4 shrink-0 opacity-70" aria-hidden />
                  {isToday ? labels.detailEditToday : labels.detailEdit}
                </span>
              </button>
              <p className="text-center text-xs leading-snug text-muted-foreground">{labels.editLocked}</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function DetailStepList({
  icon,
  title,
  steps,
}: {
  icon: React.ReactNode;
  title: string;
  steps: RoutineDTO["morning"];
}) {
  if (steps.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/15 px-3.5 py-3.5">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          {icon}
          {title}
        </p>
        <p className="mt-2 text-sm text-muted-foreground/80">—</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card/80 px-3.5 py-3.5 shadow-sm">
      <p className="mb-2.5 inline-flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </p>
      <ul className="space-y-2.5">
        {steps.map((s) => (
          <li
            key={s.id}
            className={cn(
              "flex items-start gap-2.5 text-sm leading-snug",
              s.completed ? "text-muted-foreground line-through" : "",
            )}
          >
            <span
              className={cn(
                "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                s.completed
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-border bg-background",
              )}
            >
              {s.completed ? <Check className="size-3" aria-hidden /> : null}
            </span>
            <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{s.title || "—"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
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
