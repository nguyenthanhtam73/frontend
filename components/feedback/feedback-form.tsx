"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button-link";
import { useToast } from "@/hooks/use-toast";
import { submitFeedback } from "@/lib/api/feedback";
import { getAccessToken } from "@/lib/auth-token";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { FeedbackType } from "@/lib/types/feedback";
import { FEEDBACK_TYPES } from "@/lib/types/feedback";

const inputClass =
  "w-full min-h-11 rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

const textareaClass =
  "w-full min-h-[8rem] resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

const MIN_COMMENT = 5;

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

  if (!hasAuth) {
    return (
      <Card className={className}>
        <CardContent className="space-y-3 p-5 sm:p-6">
          <p className="text-sm text-muted-foreground">{t("needAuth")}</p>
          <ButtonLink href="/login" size="sm">
            {t("signIn")}
          </ButtonLink>
        </CardContent>
      </Card>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = comment.trim();
    if (trimmed.length < MIN_COMMENT) {
      setError(t("commentTooShort"));
      return;
    }
    setSubmitting(true);
    try {
      await submitFeedback({ type, comment: trimmed });
      setComment("");
      setType("general");
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

  return (
    <Card className={className}>
      <CardContent className="space-y-4 p-5 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <fieldset disabled={submitting} className="space-y-4 disabled:opacity-70">
            <Field label={t("typeLabel")} htmlFor="feedback-type">
              <select
                id="feedback-type"
                value={type}
                onChange={(e) => setType(e.target.value as FeedbackType)}
                className={inputClass}
              >
                {FEEDBACK_TYPES.map((key) => (
                  <option key={key} value={key}>
                    {t(`types.${key}`)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={t("commentLabel")} htmlFor="feedback-comment">
              <textarea
                id="feedback-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t("commentPlaceholder")}
                className={textareaClass}
                required
                maxLength={2000}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "feedback-error" : "feedback-privacy"}
              />
            </Field>

            {error ? (
              <p id="feedback-error" role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : (
              <p id="feedback-privacy" className="text-xs leading-relaxed text-muted-foreground">
                {t("privacy")}
              </p>
            )}

            <Button type="submit" className="w-full sm:w-auto" disabled={submitting}>
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
