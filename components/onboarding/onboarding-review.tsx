"use client";

import { Eye, EyeOff, Sparkles, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

import {
  CoachWelcomeCta,
  CoachWelcomePrimaryCtaBlock,
  CoachWelcomeStickyBar,
} from "@/components/onboarding/coach-welcome-cta";
import { CoachWelcomeCelebrationHeader } from "@/components/onboarding/coach-welcome-payoff";
import { CoachWelcomeSection } from "@/components/onboarding/coach-welcome-section";
import { OnboardingDeleteSection } from "@/components/onboarding/onboarding-delete-section";
import { ProductSuggestionsCard } from "@/components/coach/product-suggestions-card";
import { StarterRoutineCards } from "@/components/onboarding/starter-routine-cards";
import { StarterRoutineFeedback } from "@/components/onboarding/starter-routine-feedback";
import {
  StarterRoutineSafetySection,
  StarterRoutineSupportExtras,
} from "@/components/onboarding/starter-routine-extras";
import { StarterRoutineGenerationNotice } from "@/components/onboarding/starter-routine-generation-notice";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IconDismissButton } from "@/components/ui/icon-dismiss-button";
import { Link } from "@/i18n/navigation";
import { apiBaseUrl } from "@/lib/api";
import type { OnboardingReviewData } from "@/lib/onboarding/review-data";
import { readCoachWelcomeSession } from "@/lib/onboarding/coach-welcome-session";
import { normalizeReviewPhotoUrls } from "@/lib/onboarding/photo-session-urls";
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
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("blob:") ||
    url.startsWith("data:")
  ) {
    return url;
  }
  const base = apiBaseUrl.replace(/\/$/, "");
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
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

  const photoUrls = useMemo(
    () => normalizeReviewPhotoUrls(data.photoUrls),
    [data.photoUrls],
  );
  const hasPhotos = photoUrls.length > 0;
  const photosLost =
    !data.photosSkipped && data.photoUrls.length > 0 && !hasPhotos;
  const showPhotoSection = data.photosSkipped || hasPhotos || photosLost;

  const skinReadback =
    data.coachingNotes?.trim() || data.starter?.skin_readback?.trim() || "";

  const closeLightbox = useCallback(() => setLightboxUrl(null), []);

  return (
    <>
      <div className="mx-auto w-full max-w-2xl space-y-5 pb-24 sm:space-y-6 sm:pb-6">
        <CoachWelcomeCelebrationHeader
          completedLabel={
            completedLabel
              ? tReview("completedOn", { date: completedLabel })
              : undefined
          }
        />

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
                      urls={photoUrls}
                      altLabel={(n) => tCheckIn("altPhoto", { n })}
                      eagerLoad
                      onOpen={setLightboxUrl}
                    />
                  </section>
                ) : null}
              </>
            ) : photosLost ? (
              <p className="text-sm text-muted-foreground">{tReview("photosExpired")}</p>
            ) : null}
          </div>
        ) : null}

      <CoachWelcomePrimaryCtaBlock />

      {skinReadback ? (
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.06] via-background to-emerald-500/[0.05] shadow-sm">
          <CardContent className="space-y-2 pt-5 pb-5">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="size-4 text-primary" aria-hidden />
              </span>
              <p className="text-sm font-semibold text-foreground">{tCoach("readback")}</p>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
              {skinReadback}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border/60 bg-muted/10">
        <CardContent className="space-y-4 pt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
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
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-border/60 bg-muted/10">
          <CardContent className="space-y-2 pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
              {tReview("skillSection")}
            </p>
            <p className="text-sm font-medium">{skillLabel}</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-muted/10">
          <CardContent className="space-y-2 pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
              {tReview("goalSection")}
            </p>
            <p className="text-sm font-medium">{goalLabel}</p>
          </CardContent>
        </Card>
      </div>

      {data.starter ? (
        data.isGuest ? (
          <GuestReviewRoutineSection data={data} starter={data.starter} />
        ) : (
          <LoggedInReviewRoutineSection data={data} starter={data.starter} />
        )
      ) : null}

      {data.isGuest ? (
        <CoachWelcomeSection delayMs={80}>
          <Card className="border-amber-200/70 bg-amber-50/50 dark:border-amber-500/25 dark:bg-amber-950/30">
            <CardContent className="pt-6 text-sm leading-relaxed text-muted-foreground">
              {tCoach("guestPreviewHint")}
            </CardContent>
          </Card>
        </CoachWelcomeSection>
      ) : null}

      <CoachWelcomeSection delayMs={120}>
        <CoachWelcomeCta isGuest={data.isGuest} />
      </CoachWelcomeSection>

      <CoachWelcomeSection delayMs={160} className="mt-4 border-t border-border/40 pt-6">
        <p className="mb-1 inline-flex w-full items-center gap-2 text-[10px] leading-relaxed text-muted-foreground/70 sm:w-auto">
          <Eye className="size-3 shrink-0" aria-hidden />
          {tReview("readOnlyHint")}
        </p>
        <OnboardingDeleteSection
          isGuest={data.isGuest}
          onDeleted={onDeleted}
          variant="subtle"
        />
      </CoachWelcomeSection>

      {lightboxUrl ? (
        <ReviewPhotoLightbox
          url={lightboxUrl}
          closeLabel={tReview("closePhoto")}
          onClose={closeLightbox}
        />
      ) : null}
      </div>

      <CoachWelcomeStickyBar />
    </>
  );
}

