"use client";

import { useTranslations, useFormatter } from "next-intl";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ProductSuggestionsCard } from "@/components/coach/product-suggestions-card";
import {
  CoachWelcomeCta,
  CoachWelcomePrimaryCta,
  CoachWelcomeStickyBar,
} from "@/components/onboarding/coach-welcome-cta";
import {
  CoachWelcomeSection,
} from "@/components/onboarding/coach-welcome-section";
import { OnboardingDeleteSection } from "@/components/onboarding/onboarding-delete-section";
import { StarterRoutineCards } from "@/components/onboarding/starter-routine-cards";
import {
  StarterRoutineSafetySection,
  StarterRoutineSupportExtras,
} from "@/components/onboarding/starter-routine-extras";
import { StarterRoutineFeedback } from "@/components/onboarding/starter-routine-feedback";
import { StarterRoutineGenerationNotice } from "@/components/onboarding/starter-routine-generation-notice";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { fetchSkinProfile } from "@/lib/api/profile";
import { getAccessToken } from "@/lib/auth-token";
import { readCoachWelcomeSession, isGuestCoachSession } from "@/lib/onboarding/coach-welcome-session";
import { isOnboardingComplete, isStarterRoutinePending, parseSnapshotStarter } from "@/lib/onboarding/snapshot";
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

type LoadedCoachWelcome = {
  profileId: string | null;
  starter: StarterRoutineDTO;
  pending: boolean;
  completedAt: string | null;
  isGuest: boolean;
  coachingNotes?: string;
};

function CoachWelcomeLoaded({
  profileId: initialProfileId,
  starter: initialStarter,
  pending: initialPending,
  completedAt,
  isGuest,
  coachingNotes,
  onReload,
}: LoadedCoachWelcome & { onReload: () => void }) {
  const t = useTranslations("coachWelcome");
  const tReview = useTranslations("onboarding.review");
  const formatter = useFormatter();
  const [profileId, setProfileId] = useState(initialProfileId);
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

  useEffect(() => {
    setProfileId(initialProfileId);
  }, [initialProfileId]);

  useEffect(() => {
    const onSessionPatch = (event: Event) => {
      const patch = (event as CustomEvent<Partial<CoachWelcomePayload>>).detail;
      if (patch?.profileId) setProfileId(patch.profileId);
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

  return (
    <>
      <div className="mx-auto w-full max-w-2xl space-y-5 pb-24 sm:space-y-6 sm:pb-6">
        <CoachWelcomeSection>
          <header className="space-y-2.5 text-center sm:space-y-3 sm:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="size-4" aria-hidden />
              {tReview("badge")}
            </div>
            <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
              {t("celebrationTitle")}
            </h1>
            <p className="text-sm font-medium leading-snug text-foreground sm:text-base">
              {t("celebrationLine")}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">{t("introLine")}</p>
            {completedLabel ? (
              <p className="text-xs text-muted-foreground">
                {tReview("completedOn", { date: completedLabel })}
              </p>
            ) : null}
          </header>
        </CoachWelcomeSection>

        {skinReadback ? (
          <CoachWelcomeSection delayMs={40}>
            <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.06] via-background to-emerald-500/[0.05] shadow-sm">
              <CardContent className="space-y-2 pt-5 pb-5">
                <div className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="size-4 text-primary" aria-hidden />
                  </span>
                  <p className="text-sm font-semibold text-foreground">{t("readback")}</p>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                  {skinReadback}
                </p>
              </CardContent>
            </Card>
          </CoachWelcomeSection>
        ) : null}

        <CoachWelcomeSection delayMs={80}>
          <CoachWelcomePrimaryCta />
        </CoachWelcomeSection>

        <CoachWelcomeSection delayMs={100}>
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

        <CoachWelcomeSection delayMs={140} id="coach-welcome-routine">
          <div
            className={cn(
              "rounded-2xl border border-primary/15 bg-gradient-to-b from-primary/[0.04] to-transparent p-3.5 sm:p-5",
              "transition-all duration-700 motion-safe:animate-in motion-safe:fade-in",
              routineJustUpdated &&
                "bg-emerald-500/[0.06] shadow-md ring-2 ring-emerald-400/45 motion-safe:duration-700",
            )}
          >
            <StarterRoutineCards
              starter={starter}
              morningLabel={t("morning")}
              eveningLabel={t("evening")}
              noStepsLabel={t("noSteps")}
              featured
              sectionTitle={t("routineSectionTitle")}
              sectionSubtitle={t("routineSectionSub")}
            />
          </div>
        </CoachWelcomeSection>

        <StarterRoutineSupportExtras starter={starter} delayMs={200} />

        <CoachWelcomeSection delayMs={260}>
          <ProductSuggestionsCard
            suggestions={starter.product_suggestions}
            source="starter_routine"
            contextId={profileId ?? undefined}
            maxVisible={2}
          />
        </CoachWelcomeSection>

        <StarterRoutineSafetySection starter={starter} delayMs={320} />

        {canFeedback ? (
          <CoachWelcomeSection delayMs={380}>
            <StarterRoutineFeedback profileId={profileId} compact />
          </CoachWelcomeSection>
        ) : null}

        <CoachWelcomeSection delayMs={420}>
          <CoachWelcomeCta isGuest={isGuest} guestVariant={guestVariant} />
        </CoachWelcomeSection>

        <CoachWelcomeSection delayMs={460} className="pt-1">
          <p className="mb-2 inline-flex w-full items-center gap-2 text-xs text-muted-foreground sm:w-auto">
            <Eye className="size-3.5 shrink-0" aria-hidden />
            {tReview("readOnlyHint")}
          </p>
          <OnboardingDeleteSection
            isGuest={isGuest}
            onDeleted={onReload}
            className="mt-2 border-0 bg-transparent p-0"
          />
        </CoachWelcomeSection>
      </div>

      <CoachWelcomeStickyBar />
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
      setLoaded({
        profileId: session.profileId ?? null,
        starter: session.starterRoutine,
        pending: session.starterRoutinePending === true,
        completedAt: session.reviewSummary?.completed_at ?? null,
        isGuest,
        coachingNotes: session.coachingNotes,
      });
      setLoading(false);
      return;
    }

    if (!token) {
      const guestReview = loadGuestReviewFromSession();
      if (guestReview?.starter) {
        setLoaded({
          profileId: guestReview.profileId,
          starter: guestReview.starter,
          pending: guestReview.starterRoutinePending === true,
          completedAt: guestReview.completedAt,
          isGuest: true,
          coachingNotes: guestReview.coachingNotes,
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
        const sr = parseSnapshotStarter(prof.onboarding_snapshot);
        if (sr) {
          setLoaded({
            profileId: prof.id,
            starter: sr,
            pending: isStarterRoutinePending(prof.onboarding_snapshot),
            completedAt: prof.updated_at || prof.created_at,
            isGuest: false,
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

  return <CoachWelcomeLoaded {...loaded} onReload={() => void load()} />;
}
