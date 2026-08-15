"use client";

import {
  ArrowRight,
  Droplets,
  Eye,
  EyeOff,
  Moon,
  Sparkles,
  Sun,
  Target,
  X,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  CoachWelcomeCelebrationHeader,
} from "@/components/onboarding/coach-welcome-payoff";
import { CoachWelcomeSection } from "@/components/onboarding/coach-welcome-section";
import { CoachWelcomeSkinReadback } from "@/components/onboarding/coach-welcome-skin-readback";
import { OnboardingDeleteSection } from "@/components/onboarding/onboarding-delete-section";
import { StarterRoutineFeedback } from "@/components/onboarding/starter-routine-feedback";
import {
  StarterRoutineSafetySection,
  StarterRoutineSupportExtras,
} from "@/components/onboarding/starter-routine-extras";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IconDismissButton } from "@/components/ui/icon-dismiss-button";
import { Link, useRouter } from "@/i18n/navigation";
import { apiBaseUrl } from "@/lib/api";
import { buildAuthHrefWithNext } from "@/lib/auth/return-path";
import { GUEST_CLAIM_RETURN_PATH } from "@/lib/onboarding/claim-guest-coach-welcome";
import type { OnboardingReviewData } from "@/lib/onboarding/review-data";
import {
  dedupeConcernIds,
  dedupeConcernLabels,
} from "@/lib/onboarding/dedupe-concerns";
import { normalizeReviewPhotoUrls } from "@/lib/onboarding/photo-session-urls";
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

/**
 * Archive / profile summary after onboarding — not a clone of coach-welcome.
 * Full AM/PM routine lives on /onboarding/coach-welcome.
 */
