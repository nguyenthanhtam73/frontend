"use client";

import { ArrowRight, CalendarCheck, Home, Save, Sparkles, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";

import { CoachWelcomeNextStepCard } from "@/components/onboarding/coach-welcome-payoff";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Link } from "@/i18n/navigation";
import { buildAuthHrefWithNext } from "@/lib/auth/return-path";
import { GUEST_CLAIM_RETURN_PATH } from "@/lib/onboarding/claim-guest-coach-welcome";
import { cn } from "@/lib/utils";

type CoachWelcomeCtaBaseProps = {
  isGuest: boolean;
  /** True when an access token is present (even if guest trial UI is still showing). */
  signedIn?: boolean;
  /** Logged-in but guest trial not claimed yet — show Save instead of auth links. */
  pendingAccountClaim?: boolean;
  saveLoading?: boolean;
  onSaveToAccount?: () => void;
  guestVariant?: "ready" | "fallback";
  className?: string;
};

const primaryBtnClass =
  "min-h-12 w-full gap-2.5 text-base font-bold shadow-lg shadow-primary/25 sm:min-h-14";

/** Guest auth return — claim runs on register/login, then welcome. */
const GUEST_AUTH_NEXT = GUEST_CLAIM_RETURN_PATH;

function SaveToAccountButton({
  className,
  loading,
  onSave,
  size = "lg",
}: {
  className?: string;
  loading?: boolean;
  onSave?: () => void;
  size?: "lg" | "default";
}) {
  const t = useTranslations("coachWelcome");
  return (
    <Button
      type="button"
      size={size}
      className={cn(primaryBtnClass, className)}
      disabled={loading || !onSave}
      onClick={onSave}
      data-testid="coach-welcome-save-to-account"
    >
      <Save className="size-5 shrink-0" aria-hidden />
      {loading ? t("ctaSaveToAccountLoading") : t("ctaSaveToAccount")}
      {!loading ? <ArrowRight className="size-5 shrink-0" aria-hidden /> : null}
    </Button>
  );
}

/** Hero primary CTA — guests go to register; pending claim → save; else check-in. */
export function CoachWelcomePrimaryCta({
  className,
  isGuest = false,
  signedIn = false,
  pendingAccountClaim = false,
  saveLoading = false,
  onSaveToAccount,
}: {
  className?: string;
  isGuest?: boolean;
  signedIn?: boolean;
  pendingAccountClaim?: boolean;
  saveLoading?: boolean;
  onSaveToAccount?: () => void;
}) {
  const t = useTranslations("coachWelcome");

  if (pendingAccountClaim) {
    return (
      <SaveToAccountButton
        className={className}
        loading={saveLoading}
        onSave={onSaveToAccount}
      />
    );
  }

  // Never send an already-signed-in user back to register.
  const showGuestAuth = isGuest && !signedIn;
  const href = showGuestAuth
    ? buildAuthHrefWithNext("/register", GUEST_AUTH_NEXT)
    : "/check-in";

  return (
    <ButtonLink href={href} size="lg" className={cn(primaryBtnClass, className)}>
      {showGuestAuth ? (
        <UserPlus className="size-5 shrink-0" aria-hidden />
      ) : (
        <CalendarCheck className="size-5 shrink-0" aria-hidden />
      )}
      {showGuestAuth ? t("ctaGuestRegisterToCheckIn") : t("ctaCheckInPrimary")}
      <ArrowRight className="size-5 shrink-0" aria-hidden />
    </ButtonLink>
  );
}

