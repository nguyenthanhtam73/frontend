"use client";

import { useTranslations, useFormatter } from "next-intl";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  RefreshCw,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { GuestCoachWelcomeCta } from "@/components/onboarding/guest-coach-welcome-cta";
import { OnboardingDeleteSection } from "@/components/onboarding/onboarding-delete-section";
import { StarterRoutineCards } from "@/components/onboarding/starter-routine-cards";
import { StarterRoutineGenerationNotice } from "@/components/onboarding/starter-routine-generation-notice";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProductSuggestionsCard } from "@/components/coach/product-suggestions-card";
import { Skeleton } from "@/components/ui/skeleton";
import { FeedbackButtons } from "@/components/ui/feedback-buttons";
import { Link } from "@/i18n/navigation";
import { fetchSkinProfile } from "@/lib/api/profile";
import { getAccessToken } from "@/lib/auth-token";
import { readCoachWelcomeSession } from "@/lib/onboarding/coach-welcome-session";
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
};

function CoachWelcomeLoaded({
  profileId: initialProfileId,
  starter: initialStarter,
  pending: initialPending,
  completedAt,
  isGuest,
  onReload,
}: LoadedCoachWelcome & { onReload: () => void }) {
  const t = useTranslations("coachWelcome");
  const tReview = useTranslations("onboarding.review");
  const formatter = useFormatter();
  const [profileId, setProfileId] = useState(initialProfileId);
  const { starter, isGeneratingRoutine, showFallbackBanner, routineJustUpdated } =
    useStarterRoutineLive({
      initialStarter,
      initialPending,
      isGuest,
    });

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

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <header className="space-y-2 text-center sm:text-left">
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

      <StarterRoutineGenerationNotice
        isGeneratingRoutine={isGeneratingRoutine}
        showFallbackBanner={showFallbackBanner}
        isGuest={isGuest}
      />

      {starter.skin_readback ? (
        <Card>
          <CardContent className="space-y-2 pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("readback")}
            </p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{starter.skin_readback}</p>
          </CardContent>
        </Card>
      ) : null}

      <div
        className={cn(
          "rounded-xl transition-all duration-700 motion-safe:animate-in motion-safe:fade-in",
          routineJustUpdated &&
            "ring-2 ring-emerald-400/45 bg-emerald-500/[0.06] shadow-sm motion-safe:duration-700",
        )}
      >
        <StarterRoutineCards
          starter={starter}
          morningLabel={t("morning")}
          eveningLabel={t("evening")}
          noStepsLabel={t("noSteps")}
        />
      </div>

      {starter.rationale ? (
        <Card>
          <CardContent className="space-y-2 pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("why")}
            </p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{starter.rationale}</p>
          </CardContent>
        </Card>
      ) : null}

      {starter.week_notes ? (
        <Card>
          <CardContent className="space-y-2 pt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("weekNotes")}
            </p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{starter.week_notes}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-emerald-500/20 bg-emerald-500/5">
        <CardContent className="space-y-2 pt-6">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-200">
            <ShieldCheck className="size-4" aria-hidden />
            {t("safety")}
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{starter.safety_notes}</p>
        </CardContent>
      </Card>

      {starter.closing_reminder ? (
        <p className="text-center text-sm font-medium text-muted-foreground">
          {starter.closing_reminder}
        </p>
      ) : null}

      {isGuest && !isGeneratingRoutine ? (
        <GuestCoachWelcomeCta variant={showFallbackBanner ? "fallback" : "ready"} />
      ) : null}

      <ProductSuggestionsCard
        suggestions={starter.product_suggestions}
        source="starter_routine"
        contextId={profileId ?? undefined}
      />

      {profileId && profileId !== GUEST_COACH_PROFILE_ID ? (
        <FeedbackButtons targetType="starter_routine" targetId={profileId} />
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/check-in" className={cn(buttonVariants({ size: "lg" }), "gap-2")}>
          {t("ctaCheckIn")}
          <Send className="size-4" aria-hidden />
        </Link>
        <Link
          href="/onboarding"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
        >
          {tReview("backToReview")}
        </Link>
        <Link href="/" className={cn(buttonVariants({ variant: "ghost", size: "lg" }))}>
          {t("ctaHome")}
        </Link>
      </div>

      <OnboardingDeleteSection isGuest={isGuest} onDeleted={onReload} />
    </div>
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
    if (session?.starterRoutine) {
      setLoaded({
        profileId: session.profileId ?? null,
        starter: session.starterRoutine,
        pending: session.starterRoutinePending === true,
        completedAt: session.reviewSummary?.completed_at ?? null,
        isGuest: session.profileId === GUEST_COACH_PROFILE_ID || !getAccessToken(),
      });
      setLoading(false);
      return;
    }

    const token = getAccessToken();
    if (token) {
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
        return;
      } catch (err) {
        if (err instanceof Error && err.message === "auth") {
          setView("anon");
          return;
        }
        setView("error");
        setErrorMsg(t("errorFetch"));
        return;
      } finally {
        setLoading(false);
      }
    }

    const guestReview = loadGuestReviewFromSession();
    if (guestReview?.starter) {
      setLoaded({
        profileId: guestReview.profileId,
        starter: guestReview.starter,
        pending: guestReview.starterRoutinePending === true,
        completedAt: guestReview.completedAt,
        isGuest: true,
      });
      setLoading(false);
      return;
    }

    setView("anon");
    setLoading(false);
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
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
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
        <div className="flex flex-wrap justify-center gap-2">
          <Link href="/login" className={cn(buttonVariants({ variant: "default" }))}>
            {t("signInCta")}
          </Link>
          <Link href="/onboarding" className={cn(buttonVariants({ variant: "ghost" }))}>
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
