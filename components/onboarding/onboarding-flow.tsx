"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  ImageOff,
  ImagePlus,
  Loader2,
  ShieldCheck,
  Sparkles,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FacePrivacyConsentDialog } from "@/components/privacy/face-privacy-consent-dialog";
import { useConsentGate } from "@/components/privacy/use-consent-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IconDismissButton } from "@/components/ui/icon-dismiss-button";
import { Link, useRouter } from "@/i18n/navigation";
import { apiBaseUrl } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-token";
import { buildLocalizedStarterLines } from "@/lib/i18n/starter-pack-lines";
import { blurFaceInImage, type BlurMethod } from "@/lib/privacy/face-blur";
import {
  COACH_WELCOME_STORAGE_KEY,
  type CoachWelcomePayload,
} from "@/lib/types/starter-routine";
import type { OnboardingSkinAnalyzeDTO } from "@/lib/types/onboarding-ai";
import {
  type BudgetTier,
  type LifeContext,
  type SkillMode,
  type SkinGoal,
  type SkinTypeCard,
  type SkinUndertone,
  useOnboardingStore,
} from "@/lib/stores/onboarding-store";
import { usePrivacyHydrated } from "@/lib/use-privacy-hydrated";
import { usePrivacyStore } from "@/lib/stores/privacy-store";
import { useSkillStore } from "@/lib/stores/skill-store";
import { cn } from "@/lib/utils";

/** Stable IDs aligned with backend onboarding vision schema + i18n `onboarding.aiConcerns.*`. */
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

type OnboardingT = ReturnType<typeof useTranslations<"onboarding">>;

const BARRIER_LABEL_KEYS = ["possibly_compromised", "likely_ok", "unclear"] as const;

function concernChipLabel(t: OnboardingT, id: string) {
  if (!(CONCERN_IDS as readonly string[]).includes(id)) return id;
  return t(`aiConcerns.${id}` as `aiConcerns.${(typeof CONCERN_IDS)[number]}`);
}

function barrierLabel(t: OnboardingT, signal: string) {
  const k = (BARRIER_LABEL_KEYS as readonly string[]).includes(signal)
    ? signal
    : "unclear";
  return t(
    `aiReview.barrierValues.${k}` as
      | "aiReview.barrierValues.possibly_compromised"
      | "aiReview.barrierValues.likely_ok"
      | "aiReview.barrierValues.unclear",
  );
}

const steps = [
  "photos",
  "aiReview",
  "context",
  "budget",
  "goal",
  "skill",
  "summary",
] as const;

const skinTypeOrder: SkinTypeCard[] = [
  "dry",
  "oily",
  "combo",
  "normal",
  "sensitive",
  "prefer_not",
];
const undertoneOrder: SkinUndertone[] = [
  "cool",
  "warm",
  "neutral",
  "deep",
  "fair",
  "prefer_not",
];
const contextOrder: LifeContext[] = [
  "work",
  "study",
  "gym",
  "outdoor",
  "travel",
  "shift_work",
];
const budgetOrder: BudgetTier[] = ["entry", "mid", "flexible"];
const goalOrder: SkinGoal[] = [
  "glow",
  "clear_acne",
  "barrier",
  "anti_aging",
  "unsure",
];
const skillOrder: SkillMode[] = ["beginner", "intermediate", "advanced"];

