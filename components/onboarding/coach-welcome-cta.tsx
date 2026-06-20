"use client";

import { ArrowRight, Home, Sparkles, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";

import { ButtonLink } from "@/components/ui/button-link";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type CoachWelcomeCtaProps = {
  isGuest: boolean;
  /** Guest routine still generating or on fallback scaffold. */
  guestVariant?: "ready" | "fallback";
  className?: string;
};

export function CoachWelcomeCta({
  isGuest,
  guestVariant = "ready",
  className,
}: CoachWelcomeCtaProps) {
  const t = useTranslations("coachWelcome");

  return (
    <div
      className={cn(
        "space-y-4 rounded-2xl border border-primary/15 bg-gradient-to-b from-primary/[0.06] to-background p-4 shadow-sm sm:p-5",
        className,
      )}
    >
      <div className="space-y-1 text-center sm:text-left">
        <p className="text-sm font-medium text-foreground">{t("ctaBlockTitle")}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{t("ctaBlockSub")}</p>
      </div>

      <ButtonLink
        href="/check-in"
        size="lg"
        className="min-h-14 w-full gap-2 text-base font-semibold shadow-md"
      >
        {t("ctaCheckInPrimary")}
        <ArrowRight className="size-5 shrink-0" aria-hidden />
      </ButtonLink>

      {isGuest ? (
        <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/[0.04] px-3.5 py-3.5">
          <p className="text-sm leading-relaxed text-foreground/90">
            {guestVariant === "ready" ? t("guestRoutineReadyCta") : t("guestRoutineFallbackCta")}
          </p>
          <ButtonLink
            href="/register"
            size="lg"
            variant="secondary"
            className="min-h-12 w-full gap-2 font-semibold"
          >
            <UserPlus className="size-4 shrink-0" aria-hidden />
            {t("guestSaveRoutineCta")}
          </ButtonLink>
          <Link
            href="/login"
            className="block text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {t("guestSignInExistingCta")}
          </Link>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Link
          href="/onboarding"
          className={cn(
            "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium",
            "transition-colors hover:bg-muted/60 active:scale-[0.99]",
          )}
        >
          <Sparkles className="size-4 shrink-0 text-primary" aria-hidden />
          {t("ctaReviewSkin")}
        </Link>
        <Link
          href="/"
          className={cn(
            "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium text-muted-foreground",
            "transition-colors hover:bg-muted/50 hover:text-foreground active:scale-[0.99]",
          )}
        >
          <Home className="size-4 shrink-0" aria-hidden />
          {t("ctaHome")}
        </Link>
      </div>
    </div>
  );
}
