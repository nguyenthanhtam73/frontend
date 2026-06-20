"use client";

import { Loader2, Sparkles, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { usePendingCheckinBanner } from "@/components/progress/use-pending-checkin-banner";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { cn } from "@/lib/utils";

function formatWaitDuration(
  ms: number,
  t: (key: "waitElapsedMinSec" | "waitElapsedSec", values: { m?: number; s: number }) => string,
): string {
  const totalSec = Math.max(1, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m > 0) {
    return t("waitElapsedMinSec", { m, s });
  }
  return t("waitElapsedSec", { s: totalSec });
}

/**
 * Subtle banner on /progress when the latest check-in is still awaiting AI feedback.
 */
export function PendingCheckinBanner({ className }: { className?: string }) {
  const t = useTranslations("progress.pendingBanner");
  const { show, exiting, elapsedMs, dismiss } = usePendingCheckinBanner();

  if (!show) return null;

  return (
    <div
      className={cn(
        "mb-3 flex flex-col gap-2 rounded-lg border border-amber-500/20 bg-linear-to-r from-amber-500/6 via-primary/4 to-background px-2.5 py-2 shadow-sm sm:mb-5 sm:gap-3 sm:rounded-xl sm:border-amber-500/25 sm:from-amber-500/8 sm:via-primary/5 sm:px-4 sm:py-3",
        exiting
          ? "motion-safe:animate-out motion-safe:fade-out motion-safe:slide-out-to-top-1 motion-safe:duration-300"
          : "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-300",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex min-w-0 items-start gap-2 sm:items-center sm:gap-3">
        <span
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-300 sm:size-8"
          aria-hidden
        >
          <Loader2 className="size-3.5 animate-spin sm:size-4" />
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-xs font-semibold leading-snug text-foreground sm:text-sm">
            {t("title")}
          </p>
          <p className="hidden text-xs leading-relaxed text-muted-foreground sm:block sm:text-sm">
            {t("body")}
          </p>
          {elapsedMs > 0 ? (
            <p className="text-[10px] tabular-nums text-muted-foreground/90 sm:text-xs">
              {t("waitElapsed", {
                duration: formatWaitDuration(elapsedMs, t),
              })}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex items-stretch gap-2 sm:justify-end">
        <ButtonLink
          href="/check-in"
          size="sm"
          className="min-h-11 flex-1 gap-1.5 text-xs sm:min-h-9 sm:flex-none sm:text-sm"
        >
          <Sparkles className="size-3.5 shrink-0" aria-hidden />
          {t("viewDetail")}
        </ButtonLink>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={dismiss}
          className="min-h-11 shrink-0 gap-1 px-3 text-xs text-muted-foreground hover:text-foreground sm:min-h-9 sm:text-sm"
          aria-label={t("dismiss")}
        >
          <X className="size-3.5" aria-hidden />
          <span className="sr-only sm:not-sr-only">{t("dismiss")}</span>
        </Button>
      </div>
    </div>
  );
}
