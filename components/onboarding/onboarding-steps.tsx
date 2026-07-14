"use client";

import {
  ArrowRight,
  Camera,
  ImagePlus,
  Sparkles,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { OnboardingAiErrorPanel } from "@/components/onboarding/onboarding-ai-error-panel";
import {
  ConcernLimitHint,
  OnboardingPhotoGuide,
} from "@/components/onboarding/onboarding-photo-guide";
import {
  ConcernChipRow,
  FriendlyNotice,
  QuickChipGrid,
} from "@/components/onboarding/onboarding-ui";
import { AiDisclaimer } from "@/components/ui/ai-disclaimer";
import { Button } from "@/components/ui/button";
import {
  ONBOARDING_MAX_CONCERNS,
  ONBOARDING_MAX_PHOTOS,
  ONBOARDING_MIN_PHOTOS,
  QUICK_GOALS,
  STEP1_CONCERNS,
} from "@/lib/onboarding/constants";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import type { OnboardingAiErrorKind } from "@/lib/onboarding/onboarding-ai";
import type { OnboardingSkinAnalyzeDTO } from "@/lib/types/onboarding-ai";

const CONCERN_IDS = [...STEP1_CONCERNS];

type OnboardingT = ReturnType<typeof useTranslations<"onboarding">>;

function concernChipLabel(t: OnboardingT, id: string) {
  if (!(CONCERN_IDS as readonly string[]).includes(id)) return id;
  return t(`aiConcerns.${id}` as `aiConcerns.${(typeof CONCERN_IDS)[number]}`);
}

const BARRIER_LABEL_KEYS = ["possibly_compromised", "likely_ok", "unclear"] as const;

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

export type OnboardingStepSkinProfileProps = {
  analyzing: boolean;
  analyzeFailed: boolean;
  analyzeErrorKind: OnboardingAiErrorKind | null;
  aiSnapshot: OnboardingSkinAnalyzeDTO | null;
  onRetryAnalyze: () => void;
  onSkipAnalyze: () => void;
  openCamera: () => void;
  openLibrary: () => void;
  onContinueWithoutPhotos: () => void;
};

export function OnboardingStepSkinProfile({
  analyzing,
  analyzeFailed,
  analyzeErrorKind,
  aiSnapshot,
  onRetryAnalyze,
  onSkipAnalyze,
  openCamera,
  openLibrary,
  onContinueWithoutPhotos,
}: OnboardingStepSkinProfileProps) {
  const t = useTranslations("onboarding");
  const tPrivacy = useTranslations("privacy");
  const tCheckIn = useTranslations("checkIn");
  const ob = useOnboardingStore();

  return (
    <section className="space-y-5" aria-labelledby="onb-skin-title">
      <div className="space-y-2">
        <h2 id="onb-skin-title" className="text-lg font-semibold">
          {t("step1.title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("step1.subtitle")}</p>
      </div>

      <QuickChipGrid
        title={t("step1.goalTitle")}
        options={QUICK_GOALS.map((k) => ({
          id: k,
          label: t(`goal.${k}` as const),
        }))}
        selected={ob.goal}
        onSelect={ob.setGoal}
        columns={2}
        size="large"
      />

      <div className="space-y-2">
        <ConcernChipRow
          title={t("step1.concernsTitle")}
          hint={t("step1.concernsHint")}
          concernIds={CONCERN_IDS}
          selected={ob.aiConcernTags}
          onToggle={ob.toggleAiConcernTag}
          label={(id) => concernChipLabel(t, id)}
        />
        <ConcernLimitHint count={ob.aiConcernTags.length} max={ONBOARDING_MAX_CONCERNS} />
      </div>

      <div className="space-y-3 rounded-2xl border border-dashed border-primary/30 bg-primary/[0.03] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">{t("step1.photosOptional")}</p>
            <p className="text-xs text-muted-foreground">{t("step1.photosOptionalHint")}</p>
          </div>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("step1.optionalBadge")}
          </span>
        </div>

        <OnboardingPhotoGuide />

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-h-12 gap-2"
            onClick={openCamera}
            disabled={ob.photos.length >= ONBOARDING_MAX_PHOTOS || analyzing}
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
            disabled={ob.photos.length >= ONBOARDING_MAX_PHOTOS || analyzing}
          >
            <ImagePlus className="size-4" aria-hidden />
            {tPrivacy("captureCard.actionLibrary")}
          </Button>
        </div>

        {ob.photos.length > 0 && (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {ob.photos.map((p, i) => (
                <figure key={p.preview} className="relative aspect-3/4 overflow-hidden rounded-xl border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.preview}
                    alt={tCheckIn("altPhoto", { n: i + 1 })}
                    className="size-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => ob.removePhotoAt(i)}
                    aria-label={tPrivacy("captureCard.remove")}
                    className="absolute right-1.5 top-1.5 inline-flex size-7 items-center justify-center rounded-full bg-black/60 text-white"
                  >
                    <X className="size-3.5" aria-hidden />
                  </button>
                </figure>
              ))}
            </div>
            {ob.photos.length >= ONBOARDING_MIN_PHOTOS && !aiSnapshot && !analyzing && (
              <p className="text-xs text-primary">{t("step1.photosReadyHint")}</p>
            )}
            {ob.photos.length > 0 && ob.photos.length < ONBOARDING_MIN_PHOTOS && (
              <p className="text-xs text-amber-700 dark:text-amber-300">{t("photos.needMore")}</p>
            )}
          </div>
        )}

        <div className="space-y-1.5 rounded-xl border border-primary/35 bg-background px-3 py-3 shadow-sm">
          <button
            type="button"
            onClick={onContinueWithoutPhotos}
            disabled={analyzing}
            className="flex min-h-11 w-full items-center justify-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary/80 disabled:opacity-50"
          >
            <ArrowRight className="size-4 shrink-0" aria-hidden />
            {t("step1.continueWithoutPhotos")}
          </button>
          <p className="text-center text-[11px] leading-snug text-muted-foreground">
            {t("step1.continueWithoutPhotosHint")}
          </p>
        </div>
      </div>

      {analyzeFailed && !analyzing && (
        <OnboardingAiErrorPanel
          errorKind={analyzeErrorKind ?? "unknown"}
          onRetry={onRetryAnalyze}
          retryLabel={t("photos.errorRetry")}
          secondaryLabel={t("aiLoading.useDefaultNow")}
          onSecondary={onSkipAnalyze}
          showFallbackHint
        />
      )}

      {aiSnapshot && !analyzing && (
        <div className="space-y-3 rounded-xl border border-primary/25 bg-primary/[0.04] p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" aria-hidden />
            <p className="text-sm font-semibold">{t("step1.aiResultTitle")}</p>
          </div>
          <AiDisclaimer variant="short" />
          <details className="text-sm">
            <summary className="cursor-pointer font-medium">
              {t("aiReview.aiNotesToggle")} · {Math.round(aiSnapshot.confidence * 100)}%
            </summary>
            <div className="mt-2 space-y-2 text-muted-foreground">
              <p>
                {t("aiReview.barrier")}:{" "}
                <span className="text-foreground">{barrierLabel(t, aiSnapshot.barrier_signal)}</span>
              </p>
              {aiSnapshot.coaching_notes ? (
                <p className="leading-relaxed text-foreground">{aiSnapshot.coaching_notes}</p>
              ) : null}
            </div>
          </details>
        </div>
      )}
    </section>
  );
}

export function OnboardingStepReady() {
  const t = useTranslations("onboarding");
  const routine = useOnboardingStore((s) => s.starterRoutine);

  return (
    <section className="space-y-5" aria-labelledby="onb-ready-title">
      <div className="space-y-2 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          <Sparkles className="size-4" aria-hidden />
          {t("step3.badge")}
        </div>
        <h2 id="onb-ready-title" className="text-xl font-semibold sm:text-2xl">
          {t("step3.title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("step3.subtitle")}</p>
      </div>

      {routine && (
        <div className="rounded-xl border bg-muted/25 p-4">
          <p className="mb-3 text-sm font-semibold">{t("step3.routineRecap")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                {t("routineStep.morning")}
              </p>
              <ol className="list-decimal space-y-1 pl-4 text-sm">
                {routine.morning.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                {t("routineStep.evening")}
              </p>
              <ol className="list-decimal space-y-1 pl-4 text-sm">
                {routine.evening.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm font-semibold">{t("step3.nextActionsTitle")}</p>
        <ul className="space-y-2">
          {(["checkIn", "routine", "learn"] as const).map((key) => (
            <li
              key={key}
              className="flex items-start gap-2.5 rounded-lg border border-border/70 bg-card/50 px-3.5 py-3 text-sm"
            >
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {key === "checkIn" ? "1" : key === "routine" ? "2" : "3"}
              </span>
              <span>{t(`step3.actions.${key}`)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