export function OnboardingReview({ data, onDeleted }: OnboardingReviewProps) {
  const t = useTranslations("onboarding");
  const tReview = useTranslations("onboarding.review");
  const tCoach = useTranslations("coachWelcome");
  const tCheckIn = useTranslations("checkIn");
  const formatter = useFormatter();
  const router = useRouter();
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [photosVisible, setPhotosVisible] = useState(false);

  useEffect(() => {
    router.prefetch("/onboarding/coach-welcome");
  }, [router]);

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
  const skinTypeNote = data.skinType
    ? tReview(`skinTypeNote.${data.skinType}` as `skinTypeNote.dry`)
    : undefined;
  const undertoneNote = data.undertone
    ? tReview(`undertoneNote.${data.undertone}` as `undertoneNote.warm`)
    : undefined;
  const goalLabel = data.goal ? t(`goal.${data.goal}` as `goal.glow`) : "—";
  const skillLabel =
    data.skillLevel && data.skillLevel !== "unspecified"
      ? t(`skill.${data.skillLevel as "beginner"}.short`)
      : "—";
  const concernLabels = dedupeConcernLabels(
    dedupeConcernIds(data.concerns).map((id) =>
      (CONCERN_IDS as readonly string[]).includes(id)
        ? t(`aiConcerns.${id as (typeof CONCERN_IDS)[number]}`)
        : id,
    ),
  );

  const photoUrls = useMemo(
    () => normalizeReviewPhotoUrls(data.photoUrls),
    [data.photoUrls],
  );
  const hasPhotos = photoUrls.length > 0;
  const photosLost =
    !data.photosSkipped && data.photoUrls.length > 0 && !hasPhotos;

  const skinReadback =
    data.coachingNotes?.trim() || data.starter?.skin_readback?.trim() || "";

  const closeLightbox = useCallback(() => setLightboxUrl(null), []);

  const amCount = data.starter?.morning.length ?? 0;
  const pmCount = data.starter?.evening.length ?? 0;

  return (
    <>
      <div className="mx-auto w-full max-w-2xl space-y-6 pb-10 sm:space-y-7">
        <header className="space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {tReview("badge")}
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[1.75rem]">
            {tReview("archiveTitle")}
          </h1>
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
            {tReview("archiveSub")}
          </p>
        </header>

        <section
          aria-labelledby="review-skin-heading"
          className="overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-b from-muted/35 to-background"
        >
          <div className="border-b border-border/50 px-4 py-3 sm:px-5">
            <h2
              id="review-skin-heading"
              className="flex items-center gap-2 text-sm font-semibold text-foreground"
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-800 dark:text-emerald-200">
                <Droplets className="size-4" aria-hidden />
              </span>
              {tReview("skinSection")}
            </h2>
          </div>
          <dl className="divide-y divide-border/45">
            <ReviewFactRow
              label={tReview("skinType")}
              value={skinTypeLabel}
              note={skinTypeNote}
            />
            {data.undertone ? (
              <ReviewFactRow
                label={tReview("undertone")}
                value={undertoneLabel}
                note={undertoneNote}
              />
            ) : null}
            {concernLabels.length > 0 ? (
              <div className="px-4 py-3.5 sm:px-5 sm:py-4">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {tReview("concerns")}
                </dt>
                <dd className="mt-2.5 flex flex-wrap gap-2">
                  {concernLabels.map((c) => (
                    <span
                      key={c}
                      className="inline-flex min-h-8 items-center rounded-lg border border-border/80 bg-background px-3 py-1 text-sm font-medium text-foreground shadow-sm"
                    >
                      {c}
                    </span>
                  ))}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          <ReviewHighlightCard
            icon={<Sparkles className="size-4" aria-hidden />}
            label={tReview("skillSection")}
            value={skillLabel}
            tone="amber"
          />
          <ReviewHighlightCard
            icon={<Target className="size-4" aria-hidden />}
            label={tReview("goalSection")}
            value={goalLabel}
            tone="sky"
          />
        </div>

        {data.photosSkipped ? (
          <p className="text-sm text-muted-foreground">{tReview("photosSkipped")}</p>
        ) : hasPhotos ? (
          <section
            aria-label={tReview("photosSection")}
            className="rounded-2xl border border-border/70 bg-muted px-4 py-3.5 sm:px-5"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-foreground">
                {tReview("photosSection")}
                <span className="ml-2 text-xs font-medium text-muted-foreground">
                  ({photoUrls.length})
                </span>
              </p>
              <button
                type="button"
                onClick={() => setPhotosVisible((v) => !v)}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "inline-flex min-h-9 shrink-0 gap-1.5",
                )}
                aria-expanded={photosVisible}
                data-testid="review-toggle-photos"
              >
                {photosVisible ? (
                  <EyeOff className="size-4" aria-hidden />
                ) : (
                  <Eye className="size-4" aria-hidden />
                )}
                {photosVisible ? tReview("hidePhotos") : tReview("showPhotos")}
              </button>
            </div>
            {photosVisible ? (
              <div className="mt-3.5">
                <ReviewPhotoGrid
                  urls={photoUrls}
                  altLabel={(n) => tCheckIn("altPhoto", { n })}
                  eagerLoad
                  onOpen={setLightboxUrl}
                />
              </div>
            ) : (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {tReview("photosHiddenHint")}
              </p>
            )}
          </section>
        ) : photosLost ? (
          <p className="text-sm text-muted-foreground">{tReview("photosExpired")}</p>
        ) : null}

        {skinReadback ? (
          <CoachWelcomeSkinReadback text={skinReadback} alwaysExpanded />
        ) : null}

        {data.starter ? (
          <section
            aria-labelledby="review-routine-cta"
            className="overflow-hidden rounded-2xl border-2 border-primary/35 bg-gradient-to-br from-primary/[0.09] via-background to-amber-500/[0.06] p-4 shadow-sm sm:p-5"
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <h2
                  id="review-routine-cta"
                  className="text-base font-bold tracking-tight text-foreground sm:text-lg"
                >
                  {tReview("routineSummaryTitle")}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {tReview("routineSummaryBody", { am: amCount, pm: pmCount })}
                </p>
                <div className="flex flex-wrap gap-2 pt-0.5">
                  <span className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 text-xs font-semibold text-amber-900 dark:text-amber-100">
                    <Sun className="size-3.5" aria-hidden />
                    {tCoach("morning")}: {amCount}
                  </span>
                  <span className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 text-xs font-semibold text-indigo-900 dark:text-indigo-100">
                    <Moon className="size-3.5" aria-hidden />
                    {tCoach("evening")}: {pmCount}
                  </span>
                </div>
              </div>
              <Link
                href="/onboarding/coach-welcome"
                className={cn(
                  buttonVariants({ variant: "default", size: "lg" }),
                  "inline-flex h-12 w-full gap-2 text-base font-semibold shadow-md sm:h-14 sm:text-[1.05rem]",
                )}
                data-testid="review-view-full-routine"
              >
                {tReview("viewFullRoutine")}
                <ArrowRight className="size-5 shrink-0" aria-hidden />
              </Link>
              <p className="text-center text-xs text-muted-foreground sm:text-left">
                {tReview("viewFullRoutineHint")}
              </p>
            </div>
          </section>
        ) : null}

        {data.starter ? (
          <>
            <StarterRoutineSupportExtras
              starter={data.starter}
              skinReadback={skinReadback}
            />
            <StarterRoutineSafetySection starter={data.starter} />
          </>
        ) : null}

        {data.profileId &&
        data.profileId !== GUEST_COACH_PROFILE_ID &&
        !data.isGuest ? (
          <StarterRoutineFeedback profileId={data.profileId} compact />
        ) : null}

        {data.isGuest ? (
          <CoachWelcomeSection>
            <Card className="border-amber-200/70 bg-amber-50/50 dark:border-amber-500/25 dark:bg-amber-950/30">
              <CardContent className="space-y-3 pt-6 text-sm leading-relaxed text-muted-foreground">
                <p>{tCoach("guestPreviewHint")}</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Link
                    href={buildAuthHrefWithNext("/register", GUEST_CLAIM_RETURN_PATH)}
                    className={cn(
                      buttonVariants({ variant: "default", size: "default" }),
                      "justify-center",
                    )}
                  >
                    {tCoach("guestSaveRoutineCta")}
                  </Link>
                  <Link
                    href={buildAuthHrefWithNext("/login", GUEST_CLAIM_RETURN_PATH)}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "default" }),
                      "justify-center",
                    )}
                  >
                    {tCoach("guestSignInExistingCta")}
                  </Link>
                </div>
              </CardContent>
            </Card>
          </CoachWelcomeSection>
        ) : null}

        <CoachWelcomeSection>
          <div className="flex justify-center">
            <Link
              href="/"
              className="inline-flex min-h-10 items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              {tCoach("ctaHome")}
            </Link>
          </div>
        </CoachWelcomeSection>

        <CoachWelcomeSection className="mt-4 border-t border-border/40 pt-6">
          {completedLabel ? (
            <CoachWelcomeCelebrationHeader
              metaOnly
              completedLabel={tReview("completedOn", { date: completedLabel })}
              className="mb-2"
            />
          ) : null}
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
    </>
  );
}

