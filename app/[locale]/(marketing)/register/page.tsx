"use client";

import type { TurnstileInstance } from "@marsidev/react-turnstile";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { LegalInlineLinks } from "@/components/legal/legal-links";
import { CheckoutPlanSummary } from "@/components/pricing/checkout-plan-summary";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Link, useRouter } from "@/i18n/navigation";
import { apiBaseUrl } from "@/lib/api";
import { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-envelope";
import { getAccessToken, setAuthTokens } from "@/lib/auth-token";
import {
  buildAuthHref,
  buildPricingCheckoutHref,
} from "@/lib/premium/checkout-intent";
import { useCheckoutIntent } from "@/lib/premium/use-checkout-intent";
import { readAuthReturnPathFromSearch } from "@/lib/auth/return-path";
import { FUNNEL_EVENTS, trackFunnelEvent } from "@/lib/analytics/funnel";
import {
  claimLocalGuestCheckInIfNeeded,
  isGuestCheckInClaimFailure,
  isGuestCheckInPhotosMissing,
} from "@/lib/check-in/claim-guest-check-in";
import { hasPersistedGuestCheckIn } from "@/lib/check-in/guest-check-in-persist";
import {
  claimGuestCoachWelcomeIfNeeded,
  isClaimableGuestCoachSession,
  isGuestRoutineSaveReturn,
} from "@/lib/onboarding/claim-guest-coach-welcome";
import { readClaimableGuestSession } from "@/lib/onboarding/coach-welcome-session";
import { trackMetaEvent } from "@/lib/meta-pixel";
import { markAwaitingFirstCheckIn } from "@/lib/activation/first-check-in";
import { postRegisterDestination } from "@/lib/onboarding/post-auth-destination";
import { useAuthStore, type AuthUser } from "@/lib/stores/auth-store";

const turnstileSiteKey = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY?.trim() ?? "";
const captchaEnabled = turnstileSiteKey.length > 0;

const TurnstileWidget = dynamic(
  () => import("@marsidev/react-turnstile").then((m) => m.Turnstile),
  { ssr: false },
);

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterPageFallback />}>
      <RegisterPageInner />
    </Suspense>
  );
}