function LoggedInReviewRoutineSection({
  data,
  starter: initialStarter,
}: {
  data: OnboardingReviewData;
  starter: NonNullable<OnboardingReviewData["starter"]>;
}) {
  const tCoach = useTranslations("coachWelcome");

  const initialPending = data.starterRoutinePending === true;
  const { starter, isGeneratingRoutine, showFallbackBanner, routineJustUpdated } =
    useStarterRoutineLive({
      initialStarter,
      initialPending,
      isGuest: false,
    });

  return (
    <section className="space-y-5">
      <ReviewRoutineHeader />
      <StarterRoutineGenerationNotice
        isGeneratingRoutine={isGeneratingRoutine}
        showFallbackBanner={showFallbackBanner}
        isGuest={false}
      />
      <div
        className={cn(
          "rounded-xl border border-border/50 bg-muted/15 p-3 sm:p-4",
          routineJustUpdated &&
            "ring-2 ring-emerald-400/45 bg-emerald-500/[0.06] shadow-md motion-safe:duration-700",
        )}
      >
        <StarterRoutineCards
          starter={starter}
          morningLabel={tCoach("morning")}
          eveningLabel={tCoach("evening")}
          noStepsLabel={tCoach("noSteps")}
          sectionTitle={tCoach("routineSectionTitle")}
          sectionSubtitle={tCoach("routineSectionSub")}
        />
      </div>
      <StarterRoutineSupportExtras starter={starter} />
      <ProductSuggestionsCard
        suggestions={starter.product_suggestions}
        source="starter_routine"
        contextId={
          data.profileId && data.profileId !== GUEST_COACH_PROFILE_ID
            ? data.profileId
            : undefined
        }
        maxVisible={2}
      />
      <StarterRoutineSafetySection starter={starter} />
      {data.profileId && data.profileId !== GUEST_COACH_PROFILE_ID ? (
        <StarterRoutineFeedback profileId={data.profileId} compact />
      ) : null}
    </section>
  );
}

function GuestReviewRoutineSection({
  data,
  starter: initialStarter,
}: {
  data: OnboardingReviewData;
  starter: NonNullable<OnboardingReviewData["starter"]>;
}) {
  const tCoach = useTranslations("coachWelcome");
  const session = readCoachWelcomeSession();
  const initialPending =
    data.starterRoutinePending === true || session?.starterRoutinePending === true;

  const { starter: liveStarter, isGeneratingRoutine, showFallbackBanner, routineJustUpdated } =
    useStarterRoutineLive({
      initialStarter,
      initialPending,
      isGuest: true,
    });

  return (
    <section className="space-y-5">
      <ReviewRoutineHeader />
      <StarterRoutineGenerationNotice
        isGeneratingRoutine={isGeneratingRoutine}
        showFallbackBanner={showFallbackBanner}
        isGuest
      />
      <div
        className={cn(
          "rounded-xl border border-border/50 bg-muted/15 p-3 sm:p-4",
          routineJustUpdated &&
            "ring-2 ring-emerald-400/45 bg-emerald-500/[0.06] shadow-md motion-safe:duration-700",
        )}
      >
        <StarterRoutineCards
          starter={liveStarter}
          morningLabel={tCoach("morning")}
          eveningLabel={tCoach("evening")}
          noStepsLabel={tCoach("noSteps")}
          sectionTitle={tCoach("routineSectionTitle")}
          sectionSubtitle={tCoach("routineSectionSub")}
        />
      </div>
      <StarterRoutineSupportExtras starter={liveStarter} />
      <ProductSuggestionsCard
        suggestions={liveStarter.product_suggestions}
        source="starter_routine"
        maxVisible={2}
      />
      <StarterRoutineSafetySection starter={liveStarter} />
    </section>
  );
}

function ReviewRoutineHeader() {
  const tReview = useTranslations("onboarding.review");
  const tCoach = useTranslations("coachWelcome");

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 space-y-0.5">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 shrink-0 text-primary/70" aria-hidden />
          <h2 className="text-base font-semibold text-foreground/90">{tReview("routineSection")}</h2>
        </div>
        <p className="text-xs text-muted-foreground">{tCoach("routineSectionSub")}</p>
      </div>
      <Link
        href="/onboarding/coach-welcome"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "shrink-0 text-xs")}
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
  eagerLoad = false,
}: {
  urls: string[];
  altLabel: (n: number) => string;
  onOpen: (url: string) => void;
  eagerLoad?: boolean;
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
            eagerLoad={eagerLoad}
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
  eagerLoad = false,
}: {
  src: string;
  alt: string;
  onOpen: () => void;
  eagerLoad?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={failed}
      className="group relative aspect-3/4 w-full overflow-hidden rounded-xl border border-border/80 bg-muted shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70"
    >
      {!loaded && !failed ? (
        <span
          className="absolute inset-0 animate-pulse bg-muted-foreground/10"
          aria-hidden
        />
      ) : null}
      {failed ? (
        <span className="absolute inset-0 flex items-center justify-center px-2 text-center text-xs text-muted-foreground">
          —
        </span>
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading={eagerLoad ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={cn(
          "size-full object-cover transition-opacity duration-200",
          loaded && !failed ? "opacity-100" : "opacity-0",
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
