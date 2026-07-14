"use client";

import { AlertCircle, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import type { OnboardingAiErrorKind } from "@/lib/onboarding/onboarding-ai";
import { onboardingAiErrorMessageKey } from "@/lib/onboarding/onboarding-ai";
import { cn } from "@/lib/utils";

type OnboardingAiErrorPanelProps = {
  titleKey?: string;
  errorKind: OnboardingAiErrorKind;
  onRetry: () => void;
  retryLabel?: string;
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Show fallback hint encouraging default routine (analyze step). */
  showFallbackHint?: boolean;
  className?: string;
};

/** Shared friendly AI error UI for onboarding steps 1 & 3. */
export function OnboardingAiErrorPanel({
  titleKey = "aiLoading.errorTitle",
  errorKind,
  onRetry,
  retryLabel,
  secondaryLabel,
  onSecondary,
  showFallbackHint = false,
  className,
}: OnboardingAiErrorPanelProps) {
  const t = useTranslations("onboarding");
  const msgKey = onboardingAiErrorMessageKey(errorKind);

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-destructive/25 bg-destructive/[0.04] p-4 text-sm motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-300",
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="font-medium text-foreground">{t(titleKey)}</p>
          <p className="leading-relaxed text-muted-foreground">
            {t(`aiLoading.${msgKey}` as "aiLoading.errors.timeout")}
          </p>
          {showFallbackHint ? (
            <p className="text-xs leading-relaxed text-muted-foreground/90">
              {t("aiLoading.errorFallbackHint")}
            </p>
          ) : errorKind === "timeout" ? (
            <p className="text-xs leading-relaxed text-muted-foreground/90">
              {t("aiLoading.timeoutFriendly")}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {onSecondary && secondaryLabel ? (
          <Button type="button" size="sm" variant="secondary" className="min-h-10 flex-1 sm:flex-none" onClick={onSecondary}>
            {secondaryLabel}
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="outline" className="min-h-10 flex-1 sm:flex-none" onClick={onRetry}>
          {retryLabel ?? t("aiLoading.retry")}
        </Button>
      </div>
    </div>
  );
}

type ManualSkinFallbackBannerProps = {
  onRetryAi: () => void;
  retryLabel: string;
  title: string;
  body: string;
  className?: string;
};

/** Shown when user picks skin type manually after AI failed — photos are kept. */
export function ManualSkinFallbackBanner({
  onRetryAi,
  retryLabel,
  title,
  body,
  className,
}: ManualSkinFallbackBannerProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-amber-300/70 bg-amber-50/90 px-3.5 py-3.5 text-sm dark:border-amber-500/35 dark:bg-amber-950/35 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-400",
        className,
      )}
      role="status"
    >
      <div className="flex items-start gap-2.5">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
        <div className="min-w-0 space-y-1">
          <p className="font-semibold text-amber-950 dark:text-amber-100">{title}</p>
          <p className="leading-relaxed text-amber-900/85 dark:text-amber-100/85">{body}</p>
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        className="self-start gap-1.5 bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500"
        onClick={onRetryAi}
      >
        <Sparkles className="size-3.5" aria-hidden />
        {retryLabel}
      </Button>
    </div>
  );
}
