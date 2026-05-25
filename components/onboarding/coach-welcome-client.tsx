"use client";

import { useTranslations } from "next-intl";
import {
  Heart,
  Loader2,
  Moon,
  Send,
  ShieldCheck,
  Sparkles,
  Sun,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FeedbackButtons } from "@/components/ui/feedback-buttons";
import { Link } from "@/i18n/navigation";
import { apiBaseUrl } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-token";
import type { SkinProfileResponse } from "@/lib/types/profile";
import {
  COACH_WELCOME_STORAGE_KEY,
  type CoachWelcomePayload,
  type StarterRoutineDTO,
} from "@/lib/types/starter-routine";
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = sessionStorage.getItem(COACH_WELCOME_STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as CoachWelcomePayload;
        if (p.profileId && p.starterRoutine) {
          setProfileId(p.profileId);
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
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/profile/skin`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json().catch(() => ({}))) as {
        data?: SkinProfileResponse;
      };
      const prof = json.data;
      if (prof?.id) {
        setProfileId(prof.id);
        const sr = parseSnapshotStarter(prof.onboarding_snapshot);
        setStarter(sr);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="size-8 animate-spin" aria-hidden />
        <p className="text-sm">{t("loading")}</p>
      </div>
    );
  }

  if (!starter) {
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
    <div className="mx-auto w-full max-w-2xl space-y-6">
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

      {/* Feedback loop on the starter routine — uses the user's profile id
          as the target so subsequent AI calls can pick up early signal. */}
      <FeedbackButtons
        targetType="starter_routine"
        targetId={profileId}
      />

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
