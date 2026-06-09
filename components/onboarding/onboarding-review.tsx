"use client";

import { CheckCircle2, Eye, Sparkles } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { OnboardingDeleteSection } from "@/components/onboarding/onboarding-delete-section";
import { ProductSuggestionsCard } from "@/components/coach/product-suggestions-card";
import { StarterRoutineCards } from "@/components/onboarding/starter-routine-cards";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { OnboardingReviewData } from "@/lib/onboarding/review-data";
import { GUEST_COACH_PROFILE_ID } from "@/lib/types/starter-routine";
import { cn } from "@/lib/utils";

const CONCERN_IDS = [
  "acne",
  "hyperpigmentation",
  "dryness",
  "redness",
  "large_pores",
  "weak_barrier",
  "dullness",
  "dehydration",
  "uneven_texture",
] as const;

type OnboardingReviewProps = {
  data: OnboardingReviewData;
  onDeleted?: () => void;
};

export function OnboardingReview({ data, onDeleted }: OnboardingReviewProps) {
  const t = useTranslations("onboarding");
  const tReview = useTranslations("onboarding.review");
  const tCoach = useTranslations("coachWelcome");
  const formatter = useFormatter();

  const completedLabel = (() => {
    const d = new Date(data.completedAt);
    if (Number.isNaN(d.getTime())) return "";
    return formatter.dateTime(d, { dateStyle: "long", timeStyle: "short" });
  })();

  const skinTypeLabel = data.skinType
    ? t(`skinType.${data.skinType}` as `skinType.dry`)
    : "—";
  const undertoneLabel = data.undertone
    ? t(`undertone.${data.undertone}` as `undertone.cool`)
    : "—";
  const goalLabel = data.goal ? t(`goal.${data.goal}` as `goal.glow`) : "—";
  const skillLabel =
    data.skillLevel && data.skillLevel !== "unspecified"
      ? t(`skill.${data.skillLevel as "beginner"}.short`)
      : "—";
  const concernLabels = data.concerns.map((id) =>
    (CONCERN_IDS as readonly string[]).includes(id)
      ? t(`aiConcerns.${id as (typeof CONCERN_IDS)[number]}`)
      : id,
  );

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <header className="space-y-3 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="size-4" aria-hidden />
          {tReview("badge")}
        </div>
        <h1 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
          {tReview("title")}
        </h1>
        {completedLabel ? (
          <p className="text-sm text-muted-foreground">
            {tReview("completedOn", { date: completedLabel })}
          </p>
        ) : null}
        <p className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <Eye className="size-3.5 shrink-0" aria-hidden />
          {tReview("readOnlyHint")}
        </p>
      </header>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {tReview("skinSection")}
          </p>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">{tReview("skinType")}</dt>
              <dd className="text-sm font-medium">{skinTypeLabel}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{tReview("undertone")}</dt>
              <dd className="text-sm font-medium">{undertoneLabel}</dd>
            </div>
            {concernLabels.length > 0 ? (
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">{tReview("concerns")}</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {concernLabels.map((c) => (
                    <span
                      key={c}
                      className="rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs font-medium"
                    >
                      {c}
                    </span>
                  ))}
                </dd>
              </div>
            ) : null}
          </dl>
          {data.starter?.skin_readback ? (
            <p className="rounded-lg bg-muted/40 p-3 text-sm leading-relaxed whitespace-pre-wrap">
              {data.starter.skin_readback}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="space-y-2 pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {tReview("skillSection")}
            </p>
            <p className="text-sm font-medium">{skillLabel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {tReview("goalSection")}
            </p>
            <p className="text-sm font-medium">{goalLabel}</p>
          </CardContent>
        </Card>
      </div>

      {data.starter ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" aria-hidden />
              <h2 className="text-lg font-semibold">{tReview("routineSection")}</h2>
            </div>
            <Link
              href="/onboarding/coach-welcome"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              {tReview("viewFullRoutine")}
            </Link>
          </div>
          <StarterRoutineCards
            starter={data.starter}
            morningLabel={tCoach("morning")}
            eveningLabel={tCoach("evening")}
            noStepsLabel={tCoach("noSteps")}
          />
          <ProductSuggestionsCard
            suggestions={data.starter.product_suggestions}
            source="starter_routine"
            contextId={
              data.profileId && data.profileId !== GUEST_COACH_PROFILE_ID
                ? data.profileId
                : undefined
            }
          />
        </section>
      ) : null}

      {data.isGuest ? (
        <Card className="border-amber-200/70 bg-amber-50/50 dark:border-amber-500/25 dark:bg-amber-950/30">
          <CardContent className="pt-6 text-sm leading-relaxed text-muted-foreground">
            {tCoach("guestPreviewHint")}
          </CardContent>
        </Card>
      ) : null}

      <OnboardingDeleteSection isGuest={data.isGuest} onDeleted={onDeleted} />
    </div>
  );
}
