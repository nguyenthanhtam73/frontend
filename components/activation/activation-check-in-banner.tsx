"use client";

import { CalendarCheck, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import {
  dismissActivationBanner,
  hasNeverCheckedIn,
  isActivationBannerDismissed,
  shouldShowActivationBanner,
} from "@/lib/activation/first-check-in";
import { FUNNEL_EVENTS, trackFunnelEvent } from "@/lib/analytics/funnel";
import { getAccessToken } from "@/lib/auth-token";
import { useStreak } from "@/lib/hooks/use-streak";
import { isOnboardingFunnelPath } from "@/lib/site-nav";
import { useAuthStore } from "@/lib/stores/auth-store";

function isCoachWelcomePath(pathname: string) {
  return (
    pathname === "/onboarding/coach-welcome" ||
    pathname.endsWith("/onboarding/coach-welcome")
  );
}

function isCheckInPath(pathname: string) {
  return pathname === "/check-in" || pathname.endsWith("/check-in");
}

/**
 * Soft reminder for signed-in users with streak 0 / no check-in yet.
 * Hidden on the guest funnel, coach-welcome (dedicated prompt), and /check-in.
 */
export function ActivationCheckInBanner() {
  const t = useTranslations("checkIn.activation");
  const pathname = usePathname() ?? "";
  const user = useAuthStore((s) => s.user);
  const signedIn = Boolean(user || getAccessToken());
  const streakQuery = useStreak();
  const [hydrated, setHydrated] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(isActivationBannerDismissed());
    setHydrated(true);
  }, []);

  const streakStatus = streakQuery.isPending
    ? "loading"
    : streakQuery.isError
      ? "error"
      : "ready";

  const visible = useMemo(
    () =>
      hydrated &&
      shouldShowActivationBanner({
        signedIn,
        dismissed,
        onFunnelPath: isOnboardingFunnelPath(pathname),
        onCheckInPath: isCheckInPath(pathname),
        onCoachWelcomePath: isCoachWelcomePath(pathname),
        streakStatus,
        neverCheckedIn: hasNeverCheckedIn(streakQuery.data),
      }),
    [dismissed, hydrated, pathname, signedIn, streakQuery.data, streakStatus],
  );

  const dismiss = useCallback(() => {
    dismissActivationBanner();
    setDismissed(true);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="border-b border-primary/20 bg-primary/[0.06]"
      data-testid="activation-check-in-banner"
    >
      <div className="mx-auto flex w-full max-w-5xl items-start gap-3 px-4 py-3 sm:items-center sm:px-6">
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-sm font-semibold leading-snug">{t("title")}</p>
          <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {t("body")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <ButtonLink
            href="/check-in"
            size="sm"
            className="min-h-10 gap-1.5 font-semibold"
            data-testid="activation-check-in-banner-cta"
            onClick={() =>
              trackFunnelEvent(FUNNEL_EVENTS.firstCheckInCtaClick, {
                surface: "activation_banner",
              })
            }
          >
            <CalendarCheck className="size-3.5 shrink-0" aria-hidden />
            {t("cta")}
          </ButtonLink>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-10 text-muted-foreground"
            aria-label={t("dismiss")}
            onClick={dismiss}
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  );
}
