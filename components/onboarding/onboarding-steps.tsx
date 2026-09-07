"use client";

import {
  CalendarCheck,
  Camera,
  CheckCircle2,
  ImagePlus,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  CoachWelcomeAchievementCard,
  CoachWelcomeNextStepCard,
} from "@/components/onboarding/coach-welcome-payoff";
import { OnboardingAiErrorPanel } from "@/components/onboarding/onboarding-ai-error-panel";
import {
  ConcernLimitHint,
  OnboardingPhotoGuide,
} from "@/components/onboarding/onboarding-photo-guide";
import { OnboardingSkinReadback } from "@/components/onboarding/onboarding-skin-readback";
import { OnboardingRoutinePeriodSection } from "@/components/onboarding/onboarding-starter-routine-step";
import { PhotoPrivacyNote } from "@/components/legal/photo-privacy-note";
import {
  ConcernChipRow,
  QuickChipGrid,
  SkinProfilePanel,
} from "@/components/onboarding/onboarding-ui";
import { AiDisclaimer } from "@/components/ui/ai-disclaimer";
import { Button } from "@/components/ui/button";
import { IconDismissButton } from "@/components/ui/icon-dismiss-button";
import {
  MANUAL_QUICK_SKIN_TYPES,
  ONBOARDING_MAX_CONCERNS,
  ONBOARDING_MAX_PHOTOS,
  ONBOARDING_MIN_PHOTOS,
  QUICK_GOALS,
  STEP1_CONCERNS,
} from "@/lib/onboarding/constants";
import { isQuickSkinType } from "@/lib/onboarding/step1-gate";
import { useOnboardingRoutineStepTips } from "@/lib/onboarding/use-onboarding-routine-step-tips";
import type { SkinTypeCard } from "@/lib/stores/onboarding-store";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { isPhotoInputError } from "@/lib/onboarding/onboarding-ai";
import type { OnboardingAiErrorKind } from "@/lib/onboarding/onboarding-ai";
import type { OnboardingSkinAnalyzeDTO } from "@/lib/types/onboarding-ai";
import { cn } from "@/lib/utils";

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
  showSkinTypePicker: boolean;
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
  showSkinTypePicker,
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
  // null = not answered yet. false surfaces a nudge to fix the concern labels below,
  // since the starter routine is derived from this read.
  const [readbackAgreed, setReadbackAgreed] = useState<boolean | null>(null);

  const selectedSkinType = isQuickSkinType(ob.skinType) ? ob.skinType : null;

  return (
    <section
      className="space-y-5"
      aria-labelledby="onb-skin-title"
      data-testid="onboarding-step-skin-profile"
    >
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
        required
        requiredLabel={t("step1.requiredBadge")}
        testIdPrefix="onboarding-goal"
      />

      <div className="space-y-2">
        <ConcernChipRow
          title={t("step1.concernsTitle")}
          hint={t("step1.concernsHint")}
          concernIds={CONCERN_IDS}
          selected={ob.aiConcernTags}
          onToggle={ob.toggleAiConcernTag}
          label={(id) => concernChipLabel(t, id)}
          required
          requiredLabel={t("step1.requiredBadge")}
          testIdPrefix="onboarding-concern"
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
        <PhotoPrivacyNote />

        <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-h-12 min-w-0 gap-2"
            onClick={openCamera}
            disabled={ob.photos.length >= ONBOARDING_MAX_PHOTOS || analyzing}
          >
            <Camera className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{tPrivacy("captureCard.actionCamera")}</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-h-12 min-w-0 gap-2"
            onClick={openLibrary}
            disabled={ob.photos.length >= ONBOARDING_MAX_PHOTOS || analyzing}
          >
            <ImagePlus className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{tPrivacy("captureCard.actionLibrary")}</span>
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
                  <IconDismissButton
                    onClick={() => ob.removePhotoAt(i)}
                    ariaLabel={tPrivacy("captureCard.remove")}
                    data-testid={`onboarding-photo-remove-${i}`}
                    className="absolute right-0 top-0 z-10 bg-black/55 text-white hover:bg-black/75"
                  >
                    <X className="size-4" aria-hidden />
                  </IconDismissButton>
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

        {ob.photos.length < ONBOARDING_MIN_PHOTOS ? (
          <p className="pt-1">
            <button
              type="button"
              onClick={onContinueWithoutPhotos}
              disabled={analyzing}
              data-testid="onboarding-continue-without-photos"
              className="min-h-11 w-full text-center text-sm font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground disabled:opacity-50"
            >
              {t("step1.continueWithoutPhotos")}
            </button>
            <span className="mt-1 block text-center text-[11px] leading-snug text-muted-foreground">
              {t("step1.continueWithoutPhotosHint")}
            </span>
          </p>
        ) : null}
      </div>

      {analyzeFailed && !analyzing && (
        <OnboardingAiErrorPanel
          errorKind={analyzeErrorKind ?? "unknown"}
          // Re-sending a photo the server already rejected fails identically,
          // so those kinds lead with picking a different one.
          onRetry={
            analyzeErrorKind && isPhotoInputError(analyzeErrorKind)
              ? openLibrary
              : onRetryAnalyze
          }
          retryLabel={
            analyzeErrorKind && isPhotoInputError(analyzeErrorKind)
              ? t("aiLoading.changePhotos")
              : t("photos.errorRetry")
          }
          secondaryLabel={t("aiLoading.useDefaultNow")}
          onSecondary={onSkipAnalyze}
          showFallbackHint
        />
      )}

      {aiSnapshot && !analyzing && (
        <div className="space-y-3">
          <OnboardingSkinReadback
            snapshot={aiSnapshot}
            title={t("step1.aiResultTitle")}
            onConfirm={setReadbackAgreed}
          />
          {readbackAgreed !== null ? (
            <p className="rounded-lg border border-border/70 bg-muted px-3 py-2 text-xs text-muted-foreground">
              {readbackAgreed
                ? t("readbackConfirm.thanksYes")
                : t("readbackConfirm.thanksNo")}
            </p>
          ) : null}
          <AiDisclaimer variant="short" />
          <details className="rounded-xl border border-border/60 bg-muted p-3 text-sm">
            <summary className="cursor-pointer font-medium">
              {t("aiReview.aiNotesToggle")} · {Math.round(aiSnapshot.confidence * 100)}%
            </summary>
            <div className="mt-2 space-y-2 text-muted-foreground">
              <p>
                {t("aiReview.barrier")}:{" "}
                <span className="text-foreground">{barrierLabel(t, aiSnapshot.barrier_signal)}</span>
              </p>
              {aiSnapshot.coaching_notes ? (
                <p className="whitespace-pre-wrap leading-relaxed text-foreground">
                  {aiSnapshot.coaching_notes}
                </p>
              ) : null}
            </div>
          </details>
        </div>
      )}

      {showSkinTypePicker && !analyzing ? (
        <SkinProfilePanel
          title={t("step1.skinTypeTitle")}
          subtitle={
            aiSnapshot ? t("step1.skinTypeHintAi") : t("step1.skinTypeHintManual")
          }
        >
          <QuickChipGrid
            title={t("step1.skinTypeTitle")}
            hideTitle
            options={MANUAL_QUICK_SKIN_TYPES.map((k) => ({
              id: k,
              label: t(`skinType.${k}` as const),
            }))}
            selected={selectedSkinType}
            onSelect={(id: SkinTypeCard) => ob.setSkinType(id)}
            columns={2}
            size="large"
            required
            requiredLabel={t("step1.requiredBadge")}
            testIdPrefix="onboarding-skin-type"
          />
        </SkinProfilePanel>
      ) : null}
    </section>
  );
}

