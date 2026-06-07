"use client";

import { useTranslations } from "next-intl";
import {
  AlertCircle,
  Heart,
  Moon,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Sun,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Card, CardContent } from "@/components/ui/card";
import { ProductSuggestionsCard } from "@/components/coach/product-suggestions-card";
import { Skeleton } from "@/components/ui/skeleton";
import { FeedbackButtons } from "@/components/ui/feedback-buttons";
import { Link } from "@/i18n/navigation";
import { apiBaseUrl } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-token";
import type { SkinProfileResponse } from "@/lib/types/profile";
import type { ProductSuggestionDTO } from "@/lib/types/product-suggestion";
import {
  COACH_WELCOME_STORAGE_KEY,
  GUEST_COACH_PROFILE_ID,
  type CoachWelcomePayload,
  type StarterRoutineDTO,
} from "@/lib/types/starter-routine";
import { ONBOARDING_EXIT_ANIM_KEY } from "@/lib/onboarding/constants";
import { cn } from "@/lib/utils";

function numberedList(lines: string[]) {
  return (
    <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-foreground">
      {lines.map((line, i) => (
        <li key={i}>{line}</li>
      ))}
    </ol>
  );
}

function parseSnapshotStarter(
  raw: SkinProfileResponse["onboarding_snapshot"],
): StarterRoutineDTO | null {
  if (raw == null) return null;
  try {
    const snap = typeof raw === "string" ? JSON.parse(raw) : raw;
    const sr = snap?.starter_routine;
    if (!sr || typeof sr !== "object") return null;
    return {
      morning: Array.isArray(sr.morning) ? sr.morning : [],
      evening: Array.isArray(sr.evening) ? sr.evening : [],
      week_notes: String(sr.week_notes ?? ""),
      safety_notes: String(sr.safety_notes ?? ""),
      encouragement: String(sr.encouragement ?? ""),
      skin_readback: String(sr.skin_readback ?? ""),
      rationale: String(sr.rationale ?? ""),
      closing_reminder: String(sr.closing_reminder ?? ""),
      product_suggestions: Array.isArray(sr.product_suggestions)
        ? (sr.product_suggestions as ProductSuggestionDTO[])
        : undefined,
    };
  } catch {
    return null;
  }
}

export function CoachWelcomeClient() {
  const t = useTranslations("coachWelcome");
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [starter, setStarter] = useState<StarterRoutineDTO | null>(null);
  const [visionNotes, setVisionNotes] = useState<string | undefined>();
  const [view, setView] = useState<"ok" | "anon" | "empty" | "error">("ok");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [enterAnim, setEnterAnim] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(ONBOARDING_EXIT_ANIM_KEY)) {
        sessionStorage.removeItem(ONBOARDING_EXIT_ANIM_KEY);
        setEnterAnim(true);
      }
    } catch {
      /* private mode */
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    setView("ok");
    let cachedStarter: StarterRoutineDTO | null = null;
    let cachedProfileId: string | null = null;
    let cachedVision: string | undefined;
    try {
      const raw = sessionStorage.getItem(COACH_WELCOME_STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as CoachWelcomePayload;
        if (p.starterRoutine) {
          cachedProfileId = p.profileId ?? null;
          cachedStarter = p.starterRoutine;
          cachedVision = p.coachingNotes;
          setProfileId(p.profileId ?? null);
          setStarter(p.starterRoutine);
          setVisionNotes(p.coachingNotes);
          setLoading(false);
          return;
        }
      }
    } catch {
      /* fall through to API */
    }

    const token = getAccessToken();
    if (!token) {
      setStarter(null);
      setView("anon");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/profile/skin`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        setStarter(null);
        setView("anon");
        return;
      }
      if (!res.ok) {
        setStarter(null);
        setView("error");
        setErrorMsg(t("errorFetch"));
        return;
      }
      const json = (await res.json().catch(() => ({}))) as {
        data?: SkinProfileResponse;
      };
      const prof = json.data;
      if (prof?.id) {
        setProfileId(prof.id);
        const sr = parseSnapshotStarter(prof.onboarding_snapshot);
        setStarter(sr ?? cachedStarter);
        setVisionNotes(cachedVision);
        if (!sr && !cachedStarter) setView("empty");
      } else if (cachedProfileId && cachedStarter) {
        setProfileId(cachedProfileId);
        setStarter(cachedStarter);
        setVisionNotes(cachedVision);
      } else {
        setStarter(null);
        setView("empty");
      }
    } catch {
      setStarter(null);
      setView("error");
      setErrorMsg(t("errorNetwork"));
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
        <Link
          href="/onboarding"
          className={cn(buttonVariants({ variant: "default" }))}
        >
          {t("backOnboarding")}
        </Link>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-2xl space-y-6",
        enterAnim &&
          "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:slide-in-from-bottom-4 motion-safe:duration-500",
      )}
    >
      <header className="space-y-2 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 rounded-full border bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
          <Sparkles className="size-4" aria-hidden />
          {t("badge")}
        </div>
        <h1 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>

      {visionNotes ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="space-y-2 pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="size-4 shrink-0" aria-hidden />
              {t("visionSection")}
            </div>
            <p className="text-sm leading-relaxed text-foreground">{visionNotes}</p>
          </CardContent>
        </Card>
      ) : null}

      {starter.encouragement ? (
        <Card>
          <CardContent className="space-y-2 pt-6">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Heart className="size-4 text-rose-500" aria-hidden />
              {t("encouragement")}
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{starter.encouragement}</p>
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="overflow-hidden border-amber-500/25 bg-gradient-to-b from-amber-500/5 to-transparent">
          <CardContent className="space-y-3 pt-6">
            <div className="flex items-center gap-2 font-semibold">
              <Sun className="size-5 text-amber-500" aria-hidden />
              {t("morning")}
            </div>
            {starter.morning.length > 0 ? (
              numberedList(starter.morning)
            ) : (
              <p className="text-sm text-muted-foreground">{t("noSteps")}</p>
            )}
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-indigo-500/25 bg-gradient-to-b from-indigo-500/5 to-transparent">
          <CardContent className="space-y-3 pt-6">
            <div className="flex items-center gap-2 font-semibold">
              <Moon className="size-5 text-indigo-500" aria-hidden />
              {t("evening")}
            </div>
            {starter.evening.length > 0 ? (
              numberedList(starter.evening)
            ) : (
              <p className="text-sm text-muted-foreground">{t("noSteps")}</p>
            )}
          </CardContent>
        </Card>
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

      <div className="flex flex-col gap-3 pb-8 sm:flex-row sm:justify-center">
        <Link
          href="/check-in"
          className={cn(buttonVariants({ size: "lg" }), "gap-2")}
        >
          {t("ctaCheckIn")}
          <Send className="size-4" aria-hidden />
        </Link>
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "ghost", size: "lg" }))}
        >
          {t("ctaHome")}
        </Link>
      </div>
    </div>
  );
}
