"use client";

import {
  AlertTriangle,
  ArrowRight,
  Ban,
  Lightbulb,
  Loader2,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const STATUS_MESSAGE_COUNT = 5;

type Variant = "submitting" | "processing" | "timeout";

/**
 * Loading / timeout panel while waiting for AI coach feedback after check-in.
 * Shows skeleton placeholders, fake progress, rotating status copy, and actions.
 */
export function AiFeedbackLoading({
  variant = "processing",
  progress,
  statusStep = 0,
  onCancelWait,
  onViewLater,
  onRetryPolling,
}: {
  variant?: Variant;
  progress: number;
  statusStep?: number;
  onCancelWait?: () => void;
  onViewLater?: () => void;
  onRetryPolling?: () => void;
}) {
  const t = useTranslations("checkIn.feedbackLoading");
  const isSubmitting = variant === "submitting";
  const isTimeout = variant === "timeout";
  const pct = Math.max(0, Math.min(100, Math.round(progress)));

  const statusIdx =
    statusStep % STATUS_MESSAGE_COUNT;
  const statusKey = `status${statusIdx + 1}` as
    | "status1"
    | "status2"
    | "status3"
    | "status4"
    | "status5";

  const title = isTimeout
    ? t("timeoutTitle")
    : isSubmitting
      ? t("submittingTitle")
      : t("title");

  const subtitle = isTimeout
    ? t("timeoutBody")
    : isSubmitting
      ? t("submittingSubtitle")
      : t(statusKey);

  return (
    <Card
      className={cn(
        "overflow-hidden shadow-sm motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-300",
        isTimeout
          ? "border-amber-500/35 bg-linear-to-br from-amber-500/8 via-background to-background"
          : "border-primary/30 bg-linear-to-br from-primary/8 via-accent/15 to-background",
      )}
      role={isTimeout ? "alert" : "status"}
      aria-busy={!isTimeout}
    >
      <CardContent className="space-y-4 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "inline-flex size-10 shrink-0 items-center justify-center rounded-full",
                isTimeout
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                  : "bg-primary/10 text-primary",
              )}
            >
              {isTimeout ? (
                <AlertTriangle className="size-5" aria-hidden />
              ) : (
                <Loader2 className="size-5 animate-spin" aria-hidden />
              )}
            </span>
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold tracking-tight">{title}</p>
              <p
                className={cn(
                  "text-xs leading-relaxed sm:text-sm",
                  isTimeout
                    ? "text-muted-foreground"
                    : "text-muted-foreground motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500",
                )}
                key={isTimeout ? "timeout" : `${variant}-${statusIdx}`}
              >
                {subtitle}
              </p>
            </div>
          </div>
          {!isTimeout && !isSubmitting && onCancelWait ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onCancelWait}
              className="min-h-11 shrink-0 gap-1.5 sm:min-h-9"
            >
              <X className="size-3.5" aria-hidden />
              {t("cancelWait")}
            </Button>
          ) : null}
        </div>

        {!isTimeout ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-primary" aria-hidden />
                {isSubmitting ? t("submittingProgress") : t("progressLabel")}
              </span>
              {!isSubmitting ? (
                <span className="tabular-nums font-medium text-foreground">
                  {pct}%
                </span>
              ) : null}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-500 ease-out",
                  isSubmitting
                    ? "w-[35%] motion-safe:animate-pulse bg-primary/60"
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
        ) : null}

        {!isTimeout ? <CoachFeedbackSkeleton /> : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {isTimeout && onRetryPolling ? (
            <Button
              type="button"
              size="sm"
              onClick={onRetryPolling}
              className="min-h-11 gap-1.5 sm:min-h-9"
            >
              <RefreshCw className="size-4" aria-hidden />
              {t("retryPolling")}
            </Button>
          ) : null}
          {(isTimeout || (!isSubmitting && onViewLater)) && onViewLater ? (
            <Button
              type="button"
              size="sm"
              variant={isTimeout ? "outline" : "secondary"}
              onClick={onViewLater}
              className="min-h-11 gap-1.5 sm:min-h-9"
            >
              {t("viewLater")}
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          ) : null}
        </div>

        {!isTimeout && !isSubmitting ? (
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {t("keepTabHint")}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** Placeholder blocks mirroring the coach feedback layout. */
function CoachFeedbackSkeleton() {
  return (
    <div className="space-y-3">
      <SkeletonBlock icon={<Sparkles className="size-3.5 text-primary" aria-hidden />} lines={3} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SkeletonRoutineColumn
          icon={<Sun className="size-3.5 text-amber-500" aria-hidden />}
          rows={3}
        />
        <SkeletonRoutineColumn
          icon={<Moon className="size-3.5 text-indigo-500" aria-hidden />}
          rows={2}
        />
      </div>
      <SkeletonBlock icon={<Lightbulb className="size-3.5 text-amber-600" aria-hidden />} lines={2} />
      <SkeletonBlock icon={<Ban className="size-3.5 text-orange-600" aria-hidden />} lines={1} wide />
      <SkeletonBlock icon={<ShieldCheck className="size-3.5 text-emerald-600" aria-hidden />} lines={2} />
    </div>
  );
}

function SkeletonBlock({
  icon,
  lines,
  wide,
}: {
  icon: React.ReactNode;
  lines: number;
  wide?: boolean;
}) {
  return (
    <div className="rounded-xl border border-dashed border-primary/15 bg-card/40 p-3 sm:p-4">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted/80">
          {icon}
        </span>
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn(
              "h-2.5 w-full",
              !wide && i === 0 && "max-w-[88%]",
              !wide && i === 1 && "max-w-[76%]",
              !wide && i === 2 && "max-w-[82%]",
            )}
          />
        ))}
      </div>
    </div>
  );
}

function SkeletonRoutineColumn({
  icon,
  rows,
}: {
  icon: React.ReactNode;
  rows: number;
}) {
  return (
    <div className="rounded-xl border border-dashed border-primary/20 bg-card/40 p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary/10">
          {icon}
        </span>
        <Skeleton className="h-3 w-16" />
      </div>
      <ol className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <li key={i} className="flex items-center gap-2">
            <Skeleton className="size-5 shrink-0 rounded-full" />
            <Skeleton
              className={cn(
                "h-2.5 flex-1",
                i === 0 && "max-w-[85%]",
                i === 1 && "max-w-[72%]",
                i === 2 && "max-w-[78%]",
              )}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}