export function OnboardingStepReady() {
  const t = useTranslations("onboarding");
  const { routine, carePhase, stepTips, affiliateCtaCount } =
    useOnboardingRoutineStepTips();

  return (
    <section
      className="space-y-5"
      aria-labelledby="onb-ready-title"
      data-testid="onboarding-step-ready"
    >
      <div className="space-y-2.5 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="size-4" aria-hidden />
          {t("step3.badge")}
        </div>
        <h2 id="onb-ready-title" className="text-xl font-bold leading-tight sm:text-2xl">
          {t("step3.title")}
        </h2>
        <p className="text-sm font-semibold leading-snug text-foreground">{t("step3.subtitle")}</p>
        <CoachWelcomeAchievementCard
          title={t("step3.achievementTitle")}
          line={t("step3.achievementLine")}
        />
        <CoachWelcomeNextStepCard
          label={t("step3.nextStepLabel")}
          hint={t("step3.nextStepHint")}
          benefit={t("step3.nextStepBenefit")}
        />
      </div>

      {routine && (
        <div className="space-y-2.5" data-testid="onboarding-ready-recap">
          <p className="text-sm font-semibold text-foreground/90">{t("step3.routineRecap")}</p>
          <OnboardingRoutinePeriodSection
            period="morning"
            steps={routine.morning}
            editing={false}
            carePhase={carePhase}
            productTips={stepTips.morning}
            sectionTestId="onboarding-ready-morning"
            stepTestIdPrefix="onboarding-ready-morning"
            emptyCommerceHint={
              affiliateCtaCount === 0 ? t("step2.commerceEmptyHint") : null
            }
          />
          <OnboardingRoutinePeriodSection
            period="evening"
            steps={routine.evening}
            editing={false}
            carePhase={carePhase}
            productTips={stepTips.evening}
            sectionTestId="onboarding-ready-evening"
            stepTestIdPrefix="onboarding-ready-evening"
          />
        </div>
      )}

      <div className="space-y-2.5">
        <p className="text-sm font-semibold">{t("step3.nextActionsTitle")}</p>
        <ul className="space-y-2">
          {(["checkIn", "routine", "learn"] as const).map((key) => (
            <li
              key={key}
              className={cn(
                "flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm",
                key === "checkIn"
                  ? "border-primary/30 bg-primary/[0.06] shadow-sm"
                  : "border-border/70 bg-card",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  key === "checkIn"
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary/10 text-primary",
                )}
              >
                {key === "checkIn" ? (
                  <CalendarCheck className="size-3.5" aria-hidden />
                ) : key === "routine" ? (
                  "2"
                ) : (
                  "3"
                )}
              </span>
              <span className={key === "checkIn" ? "font-medium text-foreground" : undefined}>
                {t(`step3.actions.${key}`)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
