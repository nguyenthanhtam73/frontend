"use client";

import { CheckCircle2, Eye, EyeOff, Sparkles, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useState } from "react";

import { OnboardingDeleteSection } from "@/components/onboarding/onboarding-delete-section";
import { ProductSuggestionsCard } from "@/components/coach/product-suggestions-card";
import { StarterRoutineCards } from "@/components/onboarding/starter-routine-cards";
import { StarterRoutineGenerationNotice } from "@/components/onboarding/starter-routine-generation-notice";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IconDismissButton } from "@/components/ui/icon-dismiss-button";
import { Link } from "@/i18n/navigation";
import { apiBaseUrl } from "@/lib/api";
import type { OnboardingReviewData } from "@/lib/onboarding/review-data";
import { readCoachWelcomeSession } from "@/lib/onboarding/coach-welcome-session";
import { useStarterRoutineLive } from "@/lib/onboarding/use-starter-routine-live";
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

function absUploadUrl(url: string): string {
  if (url.startsWith("http") || url.startsWith("blob:")) return url;
  return `${apiBaseUrl}${url}`;
}

export function OnboardingReview({ data, onDeleted }: OnboardingReviewProps) {
  const t = useTranslations("onboarding");
  const tReview = useTranslations("onboarding.review");
  const tCoach = useTranslations("coachWelcome");
  const tCheckIn = useTranslations("checkIn");
  const formatter = useFormatter();
  const [showPhotos, setShowPhotos] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

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

  const hasPhotos = data.photoUrls.length > 0;
  const showPhotoSection = data.photosSkipped || hasPhotos;

  const closeLightbox = useCallback(() => setLightboxUrl(null), []);

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

        {showPhotoSection ? (
          <div className="space-y-3">
            {data.photosSkipped ? (
              <p className="text-sm text-muted-foreground">{tReview("photosSkipped")}</p>
            ) : hasPhotos ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  aria-expanded={showPhotos}
                  onClick={() => setShowPhotos((v) => !v)}
                >
                  {showPhotos ? (
                    <>
                      <EyeOff className="size-4" aria-hidden />
                      {tReview("hidePhotos")}
                    </>
                  ) : (
                    <>
                      <Eye className="size-4" aria-hidden />
                      {tReview("showPhotos")}
                    </>
                  )}
                </Button>

                {showPhotos ? (
                  <section aria-label={tReview("photosSection")} className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {tReview("photosSection")}
                    </p>
                    <ReviewPhotoGrid
                      urls={data.photoUrls}
                      altLabel={(n) => tCheckIn("altPhoto", { n })}
                      onOpen={setLightboxUrl}
                    />
                  </section>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}

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
        data.isGuest ? (
          <GuestReviewRoutineSection data={data} />
        ) : (
          <LoggedInReviewRoutineSection data={data} />
        )
      ) : null}

      {data.isGuest ? (
        <Card className="border-amber-200/70 bg-amber-50/50 dark:border-amber-500/25 dark:bg-amber-950/30">
          <CardContent className="pt-6 text-sm leading-relaxed text-muted-foreground">
            {tCoach("guestPreviewHint")}
          </CardContent>
        </Card>
      ) : null}

      <OnboardingDeleteSection isGuest={data.isGuest} onDeleted={onDeleted} />

      {lightboxUrl ? (
        <ReviewPhotoLightbox
          url={lightboxUrl}
          closeLabel={tReview("closePhoto")}
          onClose={closeLightbox}
        />
      ) : null}
    </div>
  );
}

function LoggedInReviewRoutineSection({ data }: { data: OnboardingReviewData }) {
  const tCoach = useTranslations("coachWelcome");

  if (!data.starter) return null;

  return (
    <section className="space-y-4">
      <ReviewRoutineHeader />
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
  );
}

function GuestReviewRoutineSection({ data }: { data: OnboardingReviewData }) {
  const tCoach = useTranslations("coachWelcome");
  const session = readCoachWelcomeSession();
  const initialPending =
    data.starterRoutinePending === true || session?.starterRoutinePending === true;
  const starter = data.starter!;

  const { starter: liveStarter, isGeneratingRoutine, showFallbackBanner, routineJustUpdated } =
    useStarterRoutineLive({
      initialStarter: starter,
      initialPending,
      isGuest: true,
    });

  return (
    <section className="space-y-4">
      <ReviewRoutineHeader />
      <StarterRoutineGenerationNotice
        isGeneratingRoutine={isGeneratingRoutine}
        showFallbackBanner={showFallbackBanner}
        isGuest
      />
      <div
        className={cn(
          "rounded-xl transition-all duration-700 motion-safe:animate-in motion-safe:fade-in",
          routineJustUpdated &&
            "ring-2 ring-emerald-400/45 bg-emerald-500/[0.06] shadow-sm motion-safe:duration-700",
        )}
      >
        <StarterRoutineCards
          starter={liveStarter}
          morningLabel={tCoach("morning")}
          eveningLabel={tCoach("evening")}
          noStepsLabel={tCoach("noSteps")}
        />
      </div>
      <ProductSuggestionsCard
        suggestions={liveStarter.product_suggestions}
        source="starter_routine"
      />
    </section>
  );
}

function ReviewRoutineHeader() {
  const tReview = useTranslations("onboarding.review");

  return (
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
  );
}

function ReviewPhotoGrid({
  urls,
  altLabel,
  onOpen,
}: {
  urls: string[];
  altLabel: (n: number) => string;
  onOpen: (url: string) => void;
}) {
  const colClass =
    urls.length >= 3
      ? "grid-cols-3"
      : urls.length === 2
        ? "grid-cols-2"
        : "grid-cols-1 max-w-[12rem]";

  return (
    <ul className={cn("grid gap-2 sm:gap-3", colClass)}>
      {urls.map((url, i) => (
        <li key={`${url}-${i}`}>
          <ReviewPhotoThumb
            src={absUploadUrl(url)}
            alt={altLabel(i + 1)}
            onOpen={() => onOpen(absUploadUrl(url))}
          />
        </li>
      ))}
    </ul>
  );
}

function ReviewPhotoThumb({
  src,
  alt,
  onOpen,
}: {
  src: string;
  alt: string;
  onOpen: () => void;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative aspect-3/4 w-full overflow-hidden rounded-xl border border-border/80 bg-muted shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {!loaded ? (
        <span
          className="absolute inset-0 animate-pulse bg-muted-foreground/10"
          aria-hidden
        />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={cn(
          "size-full object-cover transition-opacity duration-200",
          loaded ? "opacity-100" : "opacity-0",
        )}
      />
    </button>
  );
}

function ReviewPhotoLightbox({
  url,
  closeLabel,
  onClose,
}: {
  url: string;
  closeLabel: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={closeLabel}
      onClick={onClose}
    >
      <IconDismissButton
        ariaLabel={closeLabel}
        onClick={onClose}
        className="absolute right-4 top-4 z-10 bg-black/50 text-white hover:bg-black/70"
      >
        <X className="size-4" aria-hidden />
      </IconDismissButton>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
