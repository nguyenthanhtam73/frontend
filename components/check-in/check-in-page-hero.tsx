"use client";

import { Camera, ShieldCheck, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { isNeverCheckedInCheckIn } from "@/lib/check-in/d0-form";
import { useStreak } from "@/lib/hooks/use-streak";

/**
 * Page hero — D0 / never_checked_in copy says one face photo is enough.
 * `title` is only the eyebrow + heading so the form's photo / skip actions
 * stay on screen. Subtitle and step tiles render under those actions.
 */
export function CheckInPageHero({
  part = "full",
}: {
  part?: "full" | "title" | "details";
}) {
  const t = useTranslations("checkIn");
  const streakQuery = useStreak();
  const neverCheckedIn = isNeverCheckedInCheckIn({ streak: streakQuery.data });
  const subtitle = neverCheckedIn ? t("d0PageSub") : t("pageSub");

  const title = (
    <header className="mb-3 max-w-2xl space-y-1 sm:mb-6 sm:space-y-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground sm:text-xs sm:tracking-[0.2em]">
        {t("sectionEyebrow")}
      </p>
      <h1 className="text-xl font-semibold leading-tight tracking-tight sm:text-4xl">
        {t("pageTitle")}
      </h1>
    </header>
  );

  const details = (
    <div className="space-y-3 sm:space-y-4">
      <p className="max-w-2xl text-sm leading-snug text-muted-foreground sm:text-base sm:leading-relaxed">
        {subtitle}
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <HeroTile
          icon={<Camera className="size-4" aria-hidden />}
          title={t("heroStepPhoto")}
          desc={
            neverCheckedIn ? t("d0HeroStepPhotoDesc") : t("heroStepPhotoDesc")
          }
        />
        <HeroTile
          icon={<Sparkles className="size-4" aria-hidden />}
          title={t("heroStepCoach")}
          desc={t("heroStepCoachDesc")}
        />
        <HeroTile
          icon={<ShieldCheck className="size-4" aria-hidden />}
          title={t("heroStepSafety")}
          desc={t("heroStepSafetyDesc")}
        />
      </div>
    </div>
  );

  if (part === "title") return title;
  if (part === "details") return details;
  return (
    <>
      {title}
      {details}
    </>
  );
}

function HeroTile({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="group flex gap-3 rounded-xl border border-border/80 bg-card px-3 py-2.5 shadow-sm transition-colors hover:border-primary/30 sm:px-4 sm:py-3">
      <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
        {icon}
      </span>
      <div className="min-w-0 space-y-0.5">
        <p className="truncate text-sm font-semibold leading-tight">{title}</p>
        <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">
          {desc}
        </p>
      </div>
    </div>
  );
}