export function OnboardingFlow() {
  const t = useTranslations("onboarding");
  const tPrivacy = useTranslations("privacy");
  const tAuth = useTranslations("auth");
  const tCheckIn = useTranslations("checkIn");
  const locale = useLocale();
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [aiEditing, setAiEditing] = useState(false);
  const [finishing, setFinishing] = useState(false);
  /**
   * Inline finish-error replaces native `alert()` so:
   *   - mobile users don't get a focus-stealing modal,
   *   - we can offer "Retry" + "Continue without saving" as explicit choices,
   *   - we never navigate to /check-in pretending the save succeeded.
   */
  const [finishError, setFinishError] = useState<
    null | "auth" | "save_failed" | "network"
  >(null);
  /**
   * Tracks per-photo blur progress so the user gets a "Đang làm mờ…" placeholder
   * card instead of seeing the original (unblurred) thumbnail flash up before
   * we replace it. We never insert into `ob.photos` until the blur succeeds.
   */
  const [blurStatus, setBlurStatus] = useState<{
    inflight: number;
    error: string | null;
  }>({ inflight: 0, error: null });
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const ob = useOnboardingStore();
  const setSkillGlobal = useSkillStore((s) => s.setMode);
  const privacyHydrated = usePrivacyHydrated();
  const skipFaceCaptureStored = usePrivacyStore((s) => s.skipFaceCapture);
  const skipFaceCapture = privacyHydrated && skipFaceCaptureStored;
  const setSkipFaceCapture = usePrivacyStore((s) => s.setSkipFaceCapture);
  const consent = useConsentGate();

  useEffect(() => {
    if (steps[idx] === "aiReview" && !ob.aiSnapshot) {
      // Skip-face users should never land on aiReview — their flow goes
      // photos (skip card) → context. If we somehow do land here, drop back
      // to the photos step which will render the skip card instead.
      setIdx(steps.indexOf("photos"));
    }
  }, [idx, ob.aiSnapshot]);

  // Switching INTO skip mode mid-flow: drop any unsent photos so the
  // analyze pipeline can't accidentally run on them later. We pull the slice
  // explicitly (rather than depending on the whole `ob`) so this effect
  // doesn't re-run on every unrelated store mutation.
  const photoCount = useOnboardingStore((s) => s.photos.length);
  const clearPhotos = useOnboardingStore((s) => s.clearPhotos);
  useEffect(() => {
    if (skipFaceCapture && photoCount > 0) {
      clearPhotos();
    }
  }, [skipFaceCapture, photoCount, clearPhotos]);

  const starterBullets = useMemo(
    () => buildLocalizedStarterLines(ob, t),
    [ob, t],
  );

  const step = steps[idx];

  /**
   * Blur for on-screen preview only; originals are uploaded for AI analysis.
   */
  const applyFiles = useCallback(
    async (list: FileList | null) => {
      if (!list?.length) return;
      const remaining = Math.max(0, 3 - ob.photos.length);
      const queue = Array.from(list)
        .filter((f) => f.type.startsWith("image/"))
        .slice(0, remaining);
      if (!queue.length) return;
      setBlurStatus((s) => ({ inflight: s.inflight + queue.length, error: null }));
      for (const file of queue) {
        try {
          const blurred = await blurFaceInImage(file);
          ob.addPhoto({
            file,
            preview: blurred.previewUrl,
            blurMethod: blurred.method,
          });
          setBlurStatus((s) => ({ inflight: Math.max(0, s.inflight - 1), error: s.error }));
        } catch (err) {
          console.warn("[onboarding] face-blur failed", err);
          setBlurStatus((s) => ({
            inflight: Math.max(0, s.inflight - 1),
            error: tPrivacy("captureCard.blurError"),
          }));
        }
      }
    },
    [ob, tPrivacy],
  );

  /** Wraps file-picker triggers with the consent gate so the dialog only
   *  blocks the FIRST photo action; subsequent picks are immediate. */
  const openCamera = useCallback(() => {
    consent.requestCapture(() => cameraRef.current?.click());
  }, [consent]);
  const openLibrary = useCallback(() => {
    consent.requestCapture(() => fileRef.current?.click());
  }, [consent]);

  async function runAnalyze() {
    const token = getAccessToken();
    if (!token) {
      ob.setAnalyzeStatus("error", "auth");
      return;
    }
    if (ob.photos.length < 2) return;
    ob.setAnalyzeStatus("loading");
    try {
      const fd = new FormData();
      ob.photos.forEach((p) => fd.append("images", p.file));
      fd.append("locale", locale);
      const res = await fetch(`${apiBaseUrl}/api/v1/onboarding/analyze-skin`, {
        method: "POST",
        body: fd,
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: OnboardingSkinAnalyzeDTO;
        error?: { message?: string };
      };
      if (!res.ok || !json.data) {
        ob.setAnalyzeStatus(
          "error",
          json.error?.message ?? `HTTP ${res.status}`,
        );
        return;
      }
      ob.applyAiAnalyzeResult(json.data);
      setIdx(Math.max(0, steps.indexOf("aiReview")));
      setAiEditing(false);
    } catch {
      ob.setAnalyzeStatus("error", "network");
    }
  }

  function next() {
    setIdx((i) => {
      const target = Math.min(i + 1, steps.length - 1);
      // Skip-face users have no `aiSnapshot`, so the AI review step is empty —
      // jump straight to "context" rather than dead-ending them.
      if (steps[target] === "aiReview" && !ob.aiSnapshot) {
        return Math.min(steps.indexOf("context"), steps.length - 1);
      }
      return target;
    });
  }
  function prev() {
    setIdx((i) => {
      const target = Math.max(i - 1, 0);
      if (steps[target] === "aiReview" && !ob.aiSnapshot) {
        return Math.max(steps.indexOf("photos"), 0);
      }
      return target;
    });
  }

  /**
   * Finish onboarding.
   *
   * Order of operations:
   *   1. Validate we have everything needed and an auth token. Without auth we
   *      surface an inline `auth` error and do NOT mark complete or navigate
   *      (previous behaviour silently dropped the user on /check-in despite
   *      the save never happening).
   *   2. POST to /profile/onboarding/complete. On success: mirror starter
   *      routine into sessionStorage and route to /onboarding/coach-welcome.
   *   3. On failure: keep the user on the summary step with an inline banner
   *      offering Retry or "Continue without saving" so they're never stuck.
   *
   * `setSkillGlobal` runs once we know we'll continue (success or local
   * fallback) so the skill mode actually applies to the rest of the app.
   */
  async function finish(opts: { skipServer?: boolean } = {}) {
    if (finishing) return;
    setFinishError(null);

    const manual = ob.bodyConcernsText
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const bodyConcerns = [...new Set([...ob.aiConcernTags, ...manual])];
    const token = getAccessToken();

    if (opts.skipServer) {
      if (ob.skillMode) setSkillGlobal(ob.skillMode);
      ob.markComplete();
      router.push("/check-in");
      return;
    }

    if (!token) {
      setFinishError("auth");
      return;
    }

    if (
      !ob.skinType ||
      !ob.undertone ||
      !ob.budget ||
      !ob.goal ||
      !ob.skillMode
    ) {
      setFinishError("save_failed");
      return;
    }

    setFinishing(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/profile/onboarding/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          skin_type: ob.skinType,
          undertone: ob.undertone,
          contexts: ob.contexts,
          budget: ob.budget,
          goal: ob.goal,
          skill_level: ob.skillMode,
          body_concerns: bodyConcerns,
          current_routine: ob.currentRoutineText.trim(),
          locale,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: {
          profile?: { id?: string };
          starter_routine?: CoachWelcomePayload["starterRoutine"];
        };
      };

      if (
        res.ok &&
        payload.success &&
        payload.data?.profile?.id &&
        payload.data?.starter_routine
      ) {
        const pack: CoachWelcomePayload = {
          profileId: payload.data.profile.id,
          starterRoutine: payload.data.starter_routine,
          coachingNotes: ob.aiSnapshot?.coaching_notes?.trim() || undefined,
        };
        try {
          sessionStorage.setItem(
            COACH_WELCOME_STORAGE_KEY,
            JSON.stringify(pack),
          );
        } catch {
          /* storage full or private mode — coach-welcome falls back gracefully. */
        }
        if (ob.skillMode) setSkillGlobal(ob.skillMode);
        ob.markComplete();
        router.push("/onboarding/coach-welcome");
      } else {
        setFinishError("save_failed");
      }
    } catch {
      setFinishError("network");
    } finally {
      setFinishing(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 sm:space-y-8 sm:px-0">
      <div className="space-y-2 text-center sm:text-left">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {t("sectionLabel")}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("title")}</h1>
        <p className="text-sm text-muted-foreground sm:text-base">{t("intro")}</p>
      </div>

      <div className="flex gap-1">
        {steps.map((s, i) => (
          <div
            key={s}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i <= idx ? "bg-primary" : "bg-muted",
            )}
          />
        ))}
      </div>

      <Card className="overflow-hidden border-border/80 shadow-sm">
        <CardContent className="space-y-6 p-4 pt-5 sm:p-6 sm:pt-6">
          {step === "photos" && (
            <section className="space-y-5" aria-labelledby="onb-photo-title">
              <div className="space-y-2">
                <h2 id="onb-photo-title" className="text-lg font-semibold">
                  {t("photos.title")}
                </h2>
                <p className="text-sm text-muted-foreground">{t("photos.hint")}</p>
              </div>

              {skipFaceCapture ? (
                <SkipModeCard
                  title={t("photos.skipTitle")}
                  body={t("photos.skipBody")}
                  continueCta={t("photos.skipContinue")}
                  switchBackCta={t("photos.skipSwitchBack")}
                  badgeLabel={tPrivacy("modeBadgeSkip")}
                  onContinue={() => setIdx(steps.indexOf("context"))}
                  onSwitchBack={() => setSkipFaceCapture(false)}
                />
              ) : (
                <>
                  <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                    <li className="flex gap-2 rounded-xl border border-border/60 bg-muted/30 p-3">
                      <Sun className="size-5 shrink-0 text-amber-500" aria-hidden />
                      <span>{t("photos.tipLight")}</span>
                    </li>
                    <li className="flex gap-2 rounded-xl border border-border/60 bg-muted/30 p-3">
                      <Camera className="size-5 shrink-0 text-primary" aria-hidden />
                      <span>{t("photos.tipAngle")}</span>
                    </li>
                    <li className="flex gap-2 rounded-xl border border-border/60 bg-muted/30 p-3 sm:col-span-1">
                      <UserRound className="size-5 shrink-0 text-primary" aria-hidden />
                      <span>{t("photos.tipClean")}</span>
                    </li>
                  </ul>

                  <PrivacyHeader
                    headline={tPrivacy("captureCard.subtitle")}
                    privacyLabel={t("photos.privacyOpen")}
                    onOpenNotice={consent.openManually}
                  />

                  <input
                    ref={cameraRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="user"
                    className="sr-only"
                    onChange={(e) => {
                      void applyFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      void applyFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      className="min-h-12 gap-2"
                      onClick={openCamera}
                      disabled={ob.photos.length >= 3 || blurStatus.inflight > 0}
                    >
                      <Camera className="size-4" aria-hidden />
                      {tPrivacy("captureCard.actionCamera")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      className="min-h-12 gap-2"
                      onClick={openLibrary}
                      disabled={ob.photos.length >= 3 || blurStatus.inflight > 0}
                    >
                      <ImagePlus className="size-4" aria-hidden />
                      {tPrivacy("captureCard.actionLibrary")}
                    </Button>
                  </div>

                  {ob.photos.length >= 3 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      {t("photos.maxPhotos")}
                    </p>
                  )}

                  {blurStatus.inflight > 0 && <BlurringPlaceholder t={tPrivacy} />}
                  {blurStatus.error ? (
                    <p
                      role="alert"
                      className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                    >
                      {blurStatus.error}
                    </p>
                  ) : null}

                  {ob.photos.length > 0 && (
                    <div className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        {ob.photos.map((p, i) => (
                          <BlurredPhotoCard
                            key={p.preview}
                            previewUrl={p.preview}
                            blurMethod={p.blurMethod ?? "heuristic"}
                            altLabel={tCheckIn("altPhoto", { n: i + 1 })}
                            blurredCaption={tPrivacy("captureCard.blurredBadge")}
                            blurMethodNative={tPrivacy("captureCard.blurMethodNative")}
                            blurMethodHeuristic={tPrivacy("captureCard.blurMethodHeuristic")}
                            removeLabel={tPrivacy("captureCard.remove")}
                            onRemove={() => ob.removePhotoAt(i)}
                          />
                        ))}
                      </div>
                      <p className="text-center text-sm font-medium text-foreground sm:text-left">
                        {tPrivacy("captureCard.blurredHint")}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => ob.clearPhotos()}
                        >
                          {tPrivacy("captureCard.removeAll")}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={openLibrary}
                          disabled={ob.photos.length >= 3 || blurStatus.inflight > 0}
                        >
                          {tPrivacy("captureCard.retake")}
                        </Button>
                      </div>
                    </div>
                  )}

                  {ob.photos.length < 2 && (
                    <p className="text-sm text-muted-foreground">{t("photos.needTwo")}</p>
                  )}

                  {ob.analyzeStatus === "error" && (
                    <p className="text-sm text-destructive" role="alert">
                      {ob.analyzeError === "auth"
                        ? tAuth("errorGeneric")
                        : ob.analyzeError === "network"
                          ? tAuth("networkError")
                          : t("photos.analyzeFail")}
                    </p>
                  )}

                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                    <Button
                      type="button"
                      className="w-full gap-2 sm:w-auto"
                      disabled={
                        ob.photos.length < 2 ||
                        ob.analyzeStatus === "loading" ||
                        blurStatus.inflight > 0
                      }
                      onClick={() => void runAnalyze()}
                    >
                      {ob.analyzeStatus === "loading" ? (
                        <>
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                          {t("photos.analyzing")}
                        </>
                      ) : (
                        <>
                          <Sparkles className="size-4" aria-hidden />
                          {tPrivacy("captureCard.submit")}
                        </>
                      )}
                    </Button>
                    {ob.aiSnapshot && (
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full sm:w-auto"
                        onClick={() => setIdx(steps.indexOf("aiReview"))}
                      >
                        {t("photos.nextAfterAi")}
                        <ArrowRight className="size-4" aria-hidden />
                      </Button>
                    )}
                  </div>

                  <SkipFaceFooter
                    skipCta={tPrivacy("captureCard.skipCta")}
                    skipHint={tPrivacy("captureCard.skipHint")}
                    onSkip={() => {
                      ob.clearPhotos();
                      setSkipFaceCapture(true);
                    }}
                  />

                  {ob.aiSnapshot?.model_used && (
                    <p className="text-xs text-muted-foreground">
                      {t("photos.modelLine", { model: ob.aiSnapshot.model_used })}
                    </p>
                  )}
                </>
              )}
            </section>
          )}

          {step === "aiReview" && ob.aiSnapshot && (
            <section className="space-y-5" aria-labelledby="onb-ai-title">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 rounded-full border bg-primary/5 px-3 py-1 text-sm font-medium text-primary">
                  <Sparkles className="size-4" aria-hidden />
                  {t("aiReview.title")}
                </div>
                <p id="onb-ai-title" className="text-sm text-muted-foreground">
                  {t("aiReview.subtitle")}
                </p>
              </div>

              {!aiEditing ? (
                <div className="space-y-4 text-sm">
                  <div className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("aiReview.skin")}
                      </p>
                      <p className="mt-1 font-medium">
                        {ob.skinType ? t(`skinType.${ob.skinType}`) : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("aiReview.undertone")}
                      </p>
                      <p className="mt-1 font-medium">
                        {ob.undertone ? t(`undertone.${ob.undertone}`) : "—"}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("aiReview.concerns")}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {ob.aiConcernTags.map((c) => (
                          <span
                            key={c}
                            className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                          >
                            {concernChipLabel(t, c)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("aiReview.goal")}
                      </p>
                      <p className="mt-1 font-medium">
                        {ob.goal ? t(`goal.${ob.goal}`) : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("aiReview.barrier")}
                      </p>
                      <p className="mt-1 font-medium">
                        {barrierLabel(t, ob.aiSnapshot.barrier_signal)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("aiReview.confidence")}
                    </p>
                    <p className="mt-1">
                      {Math.round(ob.aiSnapshot.confidence * 100)}%
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/80 bg-muted/30 p-4">
                    <p className="text-xs font-medium text-muted-foreground">{t("aiReview.notes")}</p>
                    <p className="mt-2 leading-relaxed text-foreground">
                      {ob.aiSnapshot.coaching_notes}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">{ob.aiSnapshot.non_diagnostic}</p>
                  {!ob.aiSnapshot.photo_quality.sufficient &&
                    ob.aiSnapshot.photo_quality.tips.length > 0 && (
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
                        <p className="font-medium text-amber-800 dark:text-amber-200">
                          {t("aiReview.photoTips")}
                        </p>
                        <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
                          {ob.aiSnapshot.photo_quality.tips.map((tip) => (
                            <li key={tip}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  <Button type="button" variant="outline" onClick={() => setAiEditing(true)}>
                    {t("aiReview.edit")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <StepGrid
                    title={t("steps.typeTitle")}
                    options={skinTypeOrder.map((k) => ({
                      id: k,
                      label: t(`skinType.${k}` as const),
                    }))}
                    selected={ob.skinType}
                    onSelect={ob.setSkinType}
                  />
                  <StepGrid
                    title={t("steps.undertoneTitle")}
                    options={undertoneOrder.map((k) => ({
                      id: k,
                      label: t(`undertone.${k}` as const),
                    }))}
                    selected={ob.undertone}
                    onSelect={ob.setUndertone}
                  />
                  <div>
                    <p className="mb-2 text-sm font-medium">{t("aiReview.concerns")}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {CONCERN_IDS.map((id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => ob.toggleAiConcernTag(id)}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                            ob.aiConcernTags.includes(id)
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:bg-muted",
                          )}
                        >
                          {concernChipLabel(t, id)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <StepGrid
                    title={t("steps.goalTitle")}
                    options={goalOrder.map((k) => ({
                      id: k,
                      label: t(`goal.${k}` as const),
                    }))}
                    selected={ob.goal}
                    onSelect={ob.setGoal}
                  />
                  <Button type="button" variant="secondary" onClick={() => setAiEditing(false)}>
                    {t("back")}
                  </Button>
                </div>
              )}
            </section>
          )}

          {step === "context" && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">{t("steps.contextTitle")}</h2>
              <p className="text-sm text-muted-foreground">{t("steps.contextHint")}</p>
              <div className="flex flex-wrap gap-2">
                {contextOrder.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => ob.toggleContext(k)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors",
                      ob.contexts.includes(k)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    {t(`context.${k}` as const)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === "budget" && (
            <StepGrid
              title={t("steps.budgetTitle")}
              options={budgetOrder.map((k) => ({
                id: k,
                label: t(`budget.${k}` as const),
              }))}
              selected={ob.budget}
              onSelect={ob.setBudget}
            />
          )}
          {step === "goal" && (
            <StepGrid
              title={t("steps.goalTitle")}
              options={goalOrder.map((k) => ({
                id: k,
                label: t(`goal.${k}` as const),
              }))}
              selected={ob.goal}
              onSelect={ob.setGoal}
            />
          )}
          {step === "skill" && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">{t("skillTitle")}</h2>
              <p className="text-sm text-muted-foreground">{t("skillHint")}</p>
              <div className="grid gap-3">
                {skillOrder.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => ob.setSkillMode(m)}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-colors",
                      ob.skillMode === m
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    <div className="font-medium">{t(`skill.${m}.title` as const)}</div>
                    <div className="text-sm text-muted-foreground">
                      {t(`skill.${m}.desc` as const)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === "summary" && (
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border bg-primary/5 px-3 py-1 text-sm font-medium text-primary">
                <Sparkles className="size-4" aria-hidden />
                {t("summaryBadge")}
              </div>
              <ul className="space-y-2 text-sm leading-relaxed">
                {starterBullets.map((line) => (
                  <li key={line} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <label
                    htmlFor="ob-body-concerns"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    {tAuth("fieldBodyConcerns")}
                  </label>
                  <textarea
                    id="ob-body-concerns"
                    value={ob.bodyConcernsText}
                    onChange={(e) => ob.setBodyConcernsText(e.target.value)}
                    placeholder={tAuth("placeholderBodyConcerns")}
                    rows={2}
                    className="w-full rounded-md border bg-background px-3 py-2 text-base outline-none ring-ring/40 focus:ring-2 sm:text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="ob-current-routine"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    {tAuth("fieldCurrentRoutine")}
                  </label>
                  <textarea
                    id="ob-current-routine"
                    value={ob.currentRoutineText}
                    onChange={(e) => ob.setCurrentRoutineText(e.target.value)}
                    placeholder={tAuth("placeholderCurrentRoutine")}
                    rows={3}
                    className="w-full rounded-md border bg-background px-3 py-2 text-base outline-none ring-ring/40 focus:ring-2 sm:text-sm"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{t("summaryFoot")}</p>
              {finishError ? (
                <FinishErrorBanner
                  kind={finishError}
                  authMessage={tAuth("finishNeedAuth")}
                  saveMessage={tAuth("finishNetworkError")}
                  retryLabel={tAuth("finishRetry")}
                  continueLabel={tAuth("finishContinueLocal")}
                  onRetry={() => void finish()}
                  onContinue={() => void finish({ skipServer: true })}
                  onDismiss={() => setFinishError(null)}
                  dismissLabel={t("back")}
                />
              ) : null}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={prev}
              disabled={idx === 0}
              className="gap-1"
            >
              <ArrowLeft className="size-4" aria-hidden />
              {t("back")}
            </Button>
            {step === "aiReview" && ob.aiSnapshot && !aiEditing ? (
              <Button type="button" onClick={next} className="gap-1">
                {t("aiReview.confirm")}
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            ) : step === "summary" ? (
              <Button
                type="button"
                onClick={() => void finish()}
                disabled={finishing}
                className="gap-1"
              >
                {finishing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    {tAuth("submitting")}
                  </>
                ) : (
                  <>
                    {t("finish")}
                    <ArrowRight className="size-4" aria-hidden />
                  </>
                )}
              </Button>
            ) : step === "photos" ? null : (
              <Button
                type="button"
                onClick={next}
                disabled={!canProceed(step, ob)}
                className="gap-1"
              >
                {t("next")}
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/" className="underline underline-offset-4 hover:text-foreground">
          {t("homeLink")}
        </Link>
      </p>

      <FacePrivacyConsentDialog {...consent.dialogProps} />
    </div>
  );
}

/**
 * Pre-photo trust strip — small reminder + "Read the privacy notice" link.
 *
 * Sits directly above the camera/library buttons so the user always has
 * the option to re-read the four promises before the next photo. Easy to
 * miss is bad UX for a privacy-critical surface — keeping the open-notice
 * affordance one tap away builds confidence.
 */
function PrivacyHeader({
  headline,
  privacyLabel,
  onOpenNotice,
}: {
  headline: string;
  privacyLabel: string;
  onOpenNotice: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2 text-xs leading-relaxed text-foreground/90">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <span>{headline}</span>
      </p>
      <button
        type="button"
        onClick={onOpenNotice}
        className="self-start text-xs font-medium text-primary underline-offset-4 hover:underline sm:self-auto"
      >
        {privacyLabel}
      </button>
    </div>
  );
}

/** "Đang làm mờ khuôn mặt…" placeholder while the on-device blur runs. */
function BlurringPlaceholder({
  t,
}: {
  t: ReturnType<typeof useTranslations<"privacy">>;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
      <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-primary" aria-hidden />
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-foreground">
          {t("captureCard.blurringTitle")}
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("captureCard.blurringHint")}
        </p>
      </div>
    </div>
  );
}

/**
 * Single blurred-photo preview card. Renders a clear "Đã làm mờ khuôn mặt"
 * badge on top of the image plus a small method-line below so the user
 * knows whether we used the precise face detector or a heuristic.
 */
function BlurredPhotoCard({
  previewUrl,
  altLabel,
  blurMethod,
  blurredCaption,
  blurMethodNative,
  blurMethodHeuristic,
  removeLabel,
  onRemove,
}: {
  previewUrl: string;
  altLabel: string;
  blurMethod: BlurMethod;
  blurredCaption: string;
  blurMethodNative: string;
  blurMethodHeuristic: string;
  removeLabel: string;
  onRemove: () => void;
}) {
  return (
    <figure className="space-y-1.5">
      <div className="relative aspect-3/4 overflow-hidden rounded-2xl border border-border bg-muted shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewUrl} alt={altLabel} className="size-full object-cover" />
        <span className="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-background/95 px-2 py-1 text-[11px] font-semibold text-foreground shadow ring-1 ring-border/50 backdrop-blur">
          <ShieldCheck className="size-3.5 text-primary" aria-hidden />
          {blurredCaption}
        </span>
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="absolute right-2 top-2 inline-flex size-9 items-center justify-center rounded-full bg-black/60 text-white shadow-md backdrop-blur transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:size-8"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <figcaption className="text-[11px] leading-snug text-muted-foreground">
        {blurMethod === "native-face-detector" ? blurMethodNative : blurMethodHeuristic}
      </figcaption>
    </figure>
  );
}

/**
 * Bottom escape-hatch on the photos step — explicit "I don't want to take a
 * face photo" CTA + plain-language hint about what changes if they pick it.
 *
 * Placement matters: the requirement calls out parity with the consent dialog
 * decline action, but the dialog is one-shot. Keeping the same affordance
 * available below the photos UI is what lets a user who *first* uploaded
 * change their mind without backing out of the flow.
 */
function SkipFaceFooter({
  skipCta,
  skipHint,
  onSkip,
}: {
  skipCta: string;
  skipHint: string;
  onSkip: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs leading-relaxed text-muted-foreground">{skipHint}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onSkip}
        className="gap-2 self-start sm:self-auto"
      >
        <ImageOff className="size-4" aria-hidden />
        {skipCta}
      </Button>
    </div>
  );
}

/**
 * The "skip-face" replacement for the photos step. Calmly explains what the
 * user is opting into (lower AI precision, but onboarding still completes)
 * and gives them a one-tap way to flip back.
 */
function SkipModeCard({
  title,
  body,
  continueCta,
  switchBackCta,
  badgeLabel,
  onContinue,
  onSwitchBack,
}: {
  title: string;
  body: string;
  continueCta: string;
  switchBackCta: string;
  badgeLabel: string;
  onContinue: () => void;
  onSwitchBack: () => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-muted/30 p-4 sm:p-5">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground ring-1 ring-border">
        <ImageOff className="size-3.5" aria-hidden />
        {badgeLabel}
      </span>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
      <div className="flex flex-wrap gap-2 pt-1">
        <Button type="button" onClick={onContinue} className="gap-1">
          {continueCta}
          <ArrowRight className="size-4" aria-hidden />
        </Button>
        <Button type="button" variant="outline" onClick={onSwitchBack}>
          {switchBackCta}
        </Button>
      </div>
    </div>
  );
}

function canProceed(
  step: (typeof steps)[number],
  ob: ReturnType<typeof useOnboardingStore.getState>,
): boolean {
  switch (step) {
    case "photos":
      // Either the AI analysis happened (face flow) or the user is in
      // skip-face mode — but in skip-face mode the photos step is replaced
      // by SkipModeCard which navigates directly to "context", so this
      // branch only fires for the photo flow.
      return ob.photos.length >= 2 && ob.aiSnapshot != null;
    case "aiReview":
      return ob.skinType != null && ob.undertone != null && ob.goal != null;
    case "context":
      return ob.contexts.length > 0;
    case "budget":
      return ob.budget != null;
    case "goal":
      return ob.goal != null;
    case "skill":
      return ob.skillMode != null;
    default:
      return true;
  }
}

/**
 * Inline finish-error banner.
 *
 * Replaces the previous `alert()` flow so the user stays on the summary step
 * and gets explicit choices: retry the save, or proceed without saving (the
 * old behaviour, but now opt-in instead of silent).
 */
function FinishErrorBanner({
  kind,
  authMessage,
  saveMessage,
  retryLabel,
  continueLabel,
  onRetry,
  onContinue,
  onDismiss,
  dismissLabel,
}: {
  kind: "auth" | "save_failed" | "network";
  authMessage: string;
  saveMessage: string;
  retryLabel: string;
  continueLabel: string;
  onRetry: () => void;
  onContinue: () => void;
  onDismiss: () => void;
  dismissLabel: string;
}) {
  const message = kind === "auth" ? authMessage : saveMessage;
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-300"
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
        <p className="flex-1 leading-relaxed text-destructive">{message}</p>
        <IconDismissButton
          onClick={onDismiss}
          ariaLabel={dismissLabel}
          className="text-destructive/70 hover:bg-destructive/15 hover:text-destructive"
        >
          <X className="size-4" aria-hidden />
        </IconDismissButton>
      </div>
      <div className="flex flex-wrap gap-2 pl-6">
        {kind !== "auth" ? (
          <Button type="button" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="outline" onClick={onContinue}>
          {continueLabel}
        </Button>
      </div>
    </div>
  );
}

function StepGrid<T extends string>({
  title,
  options,
  selected,
  onSelect,
}: {
  title: string;
  options: { id: T; label: string }[];
  selected: T | null;
  onSelect: (id: T | null) => void;
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onSelect(o.id)}
            className={cn(
              "rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
              selected === o.id
                ? "border-primary bg-primary/5 font-medium text-primary"
                : "border-border hover:bg-muted",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
