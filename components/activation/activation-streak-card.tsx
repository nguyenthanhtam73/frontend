"use client";

import { CalendarCheck, Flame, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { ButtonLink } from "@/components/ui/button-link";
import { hasCheckedInToday } from "@/lib/activation/check-in-reminder";
import { getAccessToken } from "@/lib/auth-token";
import { useStreak } from "@/lib/hooks/use-streak";
import { useAuthStore } from "@/lib/stores/auth-store";
import { streakDateKey, streakFlameTier } from "@/lib/streak/history";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** When true, hide the check-in CTA (the form is already on this page). */
  hideCheckInCta?: boolean;
};

/**
 * Compact current + best streak. Empty state motivates the first/next check-in.
 * Stays visible after the daily reminder is dismissed.
 */
export function ActivationStreakCard({ className, hideCheckInCta = false }: Props) {
  const t = useTranslations("activation.streak");
  const user = useAuthStore((s) => s.user);
  const signedIn = Boolean(user || getAccessToken());
  const { data, isPending, isError } = useStreak();
  const today = streakDateKey();

  const checkedToday = useMemo(
    () => hasCheckedInToday(data, today),
    [data, today],
  );

  if (!signedIn) return null;
  if (isPending && !data) return null;
  if (isError && !data) return null;
  if (!data) return null;

  const current = data.current_streak ?? 0;
  const best = data.longest_streak ?? 0;
  const empty = current <= 0 && !checkedToday;
  const tier = streakFlameTier(current);

  return (
    <section
      className={cn(
        "rounded-2xl border px-4 py-3.5 sm:px-5",
        empty
          ? "border-primary/25 bg-primary/[0.05]"
          : "border-border/70 bg-card",
        className,
      )}
      aria-label={t("ariaLabel")}
      data-testid="activation-streak-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "inline-flex size-10 shrink-0 items-center justify-center rounded-xl",
              flameIconClass(tier),
              current > 0 && "streak-flame-pulse",
            )}
            aria-hidden
          >
            <Flame className="size-5" strokeWidth={2.25} />
          </span>
          <div className="min-w-0">
            {empty ? (
              <>
                <p className="text-sm font-semibold leading-snug">{t("emptyTitle")}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {t("emptyBody")}
                </p>
              </>
            ) : (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("current")}
                </p>
                <p className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold tabular-nums leading-none">
                    {current}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("days", { n: current })}
                  </span>
                </p>
                {checkedToday ? (
                  <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    {t("doneToday")}
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-background/80 px-2.5 py-1.5 text-amber-900 dark:text-amber-100"
            data-testid="activation-streak-best"
          >
            <Trophy className="size-3.5 shrink-0" aria-hidden />
            <span className="text-[10px] font-medium opacity-80">{t("best")}</span>
            <span className="text-sm font-bold tabular-nums">{best}</span>
          </div>
          {!hideCheckInCta && !checkedToday ? (
            <ButtonLink
              href="/check-in"
              size="sm"
              className="min-h-10 gap-1.5 font-semibold"
              data-testid="activation-streak-cta"
            >
              <CalendarCheck className="size-3.5 shrink-0" aria-hidden />
              {empty ? t("emptyCta") : t("checkInCta")}
            </ButtonLink>
          ) : null}
          {!hideCheckInCta && checkedToday ? (
            <ButtonLink
              href="/progress"
              size="sm"
              variant="outline"
              className="min-h-10"
              data-testid="activation-streak-diary"
            >
              {t("openDiary")}
            </ButtonLink>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function flameIconClass(tier: ReturnType<typeof streakFlameTier>): string {
  if (tier === "blaze") return "bg-gradient-to-br from-rose-500 to-orange-500 text-white";
  if (tier === "hot") return "bg-gradient-to-br from-orange-500 to-amber-500 text-white";
  if (tier === "warm") return "bg-gradient-to-br from-amber-500 to-yellow-500 text-amber-950";
  return "bg-muted text-muted-foreground";
}
