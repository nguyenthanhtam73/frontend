"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslations, useFormatter } from "next-intl";
import {
  AlertCircle,
  Eye,
  RefreshCw,
} from "lucide-react";

import { ProductSuggestionsCard } from "@/components/coach/product-suggestions-card";
import {
  CoachWelcomeCta,
  CoachWelcomePrimaryCtaBlock,
  CoachWelcomeStickyBar,
} from "@/components/onboarding/coach-welcome-cta";
import {
  CoachWelcomeCelebrationHeader,
} from "@/components/onboarding/coach-welcome-payoff";
import {
  CoachWelcomeSection,
} from "@/components/onboarding/coach-welcome-section";
import { CoachWelcomeSkinReadback } from "@/components/onboarding/coach-welcome-skin-readback";
import { OnboardingDeleteSection } from "@/components/onboarding/onboarding-delete-section";
import {
  StarterRoutineCards,
  starterHasFoldableGuidance,
} from "@/components/onboarding/starter-routine-cards";
import {
  StarterRoutineSafetySection,
  StarterRoutineSupportExtras,
} from "@/components/onboarding/starter-routine-extras";
import { StarterRoutineFeedback } from "@/components/onboarding/starter-routine-feedback";
import { StarterRoutineGenerationNotice } from "@/components/onboarding/starter-routine-generation-notice";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { apiBaseUrl } from "@/lib/api";
import { fetchSkinProfile } from "@/lib/api/profile";
import { getAccessToken } from "@/lib/auth-token";
import { readCoachWelcomeSession, isGuestCoachSession } from "@/lib/onboarding/coach-welcome-session";
import { buildCoachWelcomeFromProfile } from "@/lib/onboarding/coach-welcome-from-profile";
import { normalizeReviewPhotoUrls } from "@/lib/onboarding/photo-session-urls";
import { isOnboardingComplete } from "@/lib/onboarding/snapshot";
import { loadGuestReviewFromSession } from "@/lib/onboarding/review-data";
import { useStarterRoutineLive } from "@/lib/onboarding/use-starter-routine-live";
import { consumeJustCompletedOnboarding } from "@/lib/stores/onboarding-store";
import {
  COACH_WELCOME_SESSION_EVENT,
  GUEST_COACH_PROFILE_ID,
  type CoachWelcomePayload,
  type StarterRoutineDTO,
} from "@/lib/types/starter-routine";
import { cn } from "@/lib/utils";

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

type LoadedCoachWelcome = {
  profileId: string | null;
  starter: StarterRoutineDTO;
  pending: boolean;
  completedAt: string | null;
  isGuest: boolean;
  coachingNotes?: string;
  photoUrls?: string[];
  analysisPhase?: string | null;
  analysisSeverity?: string | null;
  analysisRegions?: string[];
  analysisConcerns?: string[];
};

