"use client";

import { ArrowRight, Check, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type OnboardingAiLoadingPhase = "analyze" | "starterRoutine";

/** Analyze copy phases (seconds): 0–10 · 10–25 · 25–30 · 30+ */
const ANALYZE_TIME_THRESHOLDS_S = [0, 10, 25, 30] as const;
const ANALYZE_TIME_KEYS = [
  "aiLoading.analyzeTime0",
  "aiLoading.analyzeTime10",
  "aiLoading.analyzeTime25",
  "aiLoading.analyzeTime30",
] as const;

/** Visual stepper lags copy slightly — avoids false “done” feel vs real AI timing. */
const ANALYZE_STEP_THRESHOLDS_S = [0, 12, 28] as const;

const ANALYZE_EMPHASIZE_SKIP_MS = 30_000;

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

/** Connector progress 0–100%, paced to visual step thresholds (12s · 28s). */
function analyzeConnectorProgress(elapsedMs: number): number {
  const sec = elapsedMs / 1000;
  if (sec <= 12) return easeInOutCubic(sec / 12) * 50;
  if (sec <= 28) return 50 + easeInOutCubic((sec - 12) / 16) * 45;
  // Step 3 active: creep slowly so the bar never feels “finished” while AI runs.
  return 95 + easeInOutCubic(Math.min(1, (sec - 28) / 17)) * 3;
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
 * Onboarding AI wait UI — step progress, elapsed-time copy, gentle progress bar,
 * timed reassurance, and inline skip confirmation for analyze phase.
 */
export function OnboardingAiLoading({
  phase,
  overlay = false,
  className,
  onUseDefault,
  useDefaultLabel,
}: OnboardingAiLoadingProps) {
  const t = useTranslations("onboarding");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [progress, setProgress] = useState(6);
  const [confirmSkip, setConfirmSkip] = useState(false);

  useEffect(() => {
    setElapsedMs(0);
    setProgress(6);
    setConfirmSkip(false);
    const start = Date.now();
    const tick = window.setInterval(() => {
      setElapsedMs(Date.now() - start);
    }, 200);
    return () => window.clearInterval(tick);
  }, [phase]);

  useEffect(() => {
    const tick = window.setInterval(() => {
      setProgress((p) => {
        if (p >= 94) return p;
        const bump = p < 35 ? 3.5 : p < 75 ? 2 : 0.6;
        return Math.min(94, p + bump);
      });
    }, 850);
    return () => window.clearInterval(tick);
  }, [phase]);

  const stageKey = useMemo(() => {
    if (phase === "analyze") {
      return stageKeyForElapsed(elapsedMs, ANALYZE_TIME_THRESHOLDS_S, ANALYZE_TIME_KEYS);
    }
    return stageKeyForElapsed(elapsedMs, ROUTINE_TIME_THRESHOLDS_S, ROUTINE_TIME_KEYS);
  }, [elapsedMs, phase]);

  const activeAnalyzeStep = analyzeStepIndex(elapsedMs);
  const connectorProgress = analyzeConnectorProgress(elapsedMs);
  const emphasizeSkip = phase === "analyze" && elapsedMs >= ANALYZE_EMPHASIZE_SKIP_MS;

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
      <div className="w-full max-w-sm">
        {confirmSkip ? (
          <div
            className="space-y-3 rounded-lg bg-muted/25 px-3 py-2.5 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
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
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2" role="group" aria-label={t("aiLoading.skipConfirmAria")}>
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
              variant={emphasizeSkip ? "default" : "outline"}
              aria-describedby={emphasizeSkip ? stageMessageId : undefined}
              className={cn(
                "min-h-11 w-full gap-2 text-sm font-medium transition-all duration-500 ease-in-out",
                emphasizeSkip
                  ? "shadow-md ring-2 ring-primary/40 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500"
                  : "border-primary/40 bg-background shadow-sm hover:bg-primary/5",
              )}
              onClick={() => setConfirmSkip(true)}
            >
              <ArrowRight className="size-4 shrink-0" aria-hidden />
              {useDefaultLabel}
            </Button>
            {!emphasizeSkip ? (
              <p className="text-center text-[11px] leading-snug text-muted-foreground/90">
                {t("aiLoading.skipValueHint")}
              </p>
            ) : (
              <p className="text-center text-[11px] leading-snug text-muted-foreground/90">
                {t("aiLoading.skipValueHintShort")}
              </p>
            )}
          </div>
        )}
      </div>
    ) : null;

  const content = (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center gap-2.5 px-3 py-3 text-center sm:gap-4 sm:px-4 sm:py-5 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300",
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
        <Sparkles className="absolute inset-0 m-auto size-6 text-primary motion-safe:animate-pulse sm:size-7" />
      </div>

      <div className="w-full max-w-sm space-y-1.5">
        <p id={titleId} className="text-base font-semibold leading-snug">
          {t(TITLE_KEYS[phase])}
        </p>

        <div className="space-y-1">
          {emphasizeSkip ? (
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
            <p
              id={stageMessageId}
              key={stageKey}
              className="min-h-[2.25rem] text-sm leading-relaxed text-muted-foreground motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500"
            >
              {stageLabel}
            </p>
          )}
        </div>

        {phase === "analyze" ? (
          <span className="inline-flex items-center rounded-full bg-muted/80 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            {t("aiLoading.durationHint")}
          </span>
        ) : null}
      </div>

      {skipBlock}

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
              className="pointer-events-none absolute left-[16.67%] top-4 h-[3px] w-2/3 origin-left -translate-y-1/2 rounded-full bg-gradient-to-r from-primary/80 to-primary transition-transform duration-[1600ms] will-change-transform [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none"
              style={{ transform: `scaleX(${connectorProgress / 100})` }}
              aria-hidden
            />
            {analyzeSteps.map((step, i) => {
              const done = i < activeAnalyzeStep;
              const active = i === activeAnalyzeStep;
              return (
                <li key={step.label} className="relative z-10 flex min-w-0 flex-1 flex-col items-center gap-1.5">
                  <div className="relative flex size-8 items-center justify-center">
                    {active ? (
                      <span
                        className="pointer-events-none absolute -inset-0.5 rounded-full ring-2 ring-primary/15 motion-safe:animate-[pulse_3s_ease-in-out_infinite] motion-reduce:animate-none"
                        aria-hidden
                      />
                    ) : null}
                    <div
                      className={cn(
                        "relative flex size-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all duration-[1400ms] [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none",
                        done && "border-primary bg-primary text-primary-foreground",
                        active && "border-primary bg-background text-primary",
                        !done && !active && "border-muted-foreground/25 bg-background text-muted-foreground/45",
                      )}
                      aria-current={active ? "step" : undefined}
                    >
                      {done ? (
                        <Check className="size-4 stroke-[3] motion-safe:animate-in motion-safe:zoom-in-75 motion-safe:duration-300" aria-hidden />
                      ) : active ? (
                        <span
                          className="size-2.5 rounded-full bg-primary motion-safe:animate-[pulse_2.5s_ease-in-out_infinite] motion-reduce:animate-none"
                          aria-hidden
                        />
                      ) : (
                        <span className="text-[10px] font-medium">{i + 1}</span>
                      )}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "w-full px-0.5 text-center text-[10px] leading-tight transition-colors duration-[1400ms] [transition-timing-function:cubic-bezier(0.4,0,0.2,1)] sm:text-[11px]",
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
            className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground/80 sm:text-[11px]">
          {t("aiLoading.progressHint")}
        </p>
      </div>
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
