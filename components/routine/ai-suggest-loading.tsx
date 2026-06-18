"use client";

import { AlertCircle, Loader2, Moon, RefreshCw, Sparkles, Sun, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const SKELETON_AM = 4;
const SKELETON_PM = 3;

/**
 * Loading / error panel for async AI routine suggestion.
 * Cancel is only shown while the job is actively processing.
 */
export function AiSuggestLoading({
  variant = "loading",
  title,
  subtitle,
  progress,
  progressLabel,
  cancelLabel,
  cancellingLabel,
  errorMessage,
  retryLabel,
  onCancel,
  onRetry,
  showCancel = true,
  cancelling = false,
}: {
  variant?: "loading" | "error";
  title: string;
  subtitle: string;
  progress: number;
  progressLabel: string;
  cancelLabel: string;
  cancellingLabel?: string;
  errorMessage?: string;
  retryLabel?: string;
  onCancel?: () => void;
  onRetry?: () => void;
  showCancel?: boolean;
  cancelling?: boolean;
}) {
  const isError = variant === "error";
  const pct = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <Card
      className={cn(
        "overflow-hidden shadow-sm in-animate animate-in fade-in slide-in-from-top-2 duration-300",
        isError
          ? "border-destructive/35 bg-linear-to-br from-destructive/8 via-background to-background"
          : "border-primary/30 bg-linear-to-br from-primary/8 via-accent/15 to-background",
      )}
      role={isError ? "alert" : "status"}
    >
      <CardContent className="space-y-4 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "inline-flex size-10 shrink-0 items-center justify-center rounded-full",
                isError
                  ? "bg-destructive/10 text-destructive"
                  : "bg-primary/10 text-primary",
              )}
            >
              {isError ? (
                <AlertCircle className="size-5" aria-hidden />
              ) : (
                <Loader2 className="size-5 animate-spin" aria-hidden />
              )}
            </span>
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold tracking-tight">{title}</p>
              <p
                className={cn(
                  "text-xs leading-relaxed sm:text-sm",
                  isError ? "text-destructive/90" : "text-muted-foreground",
                )}
              >
                {isError && errorMessage
                  ? errorMessage
                  : cancelling && cancellingLabel
                    ? cancellingLabel
                    : subtitle}
              </p>
            </div>
          </div>
          {showCancel && !isError && onCancel ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onCancel}
              disabled={cancelling}
              aria-busy={cancelling}
              className="shrink-0 gap-1.5 min-w-[5.5rem]"
            >
              {cancelling ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <X className="size-3.5" aria-hidden />
              )}
              {cancelling && cancellingLabel ? cancellingLabel : cancelLabel}
            </Button>
          ) : null}
        </div>

        {!isError ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-primary" aria-hidden />
                {progressLabel}
              </span>
              <span className="tabular-nums font-medium text-foreground">{pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-linear-to-r from-primary/70 to-primary transition-[width] duration-500 ease-out"
                style={{ width: `${pct}%` }}
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        ) : null}

        {!isError ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SkeletonSection
              icon={<Sun className="size-4 text-amber-500" aria-hidden />}
              title="AM"
              rows={SKELETON_AM}
            />
            <SkeletonSection
              icon={<Moon className="size-4 text-indigo-500" aria-hidden />}
              title="PM"
              rows={SKELETON_PM}
            />
          </div>
        ) : null}

        {isError && onRetry && retryLabel ? (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="button" size="sm" onClick={onRetry} className="gap-1.5">
              <RefreshCw className="size-4" aria-hidden />
              {retryLabel}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SkeletonSection({
  icon,
  title,
  rows,
}: {
  icon: React.ReactNode;
  title: string;
  rows: number;
}) {
  return (
    <div className="rounded-xl border border-dashed border-primary/20 bg-card/40 p-3 sm:p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-foreground/80">
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary/10">
          {icon}
        </span>
        {title}
      </div>
      <ol className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <li key={i} className="flex items-center gap-2.5">
            <span className="size-6 shrink-0 rounded-full bg-muted motion-safe:animate-pulse" />
            <span
              className="h-3 flex-1 rounded-md bg-muted motion-safe:animate-pulse"
              style={{ maxWidth: `${68 + ((i * 11) % 24)}%` }}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}