/** Primary CTA block — desktop / tablet. Mobile uses sticky bar instead. */
export function CoachWelcomePrimaryCtaBlock({
  className,
  isGuest = false,
  signedIn = false,
  pendingAccountClaim = false,
  saveLoading = false,
  onSaveToAccount,
}: {
  className?: string;
  isGuest?: boolean;
  signedIn?: boolean;
  pendingAccountClaim?: boolean;
  saveLoading?: boolean;
  onSaveToAccount?: () => void;
}) {
  const t = useTranslations("coachWelcome");
  const showGuestAuth = isGuest && !signedIn && !pendingAccountClaim;
  const hint = pendingAccountClaim
    ? t("nextStepHintPendingClaim")
    : showGuestAuth
      ? t("nextStepHintGuest")
      : t("nextStepHint");
  const benefit = pendingAccountClaim
    ? t("nextStepBenefitPendingClaim")
    : showGuestAuth
      ? t("nextStepBenefitGuest")
      : t("nextStepBenefit");

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
        hint={hint}
        benefit={benefit}
      />
      <CoachWelcomePrimaryCta
        isGuest={isGuest}
        signedIn={signedIn}
        pendingAccountClaim={pendingAccountClaim}
        saveLoading={saveLoading}
        onSaveToAccount={onSaveToAccount}
      />
      <p className="text-center text-[11px] leading-snug text-muted-foreground sm:text-xs">
        {pendingAccountClaim
          ? t("ctaSaveToAccountBenefit")
          : showGuestAuth
            ? t("ctaGuestCheckInBenefit")
            : t("ctaCheckInBenefit")}
      </p>
      {showGuestAuth ? (
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

/** Sticky mobile bar — check-in / register / save-to-account. */
export function CoachWelcomeStickyBar({
  className,
  isGuest = false,
  signedIn = false,
  pendingAccountClaim = false,
  saveLoading = false,
  onSaveToAccount,
}: {
  className?: string;
  isGuest?: boolean;
  signedIn?: boolean;
  pendingAccountClaim?: boolean;
  saveLoading?: boolean;
  onSaveToAccount?: () => void;
}) {
  const t = useTranslations("coachWelcome");
  const showGuestAuth = isGuest && !signedIn && !pendingAccountClaim;
  const href = showGuestAuth
    ? buildAuthHrefWithNext("/register", GUEST_AUTH_NEXT)
    : "/check-in";

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-primary/20 bg-background p-4 sm:hidden",
        className,
      )}
      data-testid="coach-welcome-sticky-cta"
    >
      <div className="mx-auto max-w-2xl">
        {pendingAccountClaim ? (
          <SaveToAccountButton
            loading={saveLoading}
            onSave={onSaveToAccount}
          />
        ) : (
          <ButtonLink href={href} size="lg" className={primaryBtnClass}>
            {showGuestAuth ? (
              <UserPlus className="size-5 shrink-0" aria-hidden />
            ) : (
              <CalendarCheck className="size-5 shrink-0" aria-hidden />
            )}
            {showGuestAuth ? t("ctaGuestRegisterToCheckIn") : t("ctaCheckInPrimary")}
            <ArrowRight className="size-5 shrink-0" aria-hidden />
          </ButtonLink>
        )}
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

/** Full CTA block — guest signup / save + secondary links. */
export function CoachWelcomeCta({
  isGuest,
  signedIn = false,
  pendingAccountClaim = false,
  saveLoading = false,
  onSaveToAccount,
  guestVariant = "ready",
  showPrimary = false,
  className,
}: CoachWelcomeCtaBaseProps & { showPrimary?: boolean }) {
  const t = useTranslations("coachWelcome");
  const showGuestAuth = isGuest && !signedIn && !pendingAccountClaim;

  return (
    <div
      className={cn(
        "space-y-4 rounded-2xl border border-border/60 bg-muted p-4 sm:p-5",
        className,
      )}
    >
      {showPrimary ? (
        <CoachWelcomeNextStepCard
          label={t("nextStepLabel")}
          hint={
            pendingAccountClaim
              ? t("nextStepHintPendingClaim")
              : showGuestAuth
                ? t("nextStepHintGuest")
                : t("nextStepHint")
          }
          benefit={
            pendingAccountClaim
              ? t("nextStepBenefitPendingClaim")
              : showGuestAuth
                ? t("nextStepBenefitGuest")
                : t("nextStepBenefit")
          }
        />
      ) : null}

      {showPrimary ? (
        <CoachWelcomePrimaryCta
          isGuest={isGuest}
          signedIn={signedIn}
          pendingAccountClaim={pendingAccountClaim}
          saveLoading={saveLoading}
          onSaveToAccount={onSaveToAccount}
        />
      ) : null}

      {isGuest ? (
        <div className="space-y-2 rounded-xl border border-primary/15 bg-primary/[0.03] px-3.5 py-3">
          <p className="text-sm leading-relaxed text-foreground/90">
            {pendingAccountClaim
              ? t("pendingClaimRoutineCta")
              : showGuestAuth
                ? guestVariant === "ready"
                  ? t("guestRoutineReadyCta")
                  : t("guestRoutineFallbackCta")
                : t("pendingClaimRoutineCta")}
          </p>
          {pendingAccountClaim ? (
            <SaveToAccountButton
              size="default"
              className="min-h-11 shadow-md"
              loading={saveLoading}
              onSave={onSaveToAccount}
            />
          ) : showGuestAuth ? (
            <>
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
            </>
          ) : (
            <ButtonLink
              href="/check-in"
              size="default"
              variant="secondary"
              className="min-h-11 w-full gap-2 font-semibold"
            >
              <CalendarCheck className="size-4 shrink-0" aria-hidden />
              {t("ctaCheckInPrimary")}
            </ButtonLink>
          )}
        </div>
      ) : null}

      <CoachWelcomeSecondaryLinks />
    </div>
  );
}
