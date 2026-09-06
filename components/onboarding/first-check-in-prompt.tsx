"use client";

import { CalendarCheck, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import {
  FIRST_CHECK_IN_LATER_DELAY_MS,
  clearAwaitingFirstCheckIn,
  hasNeverCheckedIn,
  isAwaitingFirstCheckIn,
  isFirstCheckInLaterToday,
  shouldShowFirstCheckInPrompt,
  writeFirstCheckInLaterToday,
} from "@/lib/activation/first-check-in";
import { FUNNEL_EVENTS, trackFunnelEvent } from "@/lib/analytics/funnel";
import { useStreak } from "@/lib/hooks/use-streak";
import { useAuthStore } from "@/lib/stores/auth-store";
import { streakDateKey } from "@/lib/streak/history";
import { cn } from "@/lib/utils";

type Props = {
  signedIn: boolean;
  isGuest: boolean;
  pendingAccountClaim: boolean;
  className?: string;
  onLaterToday?: () => void;
};

/** Same-session first check-in CTA after claim / signed-in onboarding finish. */
export function FirstCheckInPrompt({
  signedIn,
  isGuest,
  pendingAccountClaim,
  className,
  onLaterToday,
}: Props) {
  const t = useTranslations("coachWelcome.firstCheckIn");
  const userId = useAuthStore((s) => s.user?.id);
  const streakQuery = useStreak();
  const [hydrated, setHydrated] = useState(false);
  const [laterToday, setLaterToday] = useState(false);
  const [awaiting, setAwaiting] = useState(false);
  const [laterReady, setLaterReady] = useState(false);

  const today = streakDateKey();

  useEffect(() => {
    setLaterToday(userId ? isFirstCheckInLaterToday(userId, today) : false);
    setAwaiting(isAwaitingFirstCheckIn(userId));
    setHydrated(true);
  }, [today, userId]);

  const streakStatus = streakQuery.isPending
    ? "loading"
    : streakQuery.isError
      ? "error"
      : "ready";
  const neverCheckedIn = hasNeverCheckedIn(streakQuery.data);

  useEffect(() => {
    if (streakStatus === "ready" && !neverCheckedIn && userId) {
      clearAwaitingFirstCheckIn(userId);
    }
  }, [neverCheckedIn, streakStatus, userId]);

  const visible = useMemo(
    () =>
      hydrated &&
      shouldShowFirstCheckInPrompt({
        signedIn,
        isGuest,
        pendingAccountClaim,
        laterToday,
        awaiting,
        streakStatus,
        neverCheckedIn,
      }),
    [
      hydrated,
      signedIn,
      isGuest,
      pendingAccountClaim,
      laterToday,
      awaiting,
      streakStatus,
      neverCheckedIn,
    ],
  );

  useEffect(() => {
    if (!visible) {
      setLaterReady(false);
      return;
    }
    const id = window.setTimeout(
      () => setLaterReady(true),
      FIRST_CHECK_IN_LATER_DELAY_MS,
    );
    return () => window.clearTimeout(id);
  }, [visible]);

  const snooze = useCallback(() => {
    if (userId) writeFirstCheckInLaterToday(userId, today);
    setLaterToday(true);
    onLaterToday?.();
  }, [onLaterToday, today, userId]);

  if (!visible) return null;

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 border-primary/35 bg-gradient-to-br from-primary/[0.12] via-emerald-500/[0.06] to-background p-4 shadow-md sm:p-5",
        className,
      )}
      data-testid="first-check-in-prompt"
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
            {t("label")}
          </p>
          <h2 className="text-lg font-semibold leading-snug tracking-tight sm:text-xl">
            {awaiting ? t("titleSaved") : t("title")}
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {awaiting ? t("bodySaved") : t("body")}
          </p>
        </div>
        <ButtonLink
          href="/check-in"
          size="lg"
          className="min-h-12 w-full gap-2.5 text-base font-bold shadow-lg shadow-primary/25 sm:min-h-14"
          data-testid="first-check-in-prompt-cta"
          onClick={() =>
            trackFunnelEvent(FUNNEL_EVENTS.firstCheckInCtaClick, {
              surface: "coach_welcome_prompt",
              awaiting,
            })
          }
        >
          <CalendarCheck className="size-5 shrink-0" aria-hidden />
          {t("cta")}
          <ArrowRight className="size-5 shrink-0" aria-hidden />
        </ButtonLink>
        {laterReady ? (
          <div className="space-y-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground"
              data-testid="first-check-in-prompt-skip"
              onClick={snooze}
            >
              {t("laterToday")}
            </Button>
            <p className="text-center text-[11px] leading-snug text-muted-foreground">
              {t("laterTodayHint")}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
