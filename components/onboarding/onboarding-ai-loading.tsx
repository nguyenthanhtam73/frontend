"use client";

import { ArrowRight, Check, Lightbulb, Sparkles, Target } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { SkinGoal } from "@/lib/stores/onboarding-store";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { STEP1_CONCERNS } from "@/lib/onboarding/constants";
import { cn } from "@/lib/utils";

export type OnboardingAiLoadingPhase = "analyze" | "starterRoutine";

/** Analyze copy tiers (seconds): 0–15 · 15–30 · 30+ */
const ANALYZE_TIME_THRESHOLDS_S = [0, 15, 30] as const;
const ANALYZE_TIME_KEYS = [
  "aiLoading.analyzeTime0",
  "aiLoading.analyzeTime15",
  "aiLoading.analyzeTime30",
] as const;
const ANALYZE_WHY_KEYS = [
  "aiLoading.analyzeWhy0",
  "aiLoading.analyzeWhy15",
  "aiLoading.analyzeWhy30",
] as const;

/** Visual stepper — paced so no step feels stuck (≈7s · ≈20s). */
const ANALYZE_STEP_THRESHOLDS_S = [0, 7, 20] as const;

const ANALYZE_SOFT_SKIP_MS = 15_000;
const ANALYZE_EMPHASIZE_SKIP_MS = 30_000;
const ANALYZE_EARLY_CONTEXT_MS = 4_000;
const ANALYZE_TIP_START_MS = 5_000;
const ANALYZE_TIP_ROTATE_MS = 7_000;

const ANALYZE_TIP_KEYS = [
  "aiLoading.tip1",
  "aiLoading.tip2",
  "aiLoading.tip3",
  "aiLoading.tip4",
  "aiLoading.tip5",
  "aiLoading.tip6",
] as const;

const GOAL_TIP_KEYS: Partial<Record<SkinGoal, string>> = {
  glow: "aiLoading.goalTip_glow",
  clear_acne: "aiLoading.goalTip_clear_acne",
  barrier: "aiLoading.goalTip_barrier",
  anti_aging: "aiLoading.goalTip_anti_aging",
  unsure: "aiLoading.goalTip_unsure",
};

const ROUTINE_TIME_THRESHOLDS_S = [0, 8, 20, 35] as const;
const ROUTINE_TIME_KEYS = [
  "aiLoading.routineTime0",
  "aiLoading.routineTime8",
  "aiLoading.routineTime20",
  "aiLoading.routineTime35",
] as const;

const TITLE_KEYS: Record<OnboardingAiLoadingPhase, string> = {
  analyze: "aiLoading.analyzeTitle",
  starterRoutine: "aiLoading.routineTitle",
};

function stageKeyForElapsed(
  elapsedMs: number,
  thresholds: readonly number[],
  keys: readonly string[],
): string {
  const sec = elapsedMs / 1000;
  let idx = 0;
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (sec >= thresholds[i]) {
      idx = i;
      break;
    }
  }
  return keys[idx] ?? keys[0];
}

function analyzeStepIndex(elapsedMs: number): number {
  const sec = elapsedMs / 1000;
  if (sec >= ANALYZE_STEP_THRESHOLDS_S[2]) return 2;
  if (sec >= ANALYZE_STEP_THRESHOLDS_S[1]) return 1;
  return 0;
}

