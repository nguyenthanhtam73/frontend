"use client";

import { Check, Sun, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

const GOOD_CRITERIA_KEYS = [
  "photoGuide.goodLight",
  "photoGuide.goodAngle",
  "photoGuide.goodClean",
] as const;

const AVOID_CRITERIA_KEYS = [
  "photoGuide.avoidFilter",
  "photoGuide.avoidDark",
  "photoGuide.avoidMakeup",
] as const;

export function OnboardingPhotoGuide() {
  const t = useTranslations("onboarding");

  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-muted/25 p-3.5">
      <p className="text-sm font-semibold">{t("photoGuide.title")}</p>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <div className="flex gap-3 rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3">
          <div
            className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-200/80 to-amber-100/40 dark:from-amber-900/40 dark:to-amber-950/20"
            aria-hidden
          >
            <Sun className="size-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              {t("photoGuide.goodExample")}
            </p>
            <ul className="space-y-0.5 text-xs text-muted-foreground">
              {GOOD_CRITERIA_KEYS.map((key) => (
                <li key={key} className="flex items-start gap-1.5">
                  <Check className="mt-0.5 size-3 shrink-0 text-emerald-600" aria-hidden />
                  {t(key)}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
          <div
            className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-muted/60"
            aria-hidden
          >
            <X className="size-6 text-muted-foreground" />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-semibold text-destructive/90">{t("photoGuide.avoidExample")}</p>
            <ul className="space-y-0.5 text-xs text-muted-foreground">
              {AVOID_CRITERIA_KEYS.map((key) => (
                <li key={key} className="flex items-start gap-1.5">
                  <X className="mt-0.5 size-3 shrink-0 text-destructive/70" aria-hidden />
                  {t(key)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">{t("photoGuide.footer")}</p>
    </div>
  );
}

export function ConcernLimitHint({ count, max }: { count: number; max: number }) {
  const t = useTranslations("onboarding");
  return (
    <p
      className={cn(
        "text-xs",
        count >= max ? "font-medium text-amber-700 dark:text-amber-300" : "text-muted-foreground",
      )}
    >
      {t("step1.concernLimit", { count, max })}
    </p>
  );
}
