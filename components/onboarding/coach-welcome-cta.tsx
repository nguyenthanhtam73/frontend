"use client";

import { ArrowRight, CalendarCheck, Home, Sparkles, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";

import { CoachWelcomeNextStepCard } from "@/components/onboarding/coach-welcome-payoff";
import { ButtonLink } from "@/components/ui/button-link";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type CoachWelcomeCtaBaseProps = {
  isGuest: boolean;
  guestVariant?: "ready" | "fallback";
  className?: string;
};

const primaryBtnClass =
  "min-h-12 w-full gap-2.5 text-base font-bold shadow-lg shadow-primary/25 sm:min-h-14";

/** Hero primary CTA — benefit-oriented, high visibility. */
export function CoachWelcomePrimaryCta({ className }: { className?: string }) {
  const t = useTranslations("coachWelcome");

  return (
    <ButtonLink href="/check-in" size="lg" className={cn(primaryBtnClass, className)}>
      <CalendarCheck className="size-5 shrink-0" aria-hidden />
      {t("ctaCheckInPrimary")}
      <ArrowRight className="size-5 shrink-0" aria-hidden />
    </ButtonLink>
  );
}

/** Primary CTA block — next step hint + button. */
export function CoachWelcomePrimaryCtaBlock({ className }: { className?: string }) {
  const t = useTranslations("coachWelcome");

  return (
    <div
      className={cn(
        "space-y-3 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/[0.09] via-primary/[0.04] to-emerald-500/[0.05] p-4 shadow-sm sm:p-5",
        className,
      )}
    >
      <CoachWelcomeNextStepCard
        label={t("nextStepLabel")}
        hint={t("nextStepHint")}
        benefit={t("nextStepBenefit")}
      />
      <CoachWelcomePrimaryCta />
      <p className="text-center text-[11px] leading-snug text-muted-foreground sm:text-xs">
        {t("ctaCheckInBenefit")}
      </p>
    </div>
  );
}

/** Sticky mobile bar — keeps check-in visible while scrolling. */
export function CoachWelcomeStickyBar({ className }: { className?: string }) {
  const t = useTranslations("coachWelcome");

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-primary/20 bg-background/95 p-3 backdrop-blur-md sm:hidden",
        className,
      )}
      aria-hidden={false}
    >
      <div className="mx-auto max-w-2xl space-y-1">
        <p className="text-center text-[10px] font-medium leading-snug text-muted-foreground">
          {t("nextStepHint")}
        </p>
        <ButtonLink href="/check-in" size="lg" className={primaryBtnClass}>
          <CalendarCheck className="size-5 shrink-0" aria-hidden />
          {t("ctaCheckInPrimary")}
          <ArrowRight className="size-5 shrink-0" aria-hidden />
        </ButtonLink>
      </div>
    </div>
  );
}

/** Secondary links — review profile & home. */
export function CoachWelcomeSecondaryLinks({ className }: { className?: string }) {
  const t = useTranslations("coachWelcome");

  return (
    <div className={cn("flex flex-col items-center gap-2 sm:flex-row sm:justify-center", className)}>
      <Link
        href="/onboarding"
        className="inline-flex min-h-10 items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        <Sparkles className="size-3.5 shrink-0 text-primary/80" aria-hidden />
        {t("ctaReviewSkin")}
      </Link>
      <span className="hidden text-muted-foreground/40 sm:inline" aria-hidden>
        ·
      </span>
      <Link
        href="/"
        className="inline-flex min-h-10 items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        <Home className="size-3.5 shrink-0" aria-hidden />
        {t("ctaHome")}
      </Link>
    </div>
  );
}

/** Full CTA block — guest signup + secondary links (primary shown separately above). */
export function CoachWelcomeCta({
  isGuest,
  guestVariant = "ready",
  showPrimary = false,
  className,
}: CoachWelcomeCtaBaseProps & { showPrimary?: boolean }) {
  const t = useTranslations("coachWelcome");

  return (
    <div
      className={cn(
        "space-y-4 rounded-2xl border border-border/60 bg-muted/20 p-4 sm:p-5",
        className,
      )}
    >
      {showPrimary ? (
        <CoachWelcomeNextStepCard
          label={t("nextStepLabel")}
          hint={t("nextStepHint")}
          benefit={t("nextStepBenefit")}
        />
      ) : null}

      {showPrimary ? <CoachWelcomePrimaryCta /> : null}

      {isGuest ? (
        <div className="space-y-2 rounded-xl border border-primary/15 bg-primary/[0.03] px-3.5 py-3">
          <p className="text-sm leading-relaxed text-foreground/90">
            {guestVariant === "ready" ? t("guestRoutineReadyCta") : t("guestRoutineFallbackCta")}
          </p>
          <ButtonLink
            href="/register"
            size="default"
            variant="secondary"
            className="min-h-11 w-full gap-2 font-semibold"
          >
            <UserPlus className="size-4 shrink-0" aria-hidden />
            {t("guestSaveRoutineCta")}
          </ButtonLink>
          <Link
            href="/login"
            className="block text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {t("guestSignInExistingCta")}
          </Link>
        </div>
      ) : null}

      <CoachWelcomeSecondaryLinks />
    </div>
  );
}
