"use client";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Smile,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { ONBOARDING_STEPS } from "@/lib/stores/onboarding-store";
import { cn } from "@/lib/utils";

const PROGRESS_STEP_KEYS = [
  "progress.analyze",
  "progress.quickInfo",
  "progress.summary",
] as const;

type OnboardingT = (key: string, values?: Record<string, string | number>) => string;

export function OnboardingProgress({ idx, t }: { idx: number; t: OnboardingT }) {
  const total = ONBOARDING_STEPS.length;
  const pct = Math.round(((idx + 1) / total) * 100);

  return (
    <div
      className="space-y-3 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background p-4 shadow-sm"
      aria-label={t("progress.stepOf", { current: idx + 1, total })}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-bold tracking-tight text-foreground">
          {t("progress.stepOf", { current: idx + 1, total })}
        </p>
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
          {t(PROGRESS_STEP_KEYS[idx])}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-center text-[11px] text-muted-foreground">{t("progress.timeHint")}</p>
    </div>
  );
}

/** Fade/slide panel when switching onboarding steps. */
export function OnboardingStepPanel({
  stepKey,
  direction,
  children,
}: {
  stepKey: string;
  direction: 1 | -1;
  children: ReactNode;
}) {
  return (
    <div
      key={stepKey}
      className={cn(
        "space-y-5 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300",
        direction >= 0
          ? "motion-safe:slide-in-from-right-4"
          : "motion-safe:slide-in-from-left-4",
      )}
    >
      {children}
    </div>
  );
}

export function OnboardingStickyNav({
  backLabel,
  continueLabel,
  onBack,
  onContinue,
  backDisabled,
  continueDisabled,
  continueLoading,
  hideContinue,
  continueIcon,
  primaryEmphasis,
}: {
  backLabel: string;
  continueLabel: string;
  onBack: () => void;
  onContinue: () => void;
  backDisabled?: boolean;
  continueDisabled?: boolean;
  continueLoading?: boolean;
  hideContinue?: boolean;
  continueIcon?: ReactNode;
  /** Summary step — larger primary CTA. */
  primaryEmphasis?: boolean;
}) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 px-4 py-3 shadow-[0_-10px_32px_rgba(0,0,0,0.08)] backdrop-blur-md supports-[padding:max(0px)]:pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      role="navigation"
      aria-label={continueLabel}
    >
      <div className="mx-auto flex max-w-2xl items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={onBack}
          disabled={backDisabled}
          className="min-h-12 shrink-0 gap-1 px-3"
        >
          <ArrowLeft className="size-4" aria-hidden />
          <span className="sr-only sm:not-sr-only">{backLabel}</span>
        </Button>
        {!hideContinue ? (
          <Button
            type="button"
            size="lg"
            onClick={onContinue}
            disabled={continueDisabled || continueLoading}
            className={cn(
              "flex-1 gap-2 font-semibold shadow-md",
              primaryEmphasis
                ? "min-h-14 text-base sm:text-lg"
                : "min-h-12 text-base",
            )}
          >
            {continueLoading ? (
              <Loader2 className="size-5 animate-spin" aria-hidden />
            ) : (
              continueIcon ?? <ArrowRight className="size-5 shrink-0" aria-hidden />
            )}
            <span className="truncate">{continueLabel}</span>
          </Button>
        ) : (
          <div className="flex-1" />
        )}
      </div>
    </div>
  );
}

export function AnalyzeLoadingOverlay({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 rounded-xl bg-background/90 px-6 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
      role="status"
      aria-live="polite"
    >
      <div className="relative size-16">
        <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary" />
        <Sparkles className="absolute inset-0 m-auto size-7 text-primary motion-safe:animate-pulse" />
      </div>
      <div className="space-y-1 text-center">
        <p className="text-base font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

export function SkipPhotosButton({
  title,
  hint,
  onClick,
}: {
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full rounded-2xl border-2 border-dashed border-primary/35 bg-gradient-to-br from-primary/10 via-primary/5 to-background",
        "px-4 py-5 text-left transition-all active:scale-[0.99] hover:border-primary/55 hover:shadow-md",
        "min-h-[4.5rem] touch-manipulation",
      )}
    >
      <span className="flex items-start gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 transition-transform group-hover:scale-105">
          <Smile className="size-7 text-primary" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 space-y-1">
          <span className="block text-base font-semibold text-foreground">{title}</span>
          <span className="block text-sm leading-snug text-muted-foreground">{hint}</span>
        </span>
        <ArrowRight className="mt-1 size-5 shrink-0 text-primary opacity-70 group-hover:opacity-100" />
      </span>
    </button>
  );
}