/** Smooth ease-in-out for connector motion. */
function easeInOutCubic(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/** Sub-step pulse within the active step — keeps the stepper feeling alive. */
function analyzeSubStepPulse(elapsedMs: number): number {
  const sec = elapsedMs / 1000;
  const step = analyzeStepIndex(elapsedMs);
  const stepStart =
    step === 0 ? 0 : step === 1 ? ANALYZE_STEP_THRESHOLDS_S[1] : ANALYZE_STEP_THRESHOLDS_S[2];
  const stepEnd =
    step === 0
      ? ANALYZE_STEP_THRESHOLDS_S[1]
      : step === 1
        ? ANALYZE_STEP_THRESHOLDS_S[2]
        : 45;
  const local = Math.max(0, Math.min(1, (sec - stepStart) / (stepEnd - stepStart)));
  return easeInOutCubic(local) * 4;
}

/** Connector progress 0–100%, paced to visual step thresholds. */
function analyzeConnectorProgress(elapsedMs: number): number {
  const sec = elapsedMs / 1000;
  const pulse = analyzeSubStepPulse(elapsedMs);
  if (sec <= 7) return easeInOutCubic(sec / 7) * 33 + pulse;
  if (sec <= 20) return 33 + easeInOutCubic((sec - 7) / 13) * 33 + pulse;
  return 66 + easeInOutCubic(Math.min(1, (sec - 20) / 25)) * 28 + pulse * 0.5;
}

type OnboardingAiLoadingProps = {
  phase: OnboardingAiLoadingPhase;
  /** Full-card overlay — blocks interaction beneath. */
  overlay?: boolean;
  className?: string;
  /** Skip AI wait and proceed with default routine (analyze phase only). */
  onUseDefault?: () => void;
  useDefaultLabel?: string;
};

/**
 * Onboarding AI wait UI — step progress, elapsed-time copy, skincare tips,
 * early context, gentle progress bar, and inline skip confirmation for analyze phase.
 */
export function OnboardingAiLoading({
  phase,
  overlay = false,
  className,
  onUseDefault,
  useDefaultLabel,
}: OnboardingAiLoadingProps) {
  const t = useTranslations("onboarding");
  const goal = useOnboardingStore((s) => s.goal);
  const concernIds = useOnboardingStore((s) => s.aiConcernTags);
  const photoCount = useOnboardingStore((s) => s.photos.length);

  const [elapsedMs, setElapsedMs] = useState(0);
  const [routineProgress, setRoutineProgress] = useState(6);
  const [confirmSkip, setConfirmSkip] = useState(false);

  useEffect(() => {
    setElapsedMs(0);
    setRoutineProgress(6);
    setConfirmSkip(false);
    const start = Date.now();
    const tick = window.setInterval(() => {
      setElapsedMs(Date.now() - start);
    }, 200);
    return () => window.clearInterval(tick);
  }, [phase]);

  useEffect(() => {
    if (phase !== "starterRoutine") return;
    const tick = window.setInterval(() => {
      setRoutineProgress((p) => {
        if (p >= 94) return p;
        const bump = p < 35 ? 3.5 : p < 75 ? 2 : 0.6;
        return Math.min(94, p + bump);
      });
    }, 850);
    return () => window.clearInterval(tick);
  }, [phase]);

  const analyzeTierIndex = useMemo(() => {
    const sec = elapsedMs / 1000;
    if (sec >= 30) return 2;
    if (sec >= 15) return 1;
    return 0;
  }, [elapsedMs]);

  const stageKey = useMemo(() => {
    if (phase === "analyze") {
      return stageKeyForElapsed(elapsedMs, ANALYZE_TIME_THRESHOLDS_S, ANALYZE_TIME_KEYS);
    }
    return stageKeyForElapsed(elapsedMs, ROUTINE_TIME_THRESHOLDS_S, ROUTINE_TIME_KEYS);
  }, [elapsedMs, phase]);

  const whyKey = ANALYZE_WHY_KEYS[analyzeTierIndex];

  const activeAnalyzeStep = analyzeStepIndex(elapsedMs);
  const connectorProgress = analyzeConnectorProgress(elapsedMs);
  const softSkip = phase === "analyze" && elapsedMs >= ANALYZE_SOFT_SKIP_MS;
  const emphasizeSkip = phase === "analyze" && elapsedMs >= ANALYZE_EMPHASIZE_SKIP_MS;
  const showEarlyContext = phase === "analyze" && elapsedMs >= ANALYZE_EARLY_CONTEXT_MS;
  const showTip = phase === "analyze" && elapsedMs >= ANALYZE_TIP_START_MS;

  const barProgress =
    phase === "analyze"
      ? Math.min(96, connectorProgress + easeInOutCubic((elapsedMs % 1800) / 1800) * 1.5)
      : routineProgress;

  const tipText = useMemo(() => {
    if (!showTip) return "";
    const tipIndex = Math.floor((elapsedMs - ANALYZE_TIP_START_MS) / ANALYZE_TIP_ROTATE_MS);
    const goalTipKey = goal ? GOAL_TIP_KEYS[goal] : undefined;
    if (tipIndex === 0 && goalTipKey) {
      return t(goalTipKey as "aiLoading.tip1");
    }
    const generalIdx = goalTipKey
      ? (tipIndex - 1) % ANALYZE_TIP_KEYS.length
      : tipIndex % ANALYZE_TIP_KEYS.length;
    return t(ANALYZE_TIP_KEYS[generalIdx]!);
  }, [elapsedMs, goal, showTip, t]);

  const tipKey = useMemo(() => {
    if (!showTip) return "";
    const tipIndex = Math.floor((elapsedMs - ANALYZE_TIP_START_MS) / ANALYZE_TIP_ROTATE_MS);
    return `${goal ?? "none"}-${tipIndex}`;
  }, [elapsedMs, goal, showTip]);

  const concernLabels = useMemo(
    () =>
      concernIds.map((id) => {
        if (!(STEP1_CONCERNS as readonly string[]).includes(id)) return id;
        return t(`aiConcerns.${id}` as "aiConcerns.acne");
      }),
    [concernIds, t],
  );

  const goalLabel = goal ? t(`goal.${goal}`) : null;

  const stageLabel = t(stageKey as "aiLoading.analyzeTime0");
  const titleId = "onboarding-ai-loading-title";
  const stageMessageId = "onboarding-ai-loading-stage";

  const analyzeSteps = [
    { label: t("aiLoading.stepPhotos") },
    { label: t("aiLoading.stepSkin") },
    { label: t("aiLoading.stepRoutine") },
  ] as const;

  const skipBlock =
    phase === "analyze" && onUseDefault && useDefaultLabel ? (
      <div
        className={cn(
          "w-full max-w-sm rounded-xl border p-3 transition-all duration-500 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300",
          emphasizeSkip
            ? "border-primary/45 bg-primary/8 shadow-md ring-1 ring-primary/25"
            : softSkip
              ? "border-primary/25 bg-muted/30"
              : "border-border/60 bg-muted/15",
        )}
      >
        {emphasizeSkip ? (
          <p className="mb-2 text-center text-xs font-medium text-foreground">
            {t("aiLoading.skipCardTitle")}
          </p>
        ) : null}
        {confirmSkip ? (
          <div
            className="space-y-3 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
            role="region"
            aria-label={t("aiLoading.skipConfirmAria")}
          >
            <div className="space-y-1 text-left">
              <p className="text-sm leading-snug text-foreground">
                {t("aiLoading.skipConfirmBenefit")}
              </p>
              <p className="text-xs leading-snug text-muted-foreground">
                {t("aiLoading.skipConfirmNote")}
              </p>
            </div>
            <div
              className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
              role="group"
              aria-label={t("aiLoading.skipConfirmAria")}
            >
              <Button
                type="button"
                variant="default"
                className="min-h-11 w-full"
                onClick={() => {
                  setConfirmSkip(false);
                  onUseDefault();
                }}
              >
                {t("aiLoading.skipConfirmYes")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full"
                onClick={() => setConfirmSkip(false)}
              >
                {t("aiLoading.skipConfirmNo")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Button
              type="button"
              variant={emphasizeSkip || softSkip ? "default" : "outline"}
              aria-describedby={emphasizeSkip ? stageMessageId : undefined}
              className={cn(
                "min-h-11 w-full gap-2 text-sm font-medium transition-all duration-500 ease-in-out",
                !emphasizeSkip &&
                  !softSkip &&
                  "border-primary/35 bg-background shadow-sm hover:bg-primary/5",
                emphasizeSkip &&
                  "shadow-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500",
              )}
              onClick={() => setConfirmSkip(true)}
            >
              <ArrowRight className="size-4 shrink-0" aria-hidden />
              {useDefaultLabel}
            </Button>
            <p className="text-center text-[11px] leading-snug text-muted-foreground/90">
              {emphasizeSkip ? t("aiLoading.skipValueHintShort") : t("aiLoading.skipValueHint")}
            </p>
          </div>
        )}
      </div>
    ) : null;

  const content = (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center gap-2.5 px-3 py-3 text-center sm:gap-3.5 sm:px-4 sm:py-5 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-labelledby={titleId}
    >
      <div className="relative size-12 sm:size-14" aria-hidden>
        <div className="absolute inset-0 rounded-full border-[3px] border-primary/15 sm:border-4" />
        <div
          className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-primary sm:border-4"
          style={{ animationDuration: "1.1s" }}
        />
        <div
          className="absolute -inset-1 animate-spin rounded-full motion-reduce:animate-none"
          style={{
            animationDuration: "4s",
            background:
              "conic-gradient(from 0deg, transparent 0%, hsl(var(--primary) / 0.15) 25%, transparent 50%)",
          }}
        />
        <Sparkles className="absolute inset-0 m-auto size-6 text-primary motion-safe:animate-pulse sm:size-7" />
      </div>

      <div className="w-full max-w-sm space-y-1.5">
        <p id={titleId} className="text-base font-semibold leading-snug">
          {t(TITLE_KEYS[phase])}
        </p>

        <div className="space-y-1">
          {emphasizeSkip && phase === "analyze" ? (
            <div
              id={stageMessageId}
              key="long-wait"
              className="space-y-1 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500"
            >
              <p className="text-sm font-medium leading-snug text-foreground">
                {t("aiLoading.analyzeTime30Line1")}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t("aiLoading.analyzeTime30Line2")}
              </p>
            </div>
          ) : (
            <div
              key={stageKey}
              className="space-y-0.5 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500"
            >
              <p
                id={stageMessageId}
                className="min-h-[2.25rem] text-sm leading-relaxed text-muted-foreground"
              >
                {stageLabel}
              </p>
              {phase === "analyze" ? (
                <p className="text-xs leading-relaxed text-muted-foreground/80">{t(whyKey)}</p>
              ) : null}
            </div>
          )}
        </div>

        {phase === "analyze" ? (
          <span className="inline-flex items-center rounded-full bg-muted/80 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            {t("aiLoading.durationHint")}
          </span>
        ) : null}
      </div>

      {showEarlyContext && goalLabel ? (
        <div
          className="w-full max-w-sm rounded-lg border border-primary/15 bg-primary/5 px-3 py-2.5 text-left motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-500"
          aria-label={t("aiLoading.earlyContextAria")}
        >
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary/90">
            <Target className="size-3.5 shrink-0" aria-hidden />
            {t("aiLoading.earlyContextTitle")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-background/80 px-2 py-0.5 text-[11px] font-medium text-foreground ring-1 ring-primary/15">
              {goalLabel}
            </span>
            {concernLabels.map((label) => (
              <span
                key={label}
                className="rounded-full bg-background/60 px-2 py-0.5 text-[11px] text-muted-foreground ring-1 ring-border/80"
              >
                {label}
              </span>
            ))}
          </div>
          {photoCount > 0 ? (
            <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground">
              {t("aiLoading.earlyContextPhotos", { count: photoCount })}
            </p>
          ) : null}
        </div>
      ) : null}

      {showTip && tipText ? (
        <div
          key={tipKey}
          className="flex w-full max-w-sm items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/8 px-3 py-2.5 text-left motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-500"
          aria-label={t("aiLoading.tipAria")}
        >
          <Lightbulb
            className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
            aria-hidden
          />
          <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-100">{tipText}</p>
        </div>
      ) : null}

      {phase === "analyze" ? (
        <div className="w-full max-w-sm px-1">
          <ol
            className="relative flex items-start justify-between"
            aria-label={t("aiLoading.stepsAria")}
          >
            <div
              className="pointer-events-none absolute left-[16.67%] right-[16.67%] top-4 h-[3px] -translate-y-1/2 rounded-full bg-muted"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute left-[16.67%] top-4 h-[3px] w-2/3 origin-left -translate-y-1/2 rounded-full bg-gradient-to-r from-primary/70 via-primary to-primary/80 transition-transform duration-[900ms] will-change-transform [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none"
              style={{ transform: `scaleX(${Math.min(100, connectorProgress) / 100})` }}
              aria-hidden
            />
            {analyzeSteps.map((step, i) => {
              const done = i < activeAnalyzeStep;
              const active = i === activeAnalyzeStep;
              return (
                <li key={step.label} className="relative z-10 flex min-w-0 flex-1 flex-col items-center gap-1.5">
                  <div className="relative flex size-8 items-center justify-center">
                    {active ? (
                      <>
                        <span
                          className="pointer-events-none absolute -inset-1 rounded-full motion-safe:animate-[spin_3s_linear_infinite] motion-reduce:animate-none"
                          style={{
                            background:
                              "conic-gradient(from 0deg, transparent, hsl(var(--primary) / 0.35), transparent 70%)",
                          }}
                          aria-hidden
                        />
                        <span
                          className="pointer-events-none absolute -inset-0.5 rounded-full ring-2 ring-primary/20 motion-safe:animate-[pulse_2.5s_ease-in-out_infinite] motion-reduce:animate-none"
                          aria-hidden
                        />
                      </>
                    ) : null}
                    <div
                      className={cn(
                        "relative flex size-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all duration-[900ms] [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
                        done && "border-primary bg-primary text-primary-foreground scale-100",
                        active && "border-primary bg-background text-primary scale-105",
                        !done &&
                          !active &&
                          "border-muted-foreground/25 bg-background text-muted-foreground/45 scale-95",
                      )}
                      aria-current={active ? "step" : undefined}
                    >
                      {done ? (
                        <Check
                          className="size-4 stroke-[3] motion-safe:animate-in motion-safe:zoom-in-75 motion-safe:duration-300"
                          aria-hidden
                        />
                      ) : active ? (
                        <span
                          className="size-2.5 rounded-full bg-primary motion-safe:animate-[pulse_2s_ease-in-out_infinite] motion-reduce:animate-none"
                          aria-hidden
                        />
                      ) : (
                        <span className="text-[10px] font-medium">{i + 1}</span>
                      )}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "w-full px-0.5 text-center text-[10px] leading-tight transition-all duration-[900ms] [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] sm:text-[11px]",
                      done && "font-medium text-foreground",
                      active && "font-semibold text-foreground",
                      !done && !active && "text-muted-foreground/70",
                    )}
                  >
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}

      <div className="w-full max-w-xs space-y-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-muted sm:h-2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary transition-[width] duration-700 ease-out"
            style={{ width: `${barProgress}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground/80 sm:text-[11px]">
          {phase === "analyze" ? t("aiLoading.progressHintAnalyze") : t("aiLoading.progressHint")}
        </p>
      </div>

      {skipBlock}
    </div>
  );

  if (overlay) {
    return (
      <div
        className="absolute inset-0 z-30 flex items-start justify-center overflow-y-auto rounded-xl bg-background/95 backdrop-blur-sm sm:items-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === "Escape" && e.preventDefault()}
      >
        {content}
      </div>
    );
  }

  return content;
}
