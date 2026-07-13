"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { betaSignupErrorKey, submitBetaSignup } from "@/lib/api/beta-signup";
import { cn } from "@/lib/utils";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputClassName =
  "flex min-h-12 h-12 w-full min-w-0 rounded-xl border border-input bg-background px-4 text-base outline-none ring-ring/40 transition-shadow placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:min-h-11 sm:h-11 sm:text-sm";

export function BetaSignupForm({ className }: { className?: string }) {
  const t = useTranslations("betaSignup");
  const { success } = useToast();
  const formId = useId();
  const emailId = `${formId}-email`;

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const validate = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return t("requiredEmail");
      if (!EMAIL_PATTERN.test(trimmed)) return t("invalidEmail");
      return null;
    },
    [t],
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    const validationError = validate(email);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await submitBetaSignup({ email: email.trim() });
      setSubmitted(true);
      setEmail("");
      success({
        title: t("successTitle"),
        description: t("successBody"),
      });
    } catch (err) {
      const key = betaSignupErrorKey(err);
      setError(t(key));
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div
        role="status"
        className={cn(
          "flex flex-col items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-8 text-center sm:flex-row sm:text-left",
          className,
        )}
      >
        <div className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <CheckCircle2 className="size-6" aria-hidden />
        </div>
        <div className="space-y-1">
          <p className="text-base font-semibold tracking-tight">{t("successTitle")}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{t("successBody")}</p>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={cn("space-y-3", className)}
      aria-labelledby={`${formId}-label`}
    >
      <p id={`${formId}-label`} className="sr-only">
        {t("formAria")}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1 space-y-1.5">
          <label htmlFor={emailId} className="text-xs font-medium text-muted-foreground">
            {t("emailLabel")}
          </label>
          <input
            id={emailId}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            placeholder={t("emailPlaceholder")}
            disabled={submitting}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${emailId}-error` : `${emailId}-privacy`}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(validate(e.target.value));
            }}
            className={cn(
              inputClassName,
              error && "border-destructive/60 focus-visible:border-destructive focus-visible:ring-destructive/25",
            )}
          />
        </div>
        <Button
          type="submit"
          disabled={submitting}
          className="min-h-12 h-12 w-full shrink-0 px-6 text-base shadow-md shadow-primary/15 sm:mt-[1.375rem] sm:w-auto"
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {t("submitting")}
            </>
          ) : (
            t("submit")
          )}
        </Button>
      </div>

      {error ? (
        <p id={`${emailId}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        <p id={`${emailId}-privacy`} className="text-xs leading-relaxed text-muted-foreground">
          {t("privacy")}
        </p>
      )}
    </form>
  );
}
