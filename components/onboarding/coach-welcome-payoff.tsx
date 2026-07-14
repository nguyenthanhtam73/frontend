"use client";

import { Award, CheckCircle2, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

export function CoachWelcomeAchievementCard({
  title,
  line,
  className,
}: {
  title: string;
  line: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border-2 border-emerald-400/35",
        "bg-gradient-to-br from-emerald-500/15 via-emerald-500/8 to-amber-500/5",
        "px-4 py-3.5 shadow-md",
        className,
      )}
      role="status"
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-emerald-400/10"
        aria-hidden
      />
      <div className="relative flex items-start gap-3.5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md ring-2 ring-emerald-400/25">
          <Award className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 space-y-0.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            {title}
          </p>
          <p className="text-sm font-semibold leading-snug text-emerald-950 dark:text-emerald-50">
            {line}
          </p>
        </div>
      </div>
    </div>
  );
}

export function CoachWelcomeNextStepCard({
  label,
  hint,
  benefit,
  className,
}: {
  label: string;
  hint: string;
  benefit?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-lg border border-primary/25 bg-background/90 px-3.5 py-3",
        className,
      )}
    >
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <TrendingUp className="size-4 text-primary" aria-hidden />
      </span>
      <div className="min-w-0 space-y-0.5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-primary">{label}</p>
        <p className="text-sm font-medium leading-snug text-foreground">{hint}</p>
        {benefit ? (
          <p className="text-xs leading-relaxed text-muted-foreground">{benefit}</p>
        ) : null}
      </div>
    </div>
  );
}

/** Celebration header — badge, title, achievement card. */
export function CoachWelcomeCelebrationHeader({
  completedLabel,
  className,
}: {
  completedLabel?: string;
  className?: string;
}) {
  const t = useTranslations("coachWelcome");
  const tReview = useTranslations("onboarding.review");

  return (
    <header
      className={cn("space-y-3 text-center sm:space-y-3.5 sm:text-left", className)}
    >
      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="size-4" aria-hidden />
        {tReview("badge")}
      </div>
      <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
        {t("celebrationTitle")}
      </h1>
      <p className="text-sm font-semibold leading-snug text-foreground sm:text-base">
        {t("celebrationLine")}
      </p>
      <CoachWelcomeAchievementCard title={t("achievementTitle")} line={t("achievementLine")} />
      {completedLabel ? (
        <p className="text-xs text-muted-foreground">{completedLabel}</p>
      ) : null}
    </header>
  );
}