function RegisterPageFallback() {
  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-8 sm:py-16">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted mx-auto" />
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

function RegisterPageInner() {
  const t = useTranslations("auth");
  const tPricing = useTranslations("pricing");
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkoutIntent = useCheckoutIntent(searchParams);
  const returnPath = useMemo(
    () => readAuthReturnPathFromSearch(searchParams),
    [searchParams],
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnRef = useRef<TurnstileInstance | undefined>(undefined);
  const toast = useToast();
  const [, startTransition] = useTransition();

  // Already logged in + came from pricing upgrade → go straight to checkout handoff.
  useEffect(() => {
    if (!checkoutIntent || !getAccessToken()) return;
    router.replace(buildPricingCheckoutHref(checkoutIntent));
  }, [checkoutIntent, router]);

  const invalidateCaptcha = useCallback(() => {
    setTurnstileToken(null);
    turnRef.current?.reset();
  }, []);

  const onTurnstileSuccess = useCallback((token: string) => {
    setTurnstileToken(token);
    setErr(null);
  }, []);

  const submitBlocked = captchaEnabled && !turnstileToken;
  const loginHref = buildAuthHref("/login", {
    intent: checkoutIntent,
    next: returnPath,
  });
  const [hasGuestSession, setHasGuestSession] = useState(false);
  useEffect(() => {
    setHasGuestSession(isClaimableGuestCoachSession(readClaimableGuestSession()));
  }, []);
  const savingGuestRoutine =
    !checkoutIntent &&
    (isGuestRoutineSaveReturn(returnPath) || hasGuestSession);

  const title = checkoutIntent
    ? t("registerTitleUpgrade")
    : savingGuestRoutine
      ? t("registerTitleSaveRoutine")
      : t("registerTitle");
  const subtitle = checkoutIntent
    ? t("registerSubUpgrade")
    : savingGuestRoutine
      ? t("registerSubSaveRoutine")
      : t("registerSub");
  const ctaLabel = checkoutIntent
    ? t("registerCtaUpgrade")
    : savingGuestRoutine
      ? t("registerCtaSaveRoutine")
      : t("registerCta");

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-8 sm:py-16">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {checkoutIntent ? (
        <CheckoutPlanSummary
          intent={checkoutIntent}
          footnote={tPricing("summary.afterRegister")}
        />
      ) : null}
      <Card>
        <CardContent className="space-y-4 p-6">
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setErr(null);
              if (submitBlocked) {
                setErr(t("captchaRequired"));
                return;
              }
              setLoading(true);
              try {
                const body: Record<string, unknown> = {
                  email,
                  password,
                  display_name: displayName.trim() || undefined,
                };
                if (captchaEnabled && turnstileToken) {
                  body.turnstile_token = turnstileToken;
                }
                const res = await fetch(`${apiBaseUrl}/api/v1/auth/register`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(body),
                });
                const json = (await res.json().catch(() => ({}))) as ApiEnvelope<{
                  tokens?: { access_token?: string; refresh_token?: string };
                  user?: AuthUser;
                }>;
                const token = json.data?.tokens?.access_token;
                const refresh = json.data?.tokens?.refresh_token;
                if (!res.ok || !token) {
                  invalidateCaptcha();
                  const code = json.error?.code?.trim();
                  if (code === "captcha_required") {
                    setErr(t("captchaRequired"));
                  } else if (code === "captcha_failed") {
                    setErr(t("captchaFailed"));
                  } else if (code === "captcha_unavailable") {
                    setErr(t("captchaUnavailable"));
                  } else {
                    setErr(getApiErrorMessage(json, t("errorGeneric")));
                  }
                  setLoading(false);
                  return;
                }
                setAuthTokens(token, refresh);
                if (json.data?.user) {
                  useAuthStore.setState({ user: json.data.user, loading: false });
                } else {
                  void useAuthStore.getState().refresh();
                }
                trackMetaEvent("CompleteRegistration", { status: true });
                let claimed = false;
                const alreadyDone =
                  json.data?.user?.onboarding_completed === true;
                const hadClaimableGuest =
                  !alreadyDone &&
                  isClaimableGuestCoachSession(readClaimableGuestSession());
                try {
                  const claim = await claimGuestCoachWelcomeIfNeeded(token, {
                    alreadyCompleted: alreadyDone,
                    onPhotosAttachFailed: () =>
                      toast.warning(t("claimGuestPhotosFailed")),
                  });
                  claimed = Boolean(claim);
                } catch {
                  claimed = false;
                }
                const hadGuestCheckIn = hasPersistedGuestCheckIn();
                let claimedCheckIn = false;
                try {
                  const checkInClaim = await claimLocalGuestCheckInIfNeeded(token);
                  claimedCheckIn = checkInClaim.ok;
                  if (isGuestCheckInClaimFailure(checkInClaim)) {
                    toast.error(
                      isGuestCheckInPhotosMissing(checkInClaim.reason)
                        ? t("claimGuestCheckInPhotosMissing")
                        : t("claimGuestCheckInFailed"),
                    );
                  }
                } catch {
                  claimedCheckIn = false;
                  toast.error(t("claimGuestCheckInFailed"));
                }
                // `claimed` stays routine-only — check-in uses had_guest_checkin / claimed_checkin.
                trackFunnelEvent(FUNNEL_EVENTS.registerSuccess, {
                  claimed,
                  had_guest_routine: hadClaimableGuest,
                  had_guest_checkin: hadGuestCheckIn,
                  claimed_checkin: claimedCheckIn,
                });
                if (hadClaimableGuest && !claimed) {
                  toast.error(t("claimGuestFailed"));
                }
                if (!claimedCheckIn) {
                  markAwaitingFirstCheckIn(json.data?.user?.id);
                }
                const nextPath = checkoutIntent
                  ? buildPricingCheckoutHref(checkoutIntent)
                  : postRegisterDestination({
                      claimed,
                      hadClaimableGuest,
                      claimedCheckIn,
                      user: json.data?.user,
                      returnPath,
                    });
                // Keep loading until navigation replaces this screen.
                startTransition(() => {
                  router.push(nextPath);
                });
              } catch {
                invalidateCaptcha();
                setErr(t("networkError"));
                setLoading(false);
              }
            }}
          >
            <fieldset disabled={loading} className="space-y-4 disabled:opacity-70">
              <Field label={t("email")} htmlFor="register-email">
                <input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base outline-none ring-ring/40 focus:ring-2 sm:h-9 sm:text-sm"
                />
              </Field>
              <Field label={t("displayNameOptional")} htmlFor="register-display-name">
                <input
                  id="register-display-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base outline-none ring-ring/40 focus:ring-2 sm:h-9 sm:text-sm"
                />
              </Field>
              <Field label={t("password")} htmlFor="register-password">
                <input
                  id="register-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base outline-none ring-ring/40 focus:ring-2 sm:h-9 sm:text-sm"
                />
              </Field>
              {captchaEnabled ? (
                <div className="flex flex-col items-center gap-2 pt-1">
                  <p className="text-center text-xs text-muted-foreground">{t("captchaHint")}</p>
                  <TurnstileWidget
                    ref={turnRef}
                    siteKey={turnstileSiteKey}
                    onSuccess={onTurnstileSuccess}
                    onExpire={invalidateCaptcha}
                    onError={invalidateCaptcha}
                    options={{
                      theme: "auto",
                      size: "normal",
                    }}
                  />
                </div>
              ) : null}
              {err && (
                <p role="alert" className="text-sm text-destructive">
                  {err}
                </p>
              )}
              <p
                data-testid="register-legal-consent"
                className="text-center text-xs leading-relaxed text-muted-foreground"
              >
                {t("legalConsent")} <LegalInlineLinks />
              </p>
              <Button type="submit" className="w-full" disabled={loading || submitBlocked}>
                {loading ? t("submitting") : ctaLabel}
              </Button>
            </fieldset>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            {t("haveAccount")}{" "}
            <Link
              href={loginHref}
              className="font-medium text-primary underline underline-offset-4"
            >
              {t("loginLink")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
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
