"use client";

import { useState } from "react";

import {
  CircleCheck,
  History,
  Info,
  Sparkles,
  Sprout,
} from "lucide-react";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { formatShortDate, type RoutineSourceInfo } from "../routine-helpers";

export type RoutineSourceLabels = {
  savedToday: string;
  savedTodayHint: string;
  carriedFrom: (date: string) => string;
  carriedSubtitle: string;
  carriedHint: string;
  onboardingSeed: string;
  onboardingSubtitle: string;
  onboardingHint: string;
  onboardingEditLink: string;
  aiSuggested: string;
  aiHint: string;
  infoToggle: string;
};

function sourceMeta(info: RoutineSourceInfo, labels: RoutineSourceLabels) {
  switch (info.kind) {
    case "saved_today":
      return {
        tone: "ok" as const,
        Icon: CircleCheck,
        title: labels.savedToday,
        subtitle: null as string | null,
        hint: labels.savedTodayHint,
        editHref: null as string | null,
      };
    case "carried":
      return {
        tone: "muted" as const,
        Icon: History,
        title: info.fromDate
          ? labels.carriedFrom(formatShortDate(info.fromDate))
          : labels.carriedFrom("…"),
        subtitle: labels.carriedSubtitle,
        hint: labels.carriedHint,
        editHref: null,
      };
    case "onboarding_seed":
      return {
        tone: "seed" as const,
        Icon: Sprout,
        title: labels.onboardingSeed,
        subtitle: labels.onboardingSubtitle,
        hint: labels.onboardingHint,
        editHref: "/onboarding",
      };
    case "ai_suggested":
      return {
        tone: "accent" as const,
        Icon: Sparkles,
        title: labels.aiSuggested,
        subtitle: null,
        hint: labels.aiHint,
        editHref: null,
      };
  }
}

/**
 * Explains where the current routine came from — saved today, carried from a
 * prior day, or seeded from onboarding.
 */
export function RoutineSourceBadge({
  info,
  labels,
  className,
}: {
  info: RoutineSourceInfo;
  labels: RoutineSourceLabels;
  className?: string;
}) {
  const [hintOpen, setHintOpen] = useState(false);
  const meta = sourceMeta(info, labels);

  const toneCls =
    meta.tone === "ok"
      ? "border-emerald-500/35 bg-emerald-500/8 text-emerald-800 dark:text-emerald-200"
      : meta.tone === "accent"
        ? "border-primary/35 bg-primary/8 text-primary"
        : meta.tone === "seed"
          ? "border-teal-500/35 bg-teal-500/8 text-teal-900 dark:text-teal-100"
          : "border-amber-500/35 bg-amber-500/8 text-amber-900 dark:text-amber-100";

  return (
    <div className={cn("min-w-0 space-y-2", className)}>
      <div className="flex flex-wrap items-start gap-2">
        <span
          className={cn(
            "inline-flex min-h-10 max-w-full items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold leading-snug sm:min-h-9 sm:text-sm",
            toneCls,
          )}
        >
          <meta.Icon className="size-4 shrink-0" aria-hidden />
          <span>{meta.title}</span>
        </span>

        <button
          type="button"
          onClick={() => setHintOpen((v) => !v)}
          aria-expanded={hintOpen}
          aria-label={labels.infoToggle}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-background/80 text-muted-foreground transition hover:bg-muted/60 hover:text-foreground active:scale-[0.98] sm:size-9"
        >
          <Info className="size-4" aria-hidden />
        </button>
      </div>

      {meta.subtitle ? (
        <p className="text-sm leading-relaxed text-foreground/85 sm:text-sm">{meta.subtitle}</p>
      ) : null}

      {hintOpen ? (
        <p
          className="rounded-xl border border-border/70 bg-background/80 px-3 py-2.5 text-sm leading-relaxed text-muted-foreground in-animate animate-in fade-in slide-in-from-top-1 duration-200"
          role="note"
        >
          {meta.hint}
        </p>
      ) : null}

      {meta.editHref ? (
        <Link
          href={meta.editHref}
          className="inline-flex min-h-10 items-center text-sm font-medium text-primary underline-offset-4 hover:underline sm:min-h-9"
        >
          {labels.onboardingEditLink}
        </Link>
      ) : null}
    </div>
  );
}
