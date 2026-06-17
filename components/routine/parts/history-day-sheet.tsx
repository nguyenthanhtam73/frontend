"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Check, Moon, Pencil, Sun, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { RoutineDTO } from "@/lib/types/routine";
import { cn } from "@/lib/utils";

import { formatShortDate } from "../routine-helpers";

export type HistoryDaySheetLabels = {
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
  const [closing, setClosing] = useState(false);
  const dragY = useRef(0);
  const startY = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const requestClose = useCallback(() => {
    setClosing(true);
    window.setTimeout(() => {
      setClosing(false);
      onClose();
    }, 220);
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, requestClose]);

  if (!mounted || !open || !entry) return null;

  const dateLabel = humanizeDateLabel(
    entry.routine_date,
    todayISO,
    labels.today,
    labels.yesterday,
  );
  const isToday = entry.routine_date === todayISO;
  const total = entry.morning.length + entry.evening.length;
  const done =
    entry.morning.filter((s) => s.completed).length +
    entry.evening.filter((s) => s.completed).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

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
          "absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 lg:bg-black/50",
          closing ? "opacity-0" : "opacity-100",
        )}
        onClick={requestClose}
      />

      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={dateLabel}
        onTouchStart={(e) => {
          startY.current = e.touches[0]?.clientY ?? 0;
          dragY.current = 0;
        }}
        onTouchMove={(e) => {
          const y = e.touches[0]?.clientY ?? 0;
          dragY.current = Math.max(0, y - startY.current);
          if (sheetRef.current) {
            sheetRef.current.style.transform = `translateY(${dragY.current}px)`;
          }
        }}
        onTouchEnd={() => {
          if (dragY.current > 80) {
            requestClose();
          } else if (sheetRef.current) {
            sheetRef.current.style.transform = "";
          }
          dragY.current = 0;
        }}
        className={cn(
          "relative flex max-h-[min(88vh,640px)] w-full flex-col rounded-t-2xl border border-border/80 bg-background shadow-2xl transition-transform duration-300 ease-out lg:max-w-lg lg:rounded-2xl",
          closing
            ? "translate-y-full opacity-0 lg:translate-y-4 lg:scale-95 lg:opacity-0"
            : "translate-y-0 opacity-100 in-animate animate-in slide-in-from-bottom-4 fade-in duration-300 lg:zoom-in-95",
        )}
      >
        <div className="flex shrink-0 flex-col items-center border-b px-4 pb-3 pt-3 lg:hidden">
          <span className="mb-2 h-1 w-10 rounded-full bg-muted-foreground/30" aria-hidden />
          <p className="text-[11px] text-muted-foreground">{labels.sheetSwipeHint}</p>
        </div>

        <div className="flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3 sm:px-5">
          <div className="min-w-0 space-y-1">
            <p className="text-base font-semibold leading-tight">{dateLabel}</p>
            <p className="text-sm text-muted-foreground">
              {labels.done(done, total)} · {labels.detailPct(pct)}
            </p>
            <div className="h-2 max-w-xs overflow-hidden rounded-full bg-muted">
              <span
                className={cn(
                  "block h-full rounded-full transition-[width] duration-500",
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
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border bg-muted/40 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {total === 0 ? (
            <p className="text-sm text-muted-foreground">{labels.detailEmpty}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailStepList
                icon={<Sun className="size-4 text-amber-500" aria-hidden />}
                title={labels.detailAm}
                steps={entry.morning}
              />
              <DetailStepList
                icon={<Moon className="size-4 text-indigo-500" aria-hidden />}
                title={labels.detailPm}
                steps={entry.evening}
              />
            </div>
          )}

          {entry.notes?.trim() ? (
            <div className="mt-4 rounded-xl border bg-muted/30 px-3 py-2.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {labels.detailNotes}
              </p>
              <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">{entry.notes}</p>
            </div>
          ) : null}
        </div>

        <div className="shrink-0 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
          {editAllowed ? (
            <Button
              type="button"
              className="min-h-11 w-full"
              onClick={() => {
                onEdit(entry);
                requestClose();
              }}
            >
              <Pencil className="size-4" aria-hidden />
              {isToday ? labels.detailEditToday : labels.detailEdit}
            </Button>
          ) : (
            <button
              type="button"
              onClick={() => onEditLockedAttempt?.()}
              className="mx-auto block max-w-sm text-center text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              {labels.editLocked}
            </button>
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
      <div className="rounded-xl border border-dashed bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
        {title}: —
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card/80 px-3 py-3">
      <p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </p>
      <ul className="space-y-2">
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
                "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border",
                s.completed
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-border bg-background",
              )}
            >
              {s.completed ? <Check className="size-3" aria-hidden /> : null}
            </span>
            <span>{s.title || "—"}</span>
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
