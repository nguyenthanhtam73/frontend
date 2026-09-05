"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import {
  resolveCheckInReminderKind,
  signupDayKey,
} from "@/lib/activation/check-in-reminder";
import {
  hasNeverCheckedIn,
  shouldShowCheckInFirstVisit,
} from "@/lib/activation/first-check-in";
import { getAccessToken } from "@/lib/auth-token";
import { useStreak } from "@/lib/hooks/use-streak";
import { useAuthStore } from "@/lib/stores/auth-store";
import { streakDateKey } from "@/lib/streak/history";

/** First-time welcome on /check-in — the form itself is the primary action. */
export function CheckInFirstVisit() {
  const t = useTranslations("checkIn.firstVisit");
  const user = useAuthStore((s) => s.user);
  const signedIn = Boolean(user || getAccessToken());
  const streakQuery = useStreak();
  const today = streakDateKey();

  const streakStatus = streakQuery.isPending
    ? "loading"
    : streakQuery.isError
      ? "error"
      : "ready";

  const kind = useMemo(
    () =>
      resolveCheckInReminderKind({
        today,
        signupDay: signupDayKey(user?.created_at),
        streak: streakQuery.data,
      }),
    [streakQuery.data, today, user?.created_at],
  );

  const visible = useMemo(
    () =>
      shouldShowCheckInFirstVisit({
        signedIn,
        onCheckInPath: true,
        streakStatus,
        neverCheckedIn: hasNeverCheckedIn(streakQuery.data),
      }),
    [signedIn, streakQuery.data, streakStatus],
  );

  if (!visible) return null;

  const isD1 = kind === "d1";

  return (
    <aside
      className="mb-6 rounded-2xl border border-primary/25 bg-primary/[0.06] px-4 py-3.5 sm:mb-8"
      data-testid="check-in-first-visit"
      data-reminder-kind={kind ?? "d0"}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Sparkles className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-semibold leading-snug">
            {isD1 ? t("d1Title") : t("title")}
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {isD1 ? t("d1Body") : t("body")}
          </p>
        </div>
      </div>
    </aside>
  );
}
