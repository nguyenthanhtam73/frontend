"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { CalendarDays, Loader2, Lock, Moon, Sun, WandSparkles, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CheckInDetailLabels = {
  title: string;
  close: string;
  swipeHint: string;
  tagsSection: string;
  snippet: string;
  userNote: string;
  hintsTitle: string;
  hintsHighlight: string;
  am: string;
  pm: string;
  other: string;
  noHints: string;
  applyNow: string;
  applyingNow: string;
  applyDisabled: string;
};

export type CheckInDetailEntry = {
  checkDateLabel: string;
  tags: string[];
  symptoms: string[];
  snippet?: string;
  userNote?: string;
  routineHints?: {
    morning: string[];
    evening: string[];
    other: string[];
  };
  tagLabel: (raw: string) => string;
  symptomLabel: (raw: string) => string;
};

const CLOSE_MS = 260;

/** Mobile: bottom sheet with swipe. Desktop: centered dialog. */
export function CheckInDetailSheet({
  open,
  entry,
  labels,
  canApply,
  applying,
  onClose,
  onApply,
}: {
  open: boolean;
  entry: CheckInDetailEntry | null;
  labels: CheckInDetailLabels;
  canApply: boolean;
  applying: boolean;
  onClose: () => void;
  onApply?: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const dragY = useRef(0);

  useEffect(() => setMounted(true), []);

  const requestClose = useCallback(() => {
    setClosing(true);
    window.setTimeout(() => {
      setClosing(false);
      setVisible(false);
      onClose();
    }, CLOSE_MS);
  }, [onClose]);

  useEffect(() => {
    if (open && entry) {
      setVisible(true);
      setClosing(false);
    }
  }, [open, entry]);

  useEffect(() => {
    if (!visible) return;
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
  }, [visible, requestClose]);

  if (!mounted || !visible || !entry) return null;

  const hints = entry.routineHints;
  const hintCount =
    (hints?.morning.length ?? 0) +
    (hints?.evening.length ?? 0) +
    (hints?.other.length ?? 0);
  const hasHints = hintCount > 0;

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
        aria-label={labels.close}
        className={cn(
          "absolute inset-0 bg-black/45 backdrop-blur-[2px] transition-opacity ease-out lg:bg-black/50",
          closing ? "opacity-0 duration-200" : "opacity-100 duration-300",
        )}
        onClick={requestClose}
      />

      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="check-in-detail-title"
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
          "relative flex max-h-[min(90vh,680px)] w-full flex-col rounded-t-2xl border border-border/80 bg-background shadow-2xl transition-all ease-out lg:max-w-lg lg:rounded-2xl",
          closing
            ? "translate-y-full opacity-0 duration-[260ms] lg:translate-y-3 lg:scale-[0.98] lg:opacity-0"
            : "translate-y-0 opacity-100 duration-300 in-animate animate-in slide-in-from-bottom-6 fade-in lg:zoom-in-95",
        )}
      >
        <div
          className="flex shrink-0 cursor-grab flex-col items-center border-b px-4 pb-2.5 pt-2.5 active:cursor-grabbing lg:hidden"
          aria-hidden
        >
          <span className="mb-1.5 h-1.5 w-12 rounded-full bg-muted-foreground/35" />
          <p className="text-[11px] text-muted-foreground">{labels.swipeHint}</p>
        </div>

        <div className="flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3.5 sm:px-5">
          <div className="min-w-0 space-y-1.5">
            <p id="check-in-detail-title" className="text-base font-semibold leading-snug tracking-tight sm:text-lg">
              {labels.title}
            </p>
            <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarDays className="size-4 shrink-0 opacity-70" aria-hidden />
              {entry.checkDateLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label={labels.close}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border bg-muted/40 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-4 py-4 sm:space-y-4 sm:px-5 sm:py-5">
          {entry.tags.length > 0 || entry.symptoms.length > 0 ? (
            <DetailSection title={labels.tagsSection}>
              <div className="flex flex-wrap gap-1.5">
                {entry.tags.map((tag) => (
                  <Badge key={`c-${tag}`} variant="default" className="px-2.5 py-1 text-xs">
                    {entry.tagLabel(tag)}
                  </Badge>
                ))}
                {entry.symptoms.map((s) => (
                  <Badge
                    key={`s-${s}`}
                    variant="outline"
                    className="border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-900 dark:text-amber-100"
                  >
                    {entry.symptomLabel(s)}
                  </Badge>
                ))}
              </div>
            </DetailSection>
          ) : null}

          {entry.snippet ? (
            <DetailSection title={labels.snippet}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                {entry.snippet}
              </p>
            </DetailSection>
          ) : null}

          {entry.userNote?.trim() ? (
            <DetailSection title={labels.userNote}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                {entry.userNote}
              </p>
            </DetailSection>
          ) : null}

          <DetailSection
            title={labels.hintsTitle}
            highlight={hasHints}
            subtitle={hasHints ? labels.hintsHighlight : undefined}
          >
            {hasHints && hints ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {hints.morning.length > 0 ? (
                  <HintCard
                    icon={<Sun className="size-4 text-amber-500" aria-hidden />}
                    title={labels.am}
                    lines={hints.morning}
                    accent="am"
                  />
                ) : null}
                {hints.evening.length > 0 ? (
                  <HintCard
                    icon={<Moon className="size-4 text-indigo-500" aria-hidden />}
                    title={labels.pm}
                    lines={hints.evening}
                    accent="pm"
                  />
                ) : null}
                {hints.other.length > 0 ? (
                  <HintCard title={labels.other} lines={hints.other} accent="neutral" className="sm:col-span-2" />
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{labels.noHints}</p>
            )}
          </DetailSection>
        </div>

        {hasHints && onApply ? (
          <div className="shrink-0 border-t px-4 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:px-5">
            <Button
              type="button"
              className="min-h-11 w-full gap-2"
              disabled={!canApply || applying}
              onClick={onApply}
            >
              {applying ? (
                <>
                  <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                  {labels.applyingNow}
                </>
              ) : !canApply ? (
                <>
                  <Lock className="size-4 shrink-0 opacity-70" aria-hidden />
                  {labels.applyNow}
                </>
              ) : (
                <>
                  <WandSparkles className="size-4 shrink-0" aria-hidden />
                  {labels.applyNow}
                </>
              )}
            </Button>
            {!canApply ? (
              <p className="mt-2 text-center text-xs leading-relaxed text-muted-foreground">
                {labels.applyDisabled}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

function DetailSection({
  title,
  subtitle,
  highlight,
  children,
}: {
  title: string;
  subtitle?: string;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "space-y-2.5 rounded-xl border p-3.5 sm:p-4",
        highlight
          ? "border-primary/30 bg-linear-to-br from-primary/8 via-background to-accent/10 shadow-sm"
          : "border-border/70 bg-muted/15",
      )}
    >
      <div className="space-y-0.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/75">{title}</h3>
        {subtitle ? <p className="text-xs leading-relaxed text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function HintCard({
  icon,
  title,
  lines,
  accent,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  lines: string[];
  accent: "am" | "pm" | "neutral";
  className?: string;
}) {
  const accentCls =
    accent === "am"
      ? "border-amber-500/25 bg-amber-500/5"
      : accent === "pm"
        ? "border-indigo-500/25 bg-indigo-500/5"
        : "border-border/70 bg-background/80";

  return (
    <div className={cn("rounded-xl border px-3 py-3", accentCls, className)}>
      <p className="mb-2.5 inline-flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </p>
      <ul className="space-y-2">
        {lines.map((line, i) => (
          <li
            key={`${line}-${i}`}
            className="flex gap-2 text-sm leading-relaxed text-foreground/90"
          >
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/60" aria-hidden />
            <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
