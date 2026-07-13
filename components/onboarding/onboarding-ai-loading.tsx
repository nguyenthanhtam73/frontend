"use client";

import { AlertTriangle, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  ONBOARDING_ANALYZE_SLOW_HINT_MS,
} from "@/lib/onboarding/constants";
import { cn } from "@/lib/utils";

export type OnboardingAiLoadingPhase = "analyze" | "starterRoutine";

/** Time-based status copy for analyze (seconds). */
const ANALYZE_TIME_THRESHOLDS_S = [0, 10, 25, 40] as const;
const ANALYZE_TIME_KEYS = [
  "aiLoading.analyzeTime0",
  "aiLoading.analyzeTime10",
  "aiLoading.analyzeTime25",
  "aiLoading.analyzeTime40",
] as const;

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
 * Onboarding AI wait UI — elapsed-time status copy, gentle progress,
 * slow hint after 35s, and fade when the message changes.
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

  useEffect(() => {
    setElapsedMs(0);
    setProgress(6);
    const start = Date.now();
    const tick = window.setInterval(() => {
      setElapsedMs(Date.now() - start);
    }, 500);
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

  const showSlowHint =
    phase === "analyze" && elapsedMs >= ONBOARDING_ANALYZE_SLOW_HINT_MS;

  const stageLabel = t(stageKey as "aiLoading.analyzeTime0");
  const titleId = "onboarding-ai-loading-title";

  const content = (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-5 px-4 py-6 text-center motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-labelledby={titleId}
    >
      <div className="relative size-16" aria-hidden>
        <div className="absolute inset-0 rounded-full border-4 border-primary/15" />
        <div
          className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary"
          style={{ animationDuration: "1.1s" }}
        />
        <Sparkles className="absolute inset-0 m-auto size-7 text-primary motion-safe:animate-pulse" />
      </div>

      <div className="w-full max-w-sm space-y-2.5">
        <p id={titleId} className="text-base font-semibold leading-snug">
          {t(TITLE_KEYS[phase])}
        </p>

        <p
          key={stageKey}
          className="min-h-[2.75rem] text-sm leading-relaxed text-muted-foreground motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500"
        >
          {stageLabel}
        </p>

        {phase === "analyze" ? (
          <p className="text-[11px] text-muted-foreground/90">
            {t("aiLoading.durationHint")}
          </p>
        ) : null}

        {showSlowHint ? (
          <p
            key="slow-hint"
            className="flex items-center justify-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500"
          >
            <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
            {t("aiLoading.slowHint")}
          </p>
        ) : null}
      </div>

      <div className="w-full max-w-xs space-y-1.5">
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">{t("aiLoading.progressHint")}</p>
      </div>

      {phase === "analyze" && onUseDefault && useDefaultLabel ? (
        <Button type="button" variant="outline" size="sm" onClick={onUseDefault}>
          {useDefaultLabel}
        </Button>
      ) : null}
    </div>
  );

  if (overlay) {
    return (
      <div
        className="absolute inset-0 z-30 flex items-center justify-center rounded-xl bg-background/95 backdrop-blur-sm"
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
