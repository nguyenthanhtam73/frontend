"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button-link";
import { useToast } from "@/hooks/use-toast";
import { Link } from "@/i18n/navigation";
import { submitFeedback } from "@/lib/api/feedback";
import { getAccessToken } from "@/lib/auth-token";
import { useAuthStore } from "@/lib/stores/auth-store";
import { cn } from "@/lib/utils";
import type { FeedbackType } from "@/lib/types/feedback";

import { FeedbackTypeSelect } from "./feedback-type-select";

const MIN_COMMENT = 5;
const MAX_COMMENT = 2000;

const textareaClass =
  "w-full min-h-[8rem] resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

type FeedbackFormProps = {
  className?: string;
};

export function FeedbackForm({ className }: FeedbackFormProps) {
  const t = useTranslations("appFeedback");
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const hasAuth = !!user || !!getAccessToken();

  const [type, setType] = useState<FeedbackType>("general");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!hasAuth) {
    return (
      <Card className={cn("border-primary/10 bg-gradient-to-br from-primary/5 via-background to-background", className)}>
        <CardContent className="space-y-5 p-6 sm:p-8">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold tracking-tight">{t("guestTitle")}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{t("guestBody")}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonLink href="/login" className="min-h-12 w-full sm:w-auto">
              {t("signIn")}
            </ButtonLink>
            <p className="text-center text-sm text-muted-foreground sm:text-left">
              {t("registerPrompt")}{" "}
              <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
                {t("registerLink")}
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (submitted) {
    return (
      <Card
        role="status"
        className={cn(
          "border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background",
          className,
        )}
      >
        <CardContent className="flex flex-col items-center gap-5 p-6 text-center sm:flex-row sm:p-8 sm:text-left">
          <div className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <CheckCircle2 className="size-7" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-lg font-semibold tracking-tight">{t("successTitle")}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{t("successBody")}</p>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto">
            <Button
              type="button"
              variant="outline"
              className="min-h-12 w-full sm:w-auto"
              onClick={() => {
                setSubmitted(false);
                setComment("");
                setType("general");
                setError(null);
              }}
            >
              {t("sendAnother")}
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <ButtonLink href="/" variant="ghost" className="min-h-11 w-full sm:w-auto">
                {t("backHome")}
              </ButtonLink>
              <ButtonLink href="/check-in" className="min-h-11 w-full sm:w-auto">
                {t("backDashboard")}
              </ButtonLink>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setError(null);
    const trimmed = comment.trim();
    if (trimmed.length < MIN_COMMENT) {
      setError(t("commentTooShort"));
      return;
    }

    setSubmitting(true);
    try {
      await submitFeedback({ type, comment: trimmed });
      setSubmitted(true);
      toast.success(t("success"));
    } catch (err) {
      if (err instanceof Error && err.message === "auth") {
        setError(t("needAuth"));
        return;
      }
      toast.error(t("error"));
    } finally {
      setSubmitting(false);
    }
  }

  const hintId = "feedback-type-hint";
  const counterId = "feedback-char-count";

  return (
    <Card className={className}>
      <CardContent className="space-y-4 p-5 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <fieldset disabled={submitting} className="space-y-4 disabled:opacity-70">
            <Field label={t("typeLabel")} htmlFor="feedback-type">
              <FeedbackTypeSelect
                id="feedback-type"
                value={type}
                onChange={setType}
                label={(key) => t(`types.${key}`)}
                ariaLabel={t("typeLabel")}
                describedBy={hintId}
                disabled={submitting}
              />
            </Field>

            <Field label={t("commentLabel")} htmlFor="feedback-comment">
              <textarea
                id="feedback-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t("commentPlaceholder")}
                className={textareaClass}
                required
                maxLength={MAX_COMMENT}
                aria-invalid={error ? true : undefined}
                aria-describedby={
                  error ? "feedback-error" : `${hintId} ${counterId} feedback-privacy`
                }
              />
            </Field>

            <p id={hintId} className="text-xs leading-relaxed text-primary/80">
              {t(`hints.${type}`)}
            </p>

            <div className="flex items-center justify-between gap-3">
              {error ? (
                <p id="feedback-error" role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : (
                <p id="feedback-privacy" className="text-xs leading-relaxed text-muted-foreground">
                  {t("privacy")}
                </p>
              )}
              <p
                id={counterId}
                className={cn(
                  "shrink-0 text-xs tabular-nums text-muted-foreground",
                  comment.length >= MAX_COMMENT && "text-destructive",
                )}
                aria-live="polite"
              >
                {t("charCounter", { count: comment.length, max: MAX_COMMENT })}
              </p>
            </div>

            <Button type="submit" className="min-h-12 h-12 w-full sm:w-auto" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {t("submitting")}
                </>
              ) : (
                t("submit")
              )}
            </Button>
          </fieldset>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
