"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useMemo, useState, useTransition } from "react";

import { CheckoutPlanSummary } from "@/components/pricing/checkout-plan-summary";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Link, useRouter } from "@/i18n/navigation";
import { apiBaseUrl } from "@/lib/api";
import { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-envelope";
import { setAuthTokens } from "@/lib/auth-token";
import { readAuthReturnPathFromSearch } from "@/lib/auth/return-path";
import {
  claimGuestCoachWelcomeIfNeeded,
  GUEST_CLAIM_RETURN_PATH,
  isClaimableGuestCoachSession,
  isGuestRoutineSaveReturn,
} from "@/lib/onboarding/claim-guest-coach-welcome";
import { readClaimableGuestSession } from "@/lib/onboarding/coach-welcome-session";
import { resolveAuthReturnDestination } from "@/lib/onboarding/post-auth-destination";
import {
  buildAuthHref,
  buildPricingCheckoutHref,
} from "@/lib/premium/checkout-intent";
import { useCheckoutIntent } from "@/lib/premium/use-checkout-intent";
import { useAuthStore, type AuthUser } from "@/lib/stores/auth-store";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageFallback() {
  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-8 sm:py-16">
      <div className="mx-auto h-8 w-40 animate-pulse rounded-md bg-muted" />
      <div className="h-56 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

function LoginPageInner() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkoutIntent = useCheckoutIntent(searchParams);
  const returnPath = useMemo(
    () => readAuthReturnPathFromSearch(searchParams),
    [searchParams],
  );
  const [, startTransition] = useTransition();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    router.prefetch(checkoutIntent ? "/pricing" : returnPath || "/onboarding");
    if (!checkoutIntent) router.prefetch(returnPath || "/check-in");
  }, [router, checkoutIntent, returnPath]);

  const registerHref = buildAuthHref("/register", {
    intent: checkoutIntent,
    next: returnPath,
  });
  const loginSub = checkoutIntent
    ? t("loginSubUpgrade")
    : isGuestRoutineSaveReturn(returnPath)
      ? t("loginSubSaveRoutine")
      : t("loginSub");

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-8 sm:py-16">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{t("loginTitle")}</h1>
        <p className="text-sm text-muted-foreground">{loginSub}</p>
      </div>
      {checkoutIntent ? <CheckoutPlanSummary intent={checkoutIntent} /> : null}
      <Card>
        <CardContent className="space-y-4 p-6">
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setErr(null);
              setLoading(true);
              try {
                const res = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email, password }),
                });
                const json = (await res.json().catch(() => ({}))) as ApiEnvelope<{
                  tokens?: { access_token?: string; refresh_token?: string };
                  user?: AuthUser;
                }>;
                const token = json.data?.tokens?.access_token;
                const refresh = json.data?.tokens?.refresh_token;
                if (!res.ok || !token) {
                  setErr(getApiErrorMessage(json, t("errorGeneric")));
                  setLoading(false);
                  return;
                }
                setAuthTokens(token, refresh);
                if (json.data?.user) {
                  useAuthStore.setState({ user: json.data.user, loading: false });
                } else {
                  void useAuthStore.getState().refresh();
                }
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
                if (hadClaimableGuest && !claimed) {
                  toast.error(t("claimGuestFailed"));
                }
                const nextPath = checkoutIntent
                  ? buildPricingCheckoutHref(checkoutIntent)
                  : claimed || hadClaimableGuest
                    ? GUEST_CLAIM_RETURN_PATH
                    : resolveAuthReturnDestination(json.data?.user, returnPath);
                // Keep loading until navigation replaces this screen — avoids an
                // idle login form while Next.js still loads the next route.
                startTransition(() => {
                  router.push(nextPath);
                });
              } catch {
                setErr(t("networkError"));
                setLoading(false);
              }
            }}
          >
            {/*
              `<fieldset disabled>` disables every nested input + button while the
              request is in flight — prevents accidental double submits and
              accidental edits mid-request.
            */}
            <fieldset disabled={loading} className="space-y-4 disabled:opacity-70">
              <Field label={t("email")} htmlFor="login-email">
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base outline-none ring-ring/40 focus:ring-2 sm:h-9 sm:text-sm"
                />
              </Field>
              <Field label={t("password")} htmlFor="login-password">
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base outline-none ring-ring/40 focus:ring-2 sm:h-9 sm:text-sm"
                />
              </Field>
              {err && (
                <p role="alert" className="text-sm text-destructive">
                  {err}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t("submitting") : t("loginCta")}
              </Button>
            </fieldset>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            {t("noAccount")}{" "}
            <Link
              href={registerHref}
              className="font-medium text-primary underline underline-offset-4"
            >
              {t("registerLink")}
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
      <label
        htmlFor={htmlFor}
        className="text-xs font-medium text-muted-foreground"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
