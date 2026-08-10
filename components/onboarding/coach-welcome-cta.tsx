"use client";

import { ArrowRight, CalendarCheck, Home, Sparkles, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";

import { CoachWelcomeNextStepCard } from "@/components/onboarding/coach-welcome-payoff";
import { ButtonLink } from "@/components/ui/button-link";
import { Link } from "@/i18n/navigation";
import { buildAuthHrefWithNext } from "@/lib/auth/return-path";
import { GUEST_CLAIM_RETURN_PATH } from "@/lib/onboarding/claim-guest-coach-welcome";
import { cn } from "@/lib/utils";

type CoachWelcomeCtaBaseProps = {
  isGuest: boolean;
  guestVariant?: "ready" | "fallback";
  className?: string;
};

const primaryBtnClass =
  "min-h-12 w-full gap-2.5 text-base font-bold shadow-lg shadow-primary/25 sm:min-h-14";

/** Guest auth return — claim runs on register/login, then welcome. */
const GUEST_AUTH_NEXT = GUEST_CLAIM_RETURN_PATH;

/** Hero primary CTA — guests go to register (claim trial → coach-welcome). */
export function CoachWelcomePrimaryCta({
  className,
  isGuest = false,
}: {
  className?: string;
  isGuest?: boolean;
}) {
  const t = useTranslations("coachWelcome");
  const href = isGuest
    ? buildAuthHrefWithNext("/register", GUEST_AUTH_NEXT)
    : "/check-in";

  return (
    <ButtonLink href={href} size="lg" className={cn(primaryBtnClass, className)}>
      {isGuest ? (
        <UserPlus className="size-5 shrink-0" aria-hidden />
      ) : (
        <CalendarCheck className="size-5 shrink-0" aria-hidden />
      )}
      {isGuest ? t("ctaGuestRegisterToCheckIn") : t("ctaCheckInPrimary")}
      <ArrowRight className="size-5 shrink-0" aria-hidden />
    </ButtonLink>
  );
}

/** Primary CTA block — desktop / tablet. Mobile uses sticky bar instead. */
export function CoachWelcomePrimaryCtaBlock({
  className,
  isGuest = false,
}: {
  className?: string;
  isGuest?: boolean;
}) {
  const t = useTranslations("coachWelcome");

  return (
    <div
      className={cn(
        "hidden space-y-3 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/[0.09] via-primary/[0.04] to-emerald-500/[0.05] p-4 shadow-sm sm:block sm:p-5",
        className,
      )}
      data-testid="coach-welcome-primary-cta-block"
    >
      <CoachWelcomeNextStepCard
        label={t("nextStepLabel")}
        hint={isGuest ? t("nextStepHintGuest") : t("nextStepHint")}
        benefit={isGuest ? t("nextStepBenefitGuest") : t("nextStepBenefit")}
      />
      <CoachWelcomePrimaryCta isGuest={isGuest} />
      <p className="text-center text-[11px] leading-snug text-muted-foreground sm:text-xs">
        {isGuest ? t("ctaGuestCheckInBenefit") : t("ctaCheckInBenefit")}
      </p>
      {isGuest ? (
        <Link
          href={buildAuthHrefWithNext("/login", GUEST_AUTH_NEXT)}
          className="block text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          data-testid="coach-welcome-guest-login-link"
        >
          {t("guestSignInExistingCta")}
        </Link>
      ) : null}
    </div>
  );
}

/** Sticky mobile bar — check-in (auth) or register→check-in (guest). */
export function CoachWelcomeStickyBar({
  className,
  isGuest = false,
}: {
  className?: string;
  isGuest?: boolean;
}) {
  const t = useTranslations("coachWelcome");
  const href = isGuest
    ? buildAuthHrefWithNext("/register", GUEST_AUTH_NEXT)
    : "/check-in";

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-primary/20 bg-background/95 p-3 backdrop-blur-md sm:hidden",
        className,
      )}
      data-testid="coach-welcome-sticky-cta"
    >
      <div className="mx-auto max-w-2xl">
        <ButtonLink href={href} size="lg" className={primaryBtnClass}>
          {isGuest ? (
            <UserPlus className="size-5 shrink-0" aria-hidden />
          ) : (
            <CalendarCheck className="size-5 shrink-0" aria-hidden />
          )}
          {isGuest ? t("ctaGuestRegisterToCheckIn") : t("ctaCheckInPrimary")}
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
          hint={isGuest ? t("nextStepHintGuest") : t("nextStepHint")}
          benefit={isGuest ? t("nextStepBenefitGuest") : t("nextStepBenefit")}
        />
      ) : null}

      {showPrimary ? <CoachWelcomePrimaryCta isGuest={isGuest} /> : null}

      {isGuest ? (
        <div className="space-y-2 rounded-xl border border-primary/15 bg-primary/[0.03] px-3.5 py-3">
          <p className="text-sm leading-relaxed text-foreground/90">
            {guestVariant === "ready" ? t("guestRoutineReadyCta") : t("guestRoutineFallbackCta")}
          </p>
          <ButtonLink
            href={buildAuthHrefWithNext("/register", GUEST_AUTH_NEXT)}
            size="default"
            variant="secondary"
            className="min-h-11 w-full gap-2 font-semibold"
          >
            <UserPlus className="size-4 shrink-0" aria-hidden />
            {t("guestSaveRoutineCta")}
          </ButtonLink>
          <Link
            href={buildAuthHrefWithNext("/login", GUEST_AUTH_NEXT)}
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
