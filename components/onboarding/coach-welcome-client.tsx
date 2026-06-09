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
import { useCallback, useEffect, useRef, useState } from "react";

import { OnboardingDeleteSection } from "@/components/onboarding/onboarding-delete-section";
import { StarterRoutineCards } from "@/components/onboarding/starter-routine-cards";
import { buttonVariants } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Card, CardContent } from "@/components/ui/card";
import { ProductSuggestionsCard } from "@/components/coach/product-suggestions-card";
import { Skeleton } from "@/components/ui/skeleton";
import { FeedbackButtons } from "@/components/ui/feedback-buttons";
import { Link } from "@/i18n/navigation";
import { fetchSkinProfile } from "@/lib/api/profile";
import { getAccessToken } from "@/lib/auth-token";
import { isOnboardingComplete, isStarterRoutinePending, parseSnapshotStarter } from "@/lib/onboarding/snapshot";
import { loadGuestReviewFromSession } from "@/lib/onboarding/review-data";
import { consumeJustCompletedOnboarding } from "@/lib/stores/onboarding-store";
import {
  COACH_WELCOME_SESSION_EVENT,
  COACH_WELCOME_STORAGE_KEY,
  GUEST_COACH_PROFILE_ID,
  type CoachWelcomePayload,
  type StarterRoutineDTO,
} from "@/lib/types/starter-routine";
import { cn } from "@/lib/utils";

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 20;

type AiRoutineStatus = "generating" | "fallback";

function routineFingerprint(r: StarterRoutineDTO): string {
  return JSON.stringify({
    morning: r.morning,
    evening: r.evening,
    week_notes: r.week_notes,
    encouragement: r.encouragement,
    rationale: r.rationale,
  });
}

