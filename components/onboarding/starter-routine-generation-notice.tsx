"use client";

import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";

import { OnboardingAiLoading } from "@/components/onboarding/onboarding-ai-loading";
import { Button } from "@/components/ui/button";

type StarterRoutineGenerationNoticeProps = {
  isGeneratingRoutine: boolean;
  showFallbackBanner: boolean;
  showRetryAi?: boolean;
  isGuest?: boolean;
  retryLoading?: boolean;
  onRetryAi?: () => void;
};

export function StarterRoutineGenerationNotice({
  isGeneratingRoutine,
  showFallbackBanner,
  showRetryAi = false,
  isGuest = false,
  retryLoading = false,
  onRetryAi,
}: StarterRoutineGenerationNoticeProps) {
  const t = useTranslations("coachWelcome");

  return (
    <>
      {isGeneratingRoutine ? (
        <div className="rounded-xl border border-border/70 bg-muted/20 p-2 sm:p-3">
          <OnboardingAiLoading phase="starterRoutine" />
          {isGuest ? (
            <p className="mt-1 px-2 text-center text-[11px] leading-relaxed text-muted-foreground/90 sm:text-xs">
              {t("starterGeneratingGuestHint")}
            </p>
          ) : null}
        </div>
      ) : null}

      {(showFallbackBanner || showRetryAi) && !isGeneratingRoutine ? (
        <div
          className="space-y-3 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-3 text-sm leading-relaxed text-amber-950/80 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-100/90"
          role="status"
        >
          <p>{t("starterFallbackNotice")}</p>
          {showRetryAi && onRetryAi ? (
            <div className="space-y-1.5">
              <p className="text-xs text-amber-900/75 dark:text-amber-100/75">
                {t("retryAiRoutineHint")}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5 border-amber-300/80 bg-background/80"
                disabled={retryLoading}
                onClick={onRetryAi}
              >
                <RefreshCw
                  className={`size-3.5 ${retryLoading ? "animate-spin" : ""}`}
                  aria-hidden
                />
                {retryLoading ? t("retryAiRoutineLoading") : t("retryAiRoutine")}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
