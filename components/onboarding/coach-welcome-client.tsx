"use client";

import { useTranslations, useFormatter } from "next-intl";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Loader2,
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
const ROUTINE_HIGHLIGHT_MS = 2200;

function routineFingerprint(r: StarterRoutineDTO): string {
  return JSON.stringify({
    morning: r.morning,
    evening: r.evening,
    week_notes: r.week_notes,
    encouragement: r.encouragement,
    rationale: r.rationale,
    skin_readback: r.skin_readback,
  });
}

export function CoachWelcomeClient() {
  const t = useTranslations("coachWelcome");
  const tReview = useTranslations("onboarding.review");
  const formatter = useFormatter();
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [starter, setStarter] = useState<StarterRoutineDTO | null>(null);
  const [isGeneratingRoutine, setIsGeneratingRoutine] = useState(false);
  const [showFallbackBanner, setShowFallbackBanner] = useState(false);
  const [routineJustUpdated, setRoutineJustUpdated] = useState(false);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const initialRoutineRef = useRef<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isGeneratingRef = useRef(false);
  const [isGuest, setIsGuest] = useState(false);
  const [view, setView] = useState<"ok" | "anon" | "empty" | "error">("ok");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const triggerRoutineHighlight = useCallback(() => {
    setRoutineJustUpdated(true);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => {
      setRoutineJustUpdated(false);
    }, ROUTINE_HIGHLIGHT_MS);
  }, []);

  const applyStarterFromAi = useCallback(
    (next: StarterRoutineDTO, opts: { upgraded: boolean; fallback?: boolean }) => {
      setStarter(next);
      isGeneratingRef.current = false;
      setIsGeneratingRoutine(false);
      if (opts.upgraded) {
        setShowFallbackBanner(false);
        triggerRoutineHighlight();
      } else if (opts.fallback) {
        setShowFallbackBanner(true);
      }
    },
    [triggerRoutineHighlight],
  );

  const beginAiTracking = useCallback((routine: StarterRoutineDTO, pending: boolean) => {
    initialRoutineRef.current = routineFingerprint(routine);
    isGeneratingRef.current = pending;
    setIsGeneratingRoutine(pending);
    if (pending) setShowFallbackBanner(false);
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
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
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
        const baseline = initialRoutineRef.current;
        const upgraded =
          Boolean(baseline) &&
          routineFingerprint(patch.starterRoutine) !== baseline;

        if (patch.starterRoutinePending === true) {
          setStarter(patch.starterRoutine);
          beginAiTracking(patch.starterRoutine, true);
          return;
        }

        applyStarterFromAi(patch.starterRoutine, {
          upgraded,
          fallback: isGeneratingRef.current && !upgraded,
        });

        try {
          const raw = sessionStorage.getItem(COACH_WELCOME_STORAGE_KEY);
          if (raw) {
            const p = JSON.parse(raw) as CoachWelcomePayload;
            sessionStorage.setItem(
              COACH_WELCOME_STORAGE_KEY,
              JSON.stringify({
                ...p,
                ...patch,
                starterRoutinePending: false,
              }),
            );
          }
        } catch {
          /* ignore storage errors */
        }
        return;
      }

      if (patch.starterRoutinePending === false) {
        isGeneratingRef.current = false;
        setIsGeneratingRoutine(false);
      }
    };
    window.addEventListener(COACH_WELCOME_SESSION_EVENT, onSessionPatch);
    return () => window.removeEventListener(COACH_WELCOME_SESSION_EVENT, onSessionPatch);
  }, [applyStarterFromAi, beginAiTracking]);

  useEffect(() => {
    if (!isGeneratingRoutine || isGuest || !getAccessToken()) return;

    let cancelled = false;
    const poll = async () => {
      for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS && !cancelled; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        if (cancelled) return;
        try {
          const prof = await fetchSkinProfile();
          if (!prof) continue;
          if (isStarterRoutinePending(prof.onboarding_snapshot)) continue;
          const sr = parseSnapshotStarter(prof.onboarding_snapshot);
          if (!sr) continue;

          const baseline = initialRoutineRef.current ?? routineFingerprint(sr);
          const upgraded = routineFingerprint(sr) !== baseline;

          setProfileId(prof.id);
          applyStarterFromAi(sr, { upgraded, fallback: !upgraded });

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
        isGeneratingRef.current = false;
        setIsGeneratingRoutine(false);
        setShowFallbackBanner(true);
      }
    };

    void poll();
    return () => {
      cancelled = true;
    };
  }, [applyStarterFromAi, isGeneratingRoutine, isGuest]);

  useEffect(() => {
    if (!isGeneratingRoutine || !isGuest) return;

    const timeoutMs = POLL_INTERVAL_MS * POLL_MAX_ATTEMPTS;
    const timer = setTimeout(() => {
      isGeneratingRef.current = false;
      setIsGeneratingRoutine(false);
      setShowFallbackBanner(true);
    }, timeoutMs);

    return () => clearTimeout(timer);
  }, [isGeneratingRoutine, isGuest]);

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

      {isGeneratingRoutine ? (
        <p
          className="flex items-center justify-center gap-2 text-xs leading-relaxed text-muted-foreground sm:justify-start"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground/80" aria-hidden />
          {t("starterGenerating")}
        </p>
      ) : null}

      {showFallbackBanner ? (
        <div
          className="rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2.5 text-sm leading-relaxed text-amber-950/80 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-100/90"
          role="status"
        >
          {t("starterFallbackNotice")}
        </div>
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
