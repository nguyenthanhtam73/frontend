"use client";

import { Loader2, RefreshCw, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

import { UsageQuotaChip } from "@/components/premium/premium-upsell-banner";

import { Banner } from "./banner";

/**
 * Compact AI-suggest panel used once the user already has a routine on file.
 * Shows the focus-note input + the primary "Suggest" button. After a first
 * suggestion arrives, the same button morphs into "Try again" so the user
 * can re-roll without scrolling. Errors render in-place via the Banner.
 */
export function AISuggestCard({
  suggesting,
  busy = false,
  hasSuggestion,
  focusNote,
  onFocusChange,
  onSuggest,
  error,
  onDismissError,
  onRetry,
  labels,
  disabled = false,
  quotaLabel,
  manualEditQuotaLabel,
  manualEditLocked = false,
  onManualEditQuotaClick,
}: {
  suggesting: boolean;
  /** True while loading, cancelling, or error panel is shown. */
  busy?: boolean;
  hasSuggestion: boolean;
  focusNote: string;
  onFocusChange: (v: string) => void;
  onSuggest: () => void;
  error: string | null;
  onDismissError: () => void;
  onRetry?: () => void;
  labels: {
    title: string;
    body: string;
    cta: string;
    retry: string;
    loading: string;
    focusLabel: string;
    focusPlaceholder: string;
    closeError: string;
  };
  disabled?: boolean;
  quotaLabel?: string;
  /** Free-plan manual-edit quota — shown below AI quota so both limits are visible together. */
  manualEditQuotaLabel?: string;
  manualEditLocked?: boolean;
  onManualEditQuotaClick?: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-linear-to-br from-primary/10 via-accent/20 to-background p-4 shadow-sm sm:p-5">
      <div
        className="pointer-events-none absolute -right-12 -top-12 size-32 rounded-full bg-primary/20 blur-3xl"
        aria-hidden
      />
      <div className="relative space-y-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-background/80 shadow-sm ring-1 ring-primary/30">
            <Sparkles className="size-4 text-primary" aria-hidden />
          </span>
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-semibold leading-tight">{labels.title}</p>
            <p className="text-xs leading-snug text-muted-foreground sm:text-sm">
              {labels.body}
            </p>
          </div>
        </div>
        {quotaLabel || manualEditQuotaLabel ? (
          <div className="flex flex-wrap items-center gap-2">
            {quotaLabel ? <UsageQuotaChip label={quotaLabel} /> : null}
            {manualEditQuotaLabel ? (
              <UsageQuotaChip
                label={manualEditQuotaLabel}
                variant={manualEditLocked ? "warning" : "default"}
                onClick={manualEditLocked ? onManualEditQuotaClick : undefined}
              />
            ) : null}
          </div>
        ) : null}
        <div className="space-y-1.5">
          <label
            htmlFor="ai-focus-note"
            className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
          >
            {labels.focusLabel}
          </label>
          <input
            id="ai-focus-note"
            type="text"
            value={focusNote}
            onChange={(e) => onFocusChange(e.target.value)}
            placeholder={labels.focusPlaceholder}
            disabled={busy || disabled}
            className="h-11 w-full rounded-xl border bg-background/70 px-3 text-base outline-none ring-ring/40 transition focus:border-primary focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 sm:h-9 sm:text-sm"
          />
        </div>
        <Button
          type="button"
          size="default"
          className="min-h-11 w-full sm:min-h-9 sm:w-auto"
          onClick={onSuggest}
          disabled={busy || suggesting || disabled}
        >
          {suggesting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              <span>{labels.loading}</span>
            </>
          ) : error && onRetry ? (
            <>
              <RefreshCw className="size-4" aria-hidden />
              <span>{labels.retry}</span>
            </>
          ) : hasSuggestion ? (
            <>
              <RefreshCw className="size-4" aria-hidden />
              <span>{labels.retry}</span>
            </>
          ) : (
            <>
              <Sparkles className="size-4" aria-hidden />
              <span>{labels.cta}</span>
            </>
          )}
        </Button>
        {error ? (
          <div className="space-y-2">
            <Banner
              kind="err"
              message={error}
              onClose={onDismissError}
              closeLabel={labels.closeError}
            />
            {onRetry ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={onRetry}
                disabled={busy || suggesting || disabled}
              >
                <RefreshCw className="size-4" aria-hidden />
                {labels.retry}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}