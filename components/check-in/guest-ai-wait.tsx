"use client";

import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GUEST_AI_WAIT_STATUS_COUNT } from "@/lib/check-in/guest-ai-wait";
import { cn } from "@/lib/utils";

type GuestWaitVariant = "submitting" | "processing";

/**
 * Guest-appropriate analyzing panel. Same visual language as authenticated
 * AiFeedbackLoading, but no server poll, /progress "view later", or
 * "saved on server" copy — local-only until claim.
 */
export function GuestAiWait({
  variant,
  progress,
  statusStep = 0,
  onSkipWait,
}: {
  variant: GuestWaitVariant;
  progress: number;
  statusStep?: number;
  onSkipWait?: () => void;
}) {
  const t = useTranslations("checkIn.guestLocal.wait");
  const isSubmitting = variant === "submitting";
  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  const statusIdx = statusStep % GUEST_AI_WAIT_STATUS_COUNT;
  const statusKey = `status${statusIdx + 1}` as "status1" | "status2" | "status3";

  return (
    <Card
      className="overflow-hidden border-primary/30 bg-linear-to-br from-primary/8 via-accent/15 to-background shadow-sm motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-300"
      role="status"
      aria-busy
      data-testid="guest-ai-wait"
    >
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Loader2 className="size-5 animate-spin" aria-hidden />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold tracking-tight">
              {isSubmitting ? t("submittingTitle") : t("title")}
            </p>
            <p
              className="text-xs leading-relaxed text-muted-foreground motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500 sm:text-sm"
              key={isSubmitting ? "submitting" : statusKey}
            >
              {isSubmitting ? t("submittingSubtitle") : t(statusKey)}
            </p>
          </div>
        </div>

        {!isSubmitting ? (
          <p className="flex items-start gap-2 rounded-lg bg-emerald-500/10 px-3 py-2.5 text-xs font-medium leading-relaxed text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span className="min-w-0">{t("savedLocal")}</span>
          </p>
        ) : null}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-primary" aria-hidden />
              {isSubmitting ? t("submittingProgress") : t("progressLabel")}
            </span>
            {!isSubmitting ? (
              <span className="tabular-nums font-medium text-foreground">{pct}%</span>
            ) : null}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-500 ease-out",
                isSubmitting
                  ? "w-[35%] bg-primary/60 motion-safe:animate-pulse"
                  : "bg-linear-to-r from-primary/70 to-primary",
              )}
              style={isSubmitting ? undefined : { width: `${pct}%` }}
              role="progressbar"
              aria-valuenow={isSubmitting ? undefined : pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t("progressLabel")}
            />
          </div>
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground">{t("hint")}</p>

        {!isSubmitting && onSkipWait ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={onSkipWait}
            className="min-h-11 w-full sm:min-h-9"
            data-testid="guest-ai-wait-skip"
          >
            {t("skipWait")}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
