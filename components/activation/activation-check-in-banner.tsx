"use client";

import { CalendarCheck, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import {
  isReminderDismissedToday,
  resolveCheckInReminderKind,
  resolvePreferredCheckInReminderKind,
  shouldShowDailyCheckInReminder,
  signupDayKey,
  writeReminderDismissedDay,
  type CheckInReminderKind,
} from "@/lib/activation/check-in-reminder";
import {
  hasNeverCheckedIn,
  isFirstCheckInLaterToday,
  writeFirstCheckInLaterToday,
} from "@/lib/activation/first-check-in";
import { FUNNEL_EVENTS, trackFunnelEvent, trackFunnelEventOnce } from "@/lib/analytics/funnel";
import { getAccessToken } from "@/lib/auth-token";
import { useCheckInReminder } from "@/lib/hooks/use-check-in-reminder";
import { useStreak } from "@/lib/hooks/use-streak";
import { isOnboardingFunnelPath } from "@/lib/site-nav";
import { useAuthStore } from "@/lib/stores/auth-store";
import { streakDateKey } from "@/lib/streak/history";

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
 * Soft D0/D1 / keep-streak reminder for signed-in users who have not checked in today.
 * Hidden on the guest funnel, coach-welcome (dedicated prompt), and /check-in.
 * Dismiss lasts for today's Vietnam calendar day only.
 */
export function ActivationCheckInBanner() {
  const t = useTranslations("activation.reminder");
  const pathname = usePathname() ?? "";
  const user = useAuthStore((s) => s.user);
  const signedIn = Boolean(user || getAccessToken());
  const streakQuery = useStreak();
  const reminderQuery = useCheckInReminder();
  const [hydrated, setHydrated] = useState(false);
  const [dismissedToday, setDismissedToday] = useState(false);
  const [laterToday, setLaterToday] = useState(false);

  const today = streakDateKey();
  const neverCheckedIn = hasNeverCheckedIn(streakQuery.data);

  useEffect(() => {
    const id = user?.id ?? "";
    setDismissedToday(id ? isReminderDismissedToday(id, today) : false);
    setLaterToday(id ? isFirstCheckInLaterToday(id, today) : false);
    setHydrated(true);
  }, [today, user?.id]);

  const streakStatus = streakQuery.isPending
    ? "loading"
    : streakQuery.isError
      ? "error"
      : "ready";

  const reminderStatus = reminderQuery.isSuccess
    ? "ready"
    : reminderQuery.isError
      ? "error"
      : "loading";

  const clientKind = useMemo(
    () =>
      streakStatus === "ready"
        ? resolveCheckInReminderKind({
            today,
            signupDay: signupDayKey(user?.created_at),
            streak: streakQuery.data,
          })
        : null,
    [streakQuery.data, streakStatus, today, user?.created_at],
  );

  const kind = useMemo(
    () =>
      resolvePreferredCheckInReminderKind({
        reminderStatus,
        serverData: reminderQuery.data,
        clientKind,
      }),
    [clientKind, reminderQuery.data, reminderStatus],
  );

  const uiDismissed = neverCheckedIn ? laterToday : dismissedToday;

  const visible = useMemo(
    () =>
      hydrated &&
      shouldShowDailyCheckInReminder({
        signedIn,
        dismissedToday: uiDismissed,
        onFunnelPath: isOnboardingFunnelPath(pathname),
        onCheckInPath: isCheckInPath(pathname),
        onCoachWelcomePath: isCoachWelcomePath(pathname),
        streakStatus,
        reminderStatus,
        kind,
      }),
    [
      hydrated,
      kind,
      pathname,
      reminderStatus,
      signedIn,
      streakStatus,
      uiDismissed,
    ],
  );

  const dismiss = useCallback(() => {
    if (!user?.id) return;
    if (neverCheckedIn) {
      // UI snooze only — do not write reminder-dismiss (D0 stays due).
      writeFirstCheckInLaterToday(user.id, today);
      setLaterToday(true);
      return;
    }
    writeReminderDismissedDay(user.id, today);
    setDismissedToday(true);
  }, [neverCheckedIn, today, user?.id]);

  useEffect(() => {
    if (!visible || kind !== "d1") return;
    trackFunnelEventOnce(
      FUNNEL_EVENTS.d1ReminderShown,
      { surface: "activation_banner" },
      `${today}:${user?.id ?? "anon"}`,
    );
  }, [kind, today, user?.id, visible]);

  if (!visible || !kind) return null;

  const copy = reminderCopy(kind, t, streakQuery.data?.current_streak ?? 0);

  return (
    <div
      className="border-b border-primary/20 bg-primary/[0.06]"
      data-testid="activation-check-in-banner"
      data-reminder-kind={kind}
    >
      <div className="mx-auto flex w-full max-w-5xl items-start gap-3 px-4 py-3 sm:items-center sm:px-6">
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-sm font-semibold leading-snug">{copy.title}</p>
          <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {copy.body}
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
                kind,
              })
            }
          >
            <CalendarCheck className="size-3.5 shrink-0" aria-hidden />
            {t("cta")}
          </ButtonLink>
          {neverCheckedIn ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-10 text-xs text-muted-foreground"
              data-testid="activation-check-in-banner-dismiss"
              onClick={dismiss}
            >
              {t("laterToday")}
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-10 text-muted-foreground"
              aria-label={t("dismiss")}
              data-testid="activation-check-in-banner-dismiss"
              onClick={dismiss}
            >
              <X className="size-4" aria-hidden />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function reminderCopy(
  kind: CheckInReminderKind,
  t: ReturnType<typeof useTranslations>,
  currentStreak: number,
): { title: string; body: string } {
  if (kind === "keep") {
    return {
      title: t("keep.title", { n: Math.max(1, currentStreak) }),
      body: t("keep.body"),
    };
  }
  return {
    title: t(`${kind}.title`),
    body: t(`${kind}.body`),
  };
}