/** Highlighted skin profile block — appears on step 1 after analyze or skip. */
export function SkinProfilePanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "space-y-4 rounded-2xl border-2 border-primary/25 bg-gradient-to-b from-primary/8 to-background p-4 shadow-sm",
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-400",
      )}
    >
      <div className="flex items-start gap-2">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Sparkles className="size-4" aria-hidden />
        </span>
        <div>
          <h3 className="text-base font-semibold leading-tight">{title}</h3>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {children}
    </div>
  );
}

export function FriendlyNotice({
  variant,
  title,
  children,
  action,
}: {
  variant: "empty" | "error" | "info";
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const styles =
    variant === "error"
      ? "border-destructive/30 bg-destructive/5 text-destructive"
      : variant === "empty"
        ? "border-border bg-muted/30 text-muted-foreground"
        : "border-primary/25 bg-primary/5 text-foreground";

  return (
    <div className={cn("flex flex-col gap-2 rounded-xl border p-4 text-sm", styles)}>
      <div className="flex items-start gap-2">
        {variant === "error" ? (
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
        ) : (
          <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-medium text-foreground">{title}</p>
          {children ? <div className="text-muted-foreground">{children}</div> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

export function QuickInfoGroup({
  label,
  optionalTag,
  children,
}: {
  label: string;
  optionalTag?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/80 bg-card/40 p-3.5 sm:p-4">
      <p className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
        <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
        {label}
        {optionalTag ? (
          <span className="font-normal normal-case tracking-normal text-muted-foreground">
            {optionalTag}
          </span>
        ) : null}
      </p>
      {children}
    </section>
  );
}

export function QuickChipGrid<T extends string>({
  title,
  options,
  selected,
  onSelect,
  columns = 2,
  hideTitle,
}: {
  title: string;
  options: { id: T; label: string }[];
  selected: T | null;
  onSelect: (id: T) => void;
  columns?: 2 | 3;
  hideTitle?: boolean;
}) {
  return (
    <div className="space-y-2">
      {!hideTitle ? <p className="text-sm font-semibold">{title}</p> : null}
      <div
        className={cn("grid gap-2", columns === 3 ? "grid-cols-3" : "grid-cols-2")}
        role="group"
        aria-label={title}
      >
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onSelect(o.id)}
            className={cn(
              "min-h-12 touch-manipulation rounded-xl border px-3 py-3 text-center text-sm font-medium transition-all active:scale-[0.98]",
              selected === o.id
                ? "border-primary bg-primary text-primary-foreground shadow-md ring-2 ring-primary/20"
                : "border-border bg-background hover:border-primary/40 hover:bg-muted/50",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function OptionalChipRow({
  title,
  hint,
  ids,
  selected,
  onToggle,
  label,
  hideTitle,
}: {
  title: string;
  hint?: string;
  ids: readonly string[];
  selected: string[];
  onToggle: (id: string) => void;
  label: (id: string) => string;
  hideTitle?: boolean;
}) {
  return (
    <div className="space-y-2">
      {!hideTitle ? (
        <div>
          <p className="text-sm font-semibold">{title}</p>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
      <div className="flex flex-wrap gap-2" role="group" aria-label={title}>
        {ids.map((id) => {
          const on = selected.includes(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => onToggle(id)}
              className={cn(
                "min-h-11 touch-manipulation rounded-full border px-4 py-2.5 text-sm font-medium transition-all active:scale-[0.98]",
                on
                  ? "border-primary bg-primary/15 text-primary shadow-sm"
                  : "border-border bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              {label(id)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ConcernChipRow({
  title,
  hint,
  concernIds,
  selected,
  onToggle,
  label,
}: {
  title: string;
  hint?: string;
  concernIds: readonly string[];
  selected: string[];
  onToggle: (id: string) => void;
  label: (id: string) => string;
}) {
  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-semibold">{title}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={title}>
        {concernIds.map((id) => {
          const on = selected.includes(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => onToggle(id)}
              className={cn(
                "min-h-11 touch-manipulation rounded-full border px-4 py-2.5 text-sm font-medium transition-all active:scale-[0.98]",
                on
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-background hover:bg-muted",
              )}
            >
              {label(id)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