function CoachWelcomeLoaded({
  profileId: initialProfileId,
  starter: initialStarter,
  pending: initialPending,
  completedAt,
  isGuest,
  coachingNotes,
  photoUrls: initialPhotoUrls,
  analysisPhase: initialPhase,
  analysisSeverity: initialSeverity,
  analysisRegions: initialRegions,
  analysisConcerns: initialConcerns,
}: LoadedCoachWelcome) {
  const t = useTranslations("coachWelcome");
  const tReview = useTranslations("onboarding.review");
  const formatter = useFormatter();
  const [profileId, setProfileId] = useState(initialProfileId);
  const [livePhotoUrls, setLivePhotoUrls] = useState<string[] | null>(null);
  const [idbPhotoUrls, setIdbPhotoUrls] = useState<string[]>([]);
  const [retryAiLoading, setRetryAiLoading] = useState(false);
  const {
    starter,
    isGeneratingRoutine,
    showFallbackBanner,
    routineJustUpdated,
    retryAiGeneration,
  } = useStarterRoutineLive({
    initialStarter,
    initialPending,
    isGuest,
  });
  const session = readCoachWelcomeSession();
  const showRetryAi =
    (showFallbackBanner || session?.usedDefaultRoutine === true) && !isGeneratingRoutine;
  const analysis = session?.reviewSummary?.skin_analysis;

  useEffect(() => {
    setProfileId(initialProfileId);
  }, [initialProfileId]);

  useEffect(() => {
    const onSessionPatch = (event: Event) => {
      const patch = (event as CustomEvent<Partial<CoachWelcomePayload>>).detail;
      if (patch?.profileId) setProfileId(patch.profileId);
      const nextPhotos = patch?.reviewSummary?.photo_urls;
      if (nextPhotos?.length) {
        setLivePhotoUrls(
          normalizeReviewPhotoUrls(nextPhotos).map(absUploadUrl),
        );
        setIdbPhotoUrls((prev) => {
          for (const u of prev) {
            if (u.startsWith("blob:")) {
              try {
                URL.revokeObjectURL(u);
              } catch {
                /* ignore */
              }
            }
          }
          return [];
        });
      }
    };
    window.addEventListener(COACH_WELCOME_SESSION_EVENT, onSessionPatch);
    return () =>
      window.removeEventListener(COACH_WELCOME_SESSION_EVENT, onSessionPatch);
  }, []);

  const completedLabel = (() => {
    if (!completedAt) return "";
    const d = new Date(completedAt);
    if (Number.isNaN(d.getTime())) return "";
    return formatter.dateTime(d, { dateStyle: "long", timeStyle: "short" });
  })();

  const skinReadback =
    coachingNotes?.trim() || starter.skin_readback?.trim() || "";

  const canFeedback =
    !isGuest && profileId && profileId !== GUEST_COACH_PROFILE_ID;

  const guestVariant = showFallbackBanner ? "fallback" : "ready";

  const photoUrls = useMemo(() => {
    if (livePhotoUrls?.length) return livePhotoUrls;
    const fromProps = initialPhotoUrls?.length
      ? initialPhotoUrls
      : normalizeReviewPhotoUrls(session?.reviewSummary?.photo_urls ?? []);
    return fromProps.map(absUploadUrl);
  }, [
    livePhotoUrls,
    initialPhotoUrls,
    session?.reviewSummary?.photo_urls,
  ]);

  useEffect(() => {
    const shouldLoadIdb =
      Boolean(session?.guestPhotosIdb) ||
      (isGuest &&
        session?.reviewSummary?.photos_skipped !== true &&
        photoUrls.length === 0);
    if (!shouldLoadIdb || photoUrls.length > 0) return;
    if (session?.reviewSummary?.photos_skipped === true) return;
    let cancelled = false;
    let created: string[] = [];
    void (async () => {
      const { loadGuestClaimPhotos, revokeGuestPhotoPreviews } = await import(
        "@/lib/onboarding/guest-photo-idb"
      );
      const items = await loadGuestClaimPhotos();
      if (cancelled) {
        revokeGuestPhotoPreviews(items);
        return;
      }
      created = items.map((p) => p.preview);
      setIdbPhotoUrls(created);
    })();
    return () => {
      cancelled = true;
      for (const u of created) {
        if (u.startsWith("blob:")) {
          try {
            URL.revokeObjectURL(u);
          } catch {
            /* ignore */
          }
        }
      }
    };
  }, [
    isGuest,
    session?.guestPhotosIdb,
    session?.reviewSummary?.photos_skipped,
    photoUrls.length,
  ]);

  const displayPhotoUrls = photoUrls.length ? photoUrls : idbPhotoUrls;

  const phaseHint =
    initialPhase || analysis?.phase || null;
  const severityHint =
    initialSeverity || analysis?.severity_level || undefined;
  const regionsHint =
    initialRegions?.length
      ? initialRegions
      : analysis?.primary_regions;
  const concernsHint =
    initialConcerns?.length
      ? initialConcerns
      : analysis?.main_concerns?.length
        ? analysis.main_concerns
        : analysis?.concern_types;

  return (
    <>
      <div className="mx-auto w-full max-w-2xl space-y-4 pb-24 sm:space-y-5 sm:pb-6">
        <CoachWelcomeSection>
          <CoachWelcomeCelebrationHeader />
        </CoachWelcomeSection>

        <CoachWelcomeSection delayMs={40}>
          <StarterRoutineGenerationNotice
            isGeneratingRoutine={isGeneratingRoutine}
            showFallbackBanner={showFallbackBanner}
            showRetryAi={showRetryAi}
            isGuest={isGuest}
            retryLoading={retryAiLoading}
            onRetryAi={() => {
              setRetryAiLoading(true);
              void retryAiGeneration().finally(() => setRetryAiLoading(false));
            }}
          />
        </CoachWelcomeSection>

        <CoachWelcomeSection delayMs={80} id="coach-welcome-routine">
          <div
            className={cn(
              "space-y-0",
              "transition-all duration-700 motion-safe:animate-in motion-safe:fade-in",
              routineJustUpdated &&
                "rounded-xl bg-emerald-500/[0.06] p-2 shadow-md ring-2 ring-emerald-400/45 motion-safe:duration-700 sm:p-3",
            )}
          >
            <StarterRoutineCards
              starter={starter}
              noStepsLabel={t("noSteps")}
              featured
              sectionTitle={t("routineSectionTitle")}
              sectionSubtitle={t("routineSectionSub")}
              carePhaseHint={phaseHint}
              concerns={concernsHint}
              severity={severityHint}
              regions={regionsHint}
              skinType={session?.reviewSummary?.skin_type}
            />
          </div>
        </CoachWelcomeSection>

        <CoachWelcomeSection delayMs={100}>
          <CoachWelcomePrimaryCtaBlock isGuest={isGuest} />
        </CoachWelcomeSection>

        {skinReadback ? (
          <CoachWelcomeSection delayMs={120}>
            <CoachWelcomeSkinReadback
              text={skinReadback}
              photos={displayPhotoUrls.length ? displayPhotoUrls : undefined}
              phaseHint={phaseHint}
            />
          </CoachWelcomeSection>
        ) : null}

        <StarterRoutineSupportExtras
          starter={starter}
          delayMs={160}
          skinReadback={skinReadback}
        />

        {!starterHasFoldableGuidance(starter) &&
        starter.product_suggestions &&
        starter.product_suggestions.length > 0 ? (
          <CoachWelcomeSection delayMs={200}>
            <ProductSuggestionsCard
              suggestions={starter.product_suggestions}
              source="starter_routine"
              contextId={profileId ?? undefined}
              maxVisible={2}
            />
          </CoachWelcomeSection>
        ) : null}

        <StarterRoutineSafetySection starter={starter} delayMs={240} />

        {canFeedback ? (
          <CoachWelcomeSection delayMs={280}>
            <StarterRoutineFeedback profileId={profileId} compact />
          </CoachWelcomeSection>
        ) : null}

        <CoachWelcomeSection delayMs={320}>
          <CoachWelcomeCta isGuest={isGuest} guestVariant={guestVariant} />
        </CoachWelcomeSection>

        <CoachWelcomeSection delayMs={360} className="mt-4 border-t border-border/40 pt-6">
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
            isGuest={isGuest}
            variant="subtle"
          />
        </CoachWelcomeSection>
      </div>

      <CoachWelcomeStickyBar isGuest={isGuest} />
    </>
  );
}