export function CoachWelcomeClient() {
  const t = useTranslations("coachWelcome");
  const tReview = useTranslations("onboarding.review");
  const formatter = useFormatter();
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [starter, setStarter] = useState<StarterRoutineDTO | null>(null);
  const [starterRoutinePending, setStarterRoutinePending] = useState(false);
  const [aiRoutineStatus, setAiRoutineStatus] = useState<AiRoutineStatus | null>(null);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const initialRoutineRef = useRef<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [view, setView] = useState<"ok" | "anon" | "empty" | "error">("ok");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const beginAiTracking = useCallback((starter: StarterRoutineDTO, pending: boolean) => {
    initialRoutineRef.current = routineFingerprint(starter);
    if (pending) {
      setStarterRoutinePending(true);
      setAiRoutineStatus("generating");
    } else {
      setStarterRoutinePending(false);
      setAiRoutineStatus(null);
    }
  }, []);

  const applyReviewData = useCallback(
    (opts: {
      profileId: string | null;
      starter: StarterRoutineDTO;
      completedAt: string | null;
      isGuest: boolean;
    }) => {
      setProfileId(opts.profileId);
      setStarter(opts.starter);
      setCompletedAt(opts.completedAt);
      setIsGuest(opts.isGuest);
      setView("ok");
    },
    [],
  );

  useEffect(() => {
    consumeJustCompletedOnboarding();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    setView("ok");

    try {
      const raw = sessionStorage.getItem(COACH_WELCOME_STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as CoachWelcomePayload;
        if (p.starterRoutine) {
          applyReviewData({
            profileId: p.profileId ?? null,
            starter: p.starterRoutine,
            completedAt: p.reviewSummary?.completed_at ?? null,
            isGuest: p.profileId === GUEST_COACH_PROFILE_ID,
          });
          beginAiTracking(p.starterRoutine, p.starterRoutinePending === true);
          setLoading(false);
          return;
        }
      }
    } catch {
      /* fall through */
    }

    const token = getAccessToken();
    if (token) {
      try {
        const prof = await fetchSkinProfile();
        if (prof && isOnboardingComplete(prof)) {
          const sr = parseSnapshotStarter(prof.onboarding_snapshot);
          if (sr) {
            applyReviewData({
              profileId: prof.id,
              starter: sr,
              completedAt: prof.updated_at || prof.created_at,
              isGuest: false,
            });
            beginAiTracking(sr, isStarterRoutinePending(prof.onboarding_snapshot));
            return;
          }
        }
        setStarter(null);
        setView("empty");
        return;
      } catch (err) {
        if (err instanceof Error && err.message === "auth") {
          setStarter(null);
          setView("anon");
          return;
        }
        setStarter(null);
        setView("error");
        setErrorMsg(t("errorFetch"));
        return;
      } finally {
        setLoading(false);
      }
    }

    const guestReview = loadGuestReviewFromSession();
    if (guestReview?.starter) {
      applyReviewData({
        profileId: guestReview.profileId,
        starter: guestReview.starter,
        completedAt: guestReview.completedAt,
        isGuest: guestReview.isGuest,
      });
      setLoading(false);
      return;
    }

    setStarter(null);
    setView("anon");
    setLoading(false);
  }, [applyReviewData, beginAiTracking, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onSessionPatch = (event: Event) => {
      const patch = (event as CustomEvent<Partial<CoachWelcomePayload>>).detail;
      if (!patch) return;
      if (patch.profileId) setProfileId(patch.profileId);
      if (patch.starterRoutine) {
        setStarter(patch.starterRoutine);
        if (patch.starterRoutinePending === true) {
          beginAiTracking(patch.starterRoutine, true);
        } else if (patch.starterRoutinePending === false) {
          setStarterRoutinePending(false);
          setAiRoutineStatus(null);
        }
      } else if (patch.starterRoutinePending === false) {
        setStarterRoutinePending(false);
        setAiRoutineStatus(null);
      }
    };
    window.addEventListener(COACH_WELCOME_SESSION_EVENT, onSessionPatch);
    return () => window.removeEventListener(COACH_WELCOME_SESSION_EVENT, onSessionPatch);
  }, [beginAiTracking]);

  useEffect(() => {
    if (!starterRoutinePending || isGuest || !getAccessToken()) return;

    let cancelled = false;
    const poll = async () => {
      for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS && !cancelled; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        if (cancelled) return;
        try {
          const prof = await fetchSkinProfile();
          if (!prof) continue;
          const pending = isStarterRoutinePending(prof.onboarding_snapshot);
          const sr = parseSnapshotStarter(prof.onboarding_snapshot);
          if (!sr) continue;

          if (pending) continue;

          const baseline = initialRoutineRef.current ?? routineFingerprint(sr);
          const upgraded = routineFingerprint(sr) !== baseline;

          setStarter(sr);
          setProfileId(prof.id);
          setStarterRoutinePending(false);
          setAiRoutineStatus(upgraded ? null : "fallback");

          try {
            const raw = sessionStorage.getItem(COACH_WELCOME_STORAGE_KEY);
            if (raw) {
              const p = JSON.parse(raw) as CoachWelcomePayload;
              sessionStorage.setItem(
                COACH_WELCOME_STORAGE_KEY,
                JSON.stringify({
                  ...p,
                  profileId: prof.id,
                  starterRoutine: sr,
                  starterRoutinePending: false,
                }),
              );
            }
          } catch {
            /* ignore storage errors */
          }
          return;
        } catch {
          /* keep polling */
        }
      }
      if (!cancelled) {
        setStarterRoutinePending(false);
        setAiRoutineStatus("fallback");
      }
    };

    void poll();
    return () => {
      cancelled = true;
    };
  }, [starterRoutinePending, isGuest]);

  const completedLabel = (() => {
    if (!completedAt) return "";
    const d = new Date(completedAt);
    if (Number.isNaN(d.getTime())) return "";
    return formatter.dateTime(d, { dateStyle: "long", timeStyle: "short" });
  })();

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

  if (!starter || view === "empty") {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <p className="text-muted-foreground">{t("empty")}</p>
        <Link href="/onboarding" className={cn(buttonVariants({ variant: "default" }))}>
          {t("backOnboarding")}
        </Link>
      </div>
    );
  }

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

      {aiRoutineStatus === "generating" ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground" role="status" aria-live="polite">
          <RefreshCw className="size-3.5 shrink-0 animate-spin" aria-hidden />
          {t("starterGenerating")}
        </p>
      ) : null}

      {aiRoutineStatus === "fallback" ? (
        <Card className="border-amber-200/70 bg-amber-50/50 dark:border-amber-500/25 dark:bg-amber-950/30">
          <CardContent className="pt-6 text-sm leading-relaxed text-muted-foreground">
            {t("starterFallbackNotice")}
          </CardContent>
        </Card>
      ) : null}

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

      <StarterRoutineCards
        starter={starter}
        morningLabel={t("morning")}
        eveningLabel={t("evening")}
        noStepsLabel={t("noSteps")}
      />

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

      {profileId === GUEST_COACH_PROFILE_ID ? (
        <Card className="border-amber-200/70 bg-amber-50/50 dark:border-amber-500/25 dark:bg-amber-950/30">
          <CardContent className="space-y-3 pt-6 text-center sm:text-left">
            <p className="text-sm leading-relaxed text-muted-foreground">{t("guestPreviewHint")}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <ButtonLink href="/register" size="lg" className="min-h-11 flex-1 font-semibold">
                {t("guestRegisterCta")}
              </ButtonLink>
              <ButtonLink href="/login" size="lg" variant="outline" className="min-h-11 flex-1">
                {t("signInCta")}
              </ButtonLink>
            </div>
          </CardContent>
        </Card>
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

      <OnboardingDeleteSection isGuest={isGuest} onDeleted={() => void load()} />
    </div>
  );
}
