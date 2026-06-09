"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

type StarterRoutineGenerationNoticeProps = {
  isGeneratingRoutine: boolean;
  showFallbackBanner: boolean;
  isGuest?: boolean;
};

export function StarterRoutineGenerationNotice({
  isGeneratingRoutine,
  showFallbackBanner,
  isGuest = false,
}: StarterRoutineGenerationNoticeProps) {
  const t = useTranslations("coachWelcome");

  return (
    <>
      {isGeneratingRoutine ? (
        <div
          className="space-y-1 text-center sm:text-left"
          role="status"
          aria-live="polite"
        >
          <p className="flex items-center justify-center gap-2 text-xs leading-relaxed text-muted-foreground sm:justify-start">
            <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground/80" aria-hidden />
            {t("starterGenerating")}
          </p>
          {isGuest ? (
            <p className="text-[11px] leading-relaxed text-muted-foreground/90 sm:text-xs">
              {t("starterGeneratingGuestHint")}
            </p>
          ) : null}
        </div>
      ) : null}

      {showFallbackBanner && !isGuest ? (
        <div
          className="rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2.5 text-sm leading-relaxed text-amber-950/80 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-100/90"
          role="status"
        >
          {t("starterFallbackNotice")}
        </div>
      ) : null}
    </>
  );
}
