"use client";

import { Loader2, Send, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { apiBaseUrl } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-envelope";
import { getAccessToken } from "@/lib/auth-token";
import { cn } from "@/lib/utils";

/**
 * AIFeedbackTargetType — string enum mirroring `domain.AllAIFeedbackTargets`
 * on the Go backend. Keep both lists in sync.
 */
export type AIFeedbackTargetType =
  | "skin_analysis"
  | "starter_routine"
  | "suggested_routine"
  | "progress_summary"
  | "daily_check_in";

/** Two-state UI vote model. `null` = no vote yet. */
type FeedbackVote = "helpful" | "not_helpful";

/**
 * FeedbackButtons — small reusable "Đúng gu / Chưa hợp" widget for AI
 * surfaces (daily check-in, AI suggested routine, starter routine, progress
 * summary, etc.). Self-contained:
 *
 *   - Renders 2 thumb buttons with ARIA-pressed semantics.
 *   - On click, optimistically locks in the vote and reveals an OPTIONAL
 *     reason input. Reason submit re-POSTs the same vote with `comment`.
 *   - Surfaces success/error inline (no toast dependency) so it works on
 *     any page without extra wiring.
 *
 * Design notes (UX):
 *   - One tap = vote done (low-friction). Reason is opt-in and never blocks.
 *   - Skips the network call when target_id is missing (e.g. AI failed
 *     before persisting) — disables the buttons gracefully.
 *   - Compact mode renders the buttons inline (e.g. inside a small footer)
 *     and hides the headline.
 */
export function FeedbackButtons({
  targetType,
  targetId,
  className,
  size = "sm",
  compact = false,
  onSubmitted,
}: {
  targetType: AIFeedbackTargetType;
  /** UUID string. When falsy, the buttons render disabled — the AI surface
   *  must hand back a stable id before votes can be recorded. */
  targetId: string | null | undefined;
  className?: string;
  /** Visual size for the thumb buttons. Mirrors `Button` size. */
  size?: "xs" | "sm" | "default";
  /** When true, hides the heading + helper line; renders buttons only. */
  compact?: boolean;
  /** Optional callback fired after each successful POST so consumers can
   *  e.g. invalidate caches or update analytics. */
  onSubmitted?: (rating: FeedbackVote, comment: string) => void;
}) {
  const t = useTranslations("feedback");
  const reasonInputId = useId();

  const [vote, setVote] = useState<FeedbackVote | null>(null);
  const [submitting, setSubmitting] = useState<FeedbackVote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonSubmitting, setReasonSubmitting] = useState(false);
  const [reasonSent, setReasonSent] = useState(false);
  const reasonRef = useRef<HTMLTextAreaElement | null>(null);

  const disabled = !targetId;

  async function postFeedback(rating: FeedbackVote, comment: string): Promise<boolean> {
    if (!targetId) return false;
    const token = getAccessToken();
    if (!token) {
      setError(t("needLogin"));
      return false;
    }
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/ai/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId,
          rating,
          comment: comment.trim() || undefined,
        }),
      });
      const raw = await res.json().catch(() => ({}));
      if (!res.ok || !raw?.success) {
        setError(getApiErrorMessage(raw, t("error")));
        return false;
      }
      setError(null);
      onSubmitted?.(rating, comment.trim());
      return true;
    } catch {
      setError(t("error"));
      return false;
    }
  }

  async function handleVote(rating: FeedbackVote) {
    if (disabled || vote || submitting) return;
    setSubmitting(rating);
    setError(null);
    const ok = await postFeedback(rating, "");
    setSubmitting(null);
    if (ok) {
      setVote(rating);
      setSuccess(t("thanks"));
      setReasonOpen(true);
      // Defer focus until the textarea has mounted.
      setTimeout(() => reasonRef.current?.focus(), 60);
    }
  }

  async function handleReasonSubmit() {
    if (!vote || reasonSubmitting || reasonSent) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      // Empty reason → just close the panel; no reason to round-trip again.
      setReasonOpen(false);
      return;
    }
    setReasonSubmitting(true);
    const ok = await postFeedback(vote, trimmed);
    setReasonSubmitting(false);
    if (ok) {
      setReasonSent(true);
      setSuccess(t("reasonThanks"));
      setReasonOpen(false);
    }
  }

  const headlineText = vote ? t("thanks") : t("rateTitle");
  const helperText = vote ? t("rateHintAfterVote") : t("rateHint");

  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        compact ? "" : "rounded-xl border bg-card/60 p-3 sm:p-4",
        className,
      )}
      data-feedback-buttons
    >
      {!compact ? (
        <div className="space-y-0.5">
          <p className="text-sm font-medium leading-snug">{headlineText}</p>
          <p className="text-xs leading-snug text-muted-foreground">{helperText}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size={size}
          variant={vote === "helpful" ? "default" : "outline"}
          aria-pressed={vote === "helpful"}
          aria-label={t("helpfulAria")}
          disabled={disabled || (!!vote && vote !== "helpful") || !!submitting}
          onClick={() => void handleVote("helpful")}
          className="gap-1.5"
        >
          {submitting === "helpful" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <ThumbsUp className="size-4" aria-hidden />
          )}
          <span>{t("helpful")}</span>
        </Button>
        <Button
          type="button"
          size={size}
          variant={vote === "not_helpful" ? "secondary" : "outline"}
          aria-pressed={vote === "not_helpful"}
          aria-label={t("notHelpfulAria")}
          disabled={disabled || (!!vote && vote !== "not_helpful") || !!submitting}
          onClick={() => void handleVote("not_helpful")}
          className="gap-1.5"
        >
          {submitting === "not_helpful" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <ThumbsDown className="size-4" aria-hidden />
          )}
          <span>{t("notHelpful")}</span>
        </Button>

        {vote && !reasonOpen && !reasonSent ? (
          <Button
            type="button"
            size={size}
            variant="ghost"
            onClick={() => {
              setReasonOpen(true);
              setTimeout(() => reasonRef.current?.focus(), 60);
            }}
            className="text-xs text-muted-foreground"
          >
            {t("addReasonCta")}
          </Button>
        ) : null}
      </div>

      {reasonOpen ? (
        <div className="space-y-2 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-200">
          <label
            htmlFor={reasonInputId}
            className="text-xs font-medium text-muted-foreground"
          >
            {vote === "not_helpful" ? t("reasonLabelNeg") : t("reasonLabelPos")}
          </label>
          <textarea
            id={reasonInputId}
            ref={reasonRef}
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 600))}
            placeholder={t("reasonPlaceholder")}
            rows={2}
            maxLength={600}
            className={cn(
              "w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm leading-snug",
              "placeholder:text-muted-foreground/70",
              "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
            )}
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {reason.length}/600
            </span>
            <div className="flex gap-1.5">
              <Button
                type="button"
                size={size}
                variant="ghost"
                onClick={() => setReasonOpen(false)}
                disabled={reasonSubmitting}
                className="gap-1.5"
              >
                <X className="size-4" aria-hidden />
                <span>{t("dismiss")}</span>
              </Button>
              <Button
                type="button"
                size={size}
                onClick={() => void handleReasonSubmit()}
                disabled={reasonSubmitting || !reason.trim()}
                className="gap-1.5"
              >
                {reasonSubmitting ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Send className="size-4" aria-hidden />
                )}
                <span>{t("reasonSend")}</span>
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-xs leading-snug text-destructive">
          {error}
        </p>
      ) : null}
      {!error && success ? (
        <p
          role="status"
          aria-live="polite"
          className="text-xs leading-snug text-muted-foreground"
        >
          {success}
        </p>
      ) : null}
    </div>
  );
}