export function CoachWelcomeClient() {
  const t = useTranslations("coachWelcome");
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState<LoadedCoachWelcome | null>(null);
  const [view, setView] = useState<"ok" | "anon" | "empty" | "error">("ok");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    consumeJustCompletedOnboarding();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    setView("ok");
    setLoaded(null);

    const session = readCoachWelcomeSession();
    const token = getAccessToken();

    if (session?.starterRoutine) {
      const isGuest = isGuestCoachSession(session, Boolean(token));
      const sessionNotes =
        session.coachingNotes?.trim() ||
        session.reviewSummary?.skin_analysis?.coaching_notes?.trim() ||
        session.starterRoutine.skin_readback?.trim() ||
        "";
      const sessionPhotos = normalizeReviewPhotoUrls(
        session.reviewSummary?.photo_urls ?? [],
      );

      // Logged-in + thin session: enrich notes/photos from persisted profile.
      // Treat skin_readback-only as "thin" so we still pull richer coaching_notes.
      const hasRichSessionNotes = Boolean(
        session.coachingNotes?.trim() ||
          session.reviewSummary?.skin_analysis?.coaching_notes?.trim(),
      );
      if (token && !isGuest && (!hasRichSessionNotes || sessionPhotos.length === 0)) {
        try {
          const prof = await fetchSkinProfile();
          if (prof && isOnboardingComplete(prof)) {
            const fromProf = buildCoachWelcomeFromProfile(prof);
            if (fromProf) {
              setLoaded({
                profileId: fromProf.profileId,
                starter: session.starterRoutine,
                pending: session.starterRoutinePending === true || fromProf.pending,
                completedAt:
                  session.reviewSummary?.completed_at ?? fromProf.completedAt,
                isGuest: false,
                coachingNotes: hasRichSessionNotes
                  ? sessionNotes
                  : fromProf.coachingNotes || sessionNotes || undefined,
                photoUrls:
                  sessionPhotos.length > 0 ? sessionPhotos : fromProf.photoUrls,
                analysisPhase:
                  session.reviewSummary?.skin_analysis?.phase ??
                  fromProf.analysisPhase,
                analysisSeverity:
                  session.reviewSummary?.skin_analysis?.severity_level ??
                  fromProf.analysisHints.severity,
                analysisRegions:
                  session.reviewSummary?.skin_analysis?.primary_regions ??
                  fromProf.analysisHints.regions,
                analysisConcerns:
                  (session.reviewSummary?.skin_analysis?.main_concerns
                    ?.length
                    ? session.reviewSummary.skin_analysis.main_concerns
                    : undefined) ?? fromProf.analysisHints.concerns,
              });
              setLoading(false);
              return;
            }
          }
        } catch {
          /* fall through to session-only */
        }
      }

      setLoaded({
        profileId: session.profileId ?? null,
        starter: session.starterRoutine,
        pending: session.starterRoutinePending === true,
        completedAt: session.reviewSummary?.completed_at ?? null,
        isGuest,
        coachingNotes: sessionNotes || undefined,
        photoUrls: sessionPhotos,
        analysisPhase: session.reviewSummary?.skin_analysis?.phase ?? null,
      });
      setLoading(false);
      return;
    }

    if (!token) {
      const guestReview = loadGuestReviewFromSession();
      if (guestReview?.starter) {
        const guestSession = readCoachWelcomeSession();
        const analysis = guestSession?.reviewSummary?.skin_analysis;
        setLoaded({
          profileId: guestReview.profileId,
          starter: guestReview.starter,
          pending: guestReview.starterRoutinePending === true,
          completedAt: guestReview.completedAt,
          isGuest: true,
          coachingNotes: guestReview.coachingNotes,
          photoUrls: guestReview.photoUrls,
          analysisPhase: analysis?.phase ?? null,
          analysisSeverity: analysis?.severity_level ?? null,
          analysisRegions: analysis?.primary_regions,
          analysisConcerns: analysis?.main_concerns?.length
            ? analysis.main_concerns
            : guestReview.concerns,
        });
        setLoading(false);
        return;
      }

      setView("anon");
      setLoading(false);
      return;
    }

    try {
      const prof = await fetchSkinProfile();
      if (prof && isOnboardingComplete(prof)) {
        const fromProf = buildCoachWelcomeFromProfile(prof);
        if (fromProf) {
          setLoaded({
            profileId: fromProf.profileId,
            starter: fromProf.starter,
            pending: fromProf.pending,
            completedAt: fromProf.completedAt,
            isGuest: false,
            coachingNotes: fromProf.coachingNotes,
            photoUrls: fromProf.photoUrls,
            analysisPhase: fromProf.analysisPhase,
            analysisSeverity: fromProf.analysisHints.severity,
            analysisRegions: fromProf.analysisHints.regions,
            analysisConcerns: fromProf.analysisHints.concerns,
          });
          return;
        }
      }
      setView("empty");
    } catch (err) {
      if (err instanceof Error && err.message === "auth") {
        setView("anon");
        return;
      }
      setView("error");
      setErrorMsg(t("errorFetch"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-6" role="status" aria-live="polite">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-4 w-full max-w-md rounded-md" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
        <p className="sr-only">{t("loading")}</p>
      </div>
    );
  }

  if (view === "error") {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <div className="inline-flex items-center gap-2 text-sm font-medium text-destructive" role="alert">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {errorMsg ?? t("errorFetch")}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
        >
          <RefreshCw className="size-4" aria-hidden />
          {t("retry")}
        </button>
      </div>
    );
  }

  if (view === "anon") {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <p className="text-muted-foreground">{t("needSignIn")}</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href="/login" className={cn(buttonVariants({ variant: "default", size: "lg" }), "w-full sm:w-auto")}>
            {t("signInCta")}
          </Link>
          <Link href="/onboarding" className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "w-full sm:w-auto")}>
            {t("backOnboarding")}
          </Link>
        </div>
      </div>
    );
  }

  if (!loaded || view === "empty") {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <p className="text-muted-foreground">{t("empty")}</p>
        <Link href="/onboarding" className={cn(buttonVariants({ variant: "default" }))}>
          {t("backOnboarding")}
        </Link>
      </div>
    );
  }

  return <CoachWelcomeLoaded {...loaded} />;
}