function ReviewFactRow({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3.5 sm:gap-1.5 sm:px-5 sm:py-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
        <dt className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </dt>
        <dd className="text-base font-semibold leading-snug text-foreground sm:text-right sm:text-[1.05rem]">
          {value}
        </dd>
      </div>
      {note ? (
        <p className="text-sm leading-relaxed text-muted-foreground sm:max-w-[92%] sm:self-end sm:text-right">
          {note}
        </p>
      ) : null}
    </div>
  );
}

function ReviewHighlightCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: "amber" | "sky";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-4 sm:px-5 sm:py-5",
        tone === "amber"
          ? "border-amber-500/25 bg-gradient-to-br from-amber-500/[0.1] to-background"
          : "border-sky-500/25 bg-gradient-to-br from-sky-500/[0.1] to-background",
      )}
    >
      <div className="mb-2.5 flex items-center gap-2">
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-full",
            tone === "amber"
              ? "bg-amber-500/15 text-amber-800 dark:text-amber-100"
              : "bg-sky-500/15 text-sky-800 dark:text-sky-100",
          )}
        >
          {icon}
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="text-lg font-bold leading-snug tracking-tight text-foreground sm:text-xl">
        {value}
      </p>
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
  const closeRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const focusHandle = window.requestAnimationFrame(() => {
      closeRef.current?.focus();
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        closeRef.current?.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.cancelAnimationFrame(focusHandle);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={closeLabel}
      onClick={onClose}
    >
      <IconDismissButton
        ref={closeRef}
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
