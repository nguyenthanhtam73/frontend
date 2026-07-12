"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  Camera,
  Check,
  ImagePlus,
  Laugh,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ConcernChipRow,
  FriendlyNotice,
  OnboardingProgress,
  OnboardingStepPanel,
  OnboardingStickyNav,
  QuickChipGrid,
  QuickInfoGroup,
  SkinProfilePanel,
  SkipPhotosButton,
} from "@/components/onboarding/onboarding-ui";
import { OnboardingAiErrorPanel, ManualSkinFallbackBanner } from "@/components/onboarding/onboarding-ai-error-panel";
import { OnboardingAiLoading } from "@/components/onboarding/onboarding-ai-loading";
import { OnboardingFlowSkeleton } from "@/components/onboarding/onboarding-flow-skeleton";
import { AiDisclaimer } from "@/components/ui/ai-disclaimer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useRouter } from "@/i18n/navigation";
import { apiBaseUrl } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-token";
import { buildDefaultStarterRoutine } from "@/lib/onboarding/guest-starter";
import {
  postGuestPreviewComplete,
  postOnboardingComplete,
  postOnboardingCompleteBackground,
} from "@/lib/onboarding/finish-request";
import {
  assertAnalyzeSkinPayload,
  fetchOnboardingAi,
  onboardingAiErrorKind,
  OnboardingAiError,
  parseJsonSafe,
  type OnboardingAiErrorKind,
} from "@/lib/onboarding/onboarding-ai";
import { appendOnboardingPhotos } from "@/lib/onboarding/compress-photo";
import { buildOnboardingFinishBody } from "@/lib/onboarding/finish-body";
import { patchCoachWelcomeSession } from "@/lib/onboarding/coach-welcome-session";
import { resolveReviewPhotoUrls } from "@/lib/onboarding/photo-session-urls";
import { buildReviewSummaryFromStore } from "@/lib/onboarding/review-data";
import {
  COACH_WELCOME_STORAGE_KEY,
  GUEST_COACH_PROFILE_ID,
  type CoachWelcomePayload,
} from "@/lib/types/starter-routine";
import { AUTH_CHANGED_EVENT } from "@/lib/auth-token";
import {
  isGuestOnboardingBlocked,
  isAiFallbackManual,
  isManualSkinInput,
  markJustCompletedOnboarding,
  ONBOARDING_STEPS,
  readPersistedSkinInputMode,
  type OnboardingStepId,
  type OnboardingState,
  type SkillMode,
  type SkinTypeCard,
  useOnboardingStore,
} from "@/lib/stores/onboarding-store";
import { usePrivacyHydrated } from "@/lib/use-privacy-hydrated";
import { usePrivacyStore } from "@/lib/stores/privacy-store";
import { useSkillStore } from "@/lib/stores/skill-store";
import {
  MANUAL_QUICK_CONCERNS,
  MANUAL_QUICK_SKIN_TYPES,
  ONBOARDING_EXIT_ANIM_KEY,
  PHOTO_QUICK_CONCERNS,
  ONBOARDING_MAX_PHOTOS,
  ONBOARDING_MIN_PHOTOS,
  ONBOARDING_ANALYZE_TIMEOUT_MS,
  QUICK_GOALS,
  QUICK_UNDERTONES,
} from "@/lib/onboarding/constants";
import { ButtonLink } from "@/components/ui/button-link";

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

const steps = ONBOARDING_STEPS;

const skinTypeOrder: SkinTypeCard[] = [
  "dry",
  "oily",
  "combo",
  "normal",
  "sensitive",
  "prefer_not",
];
const skillOrder: SkillMode[] = ["beginner", "intermediate", "advanced"];

function buildSummaryRecap(
  ob: OnboardingState,
  t: OnboardingT,
): string[] {
  const lines: string[] = [];
  if (ob.skinType) {
    lines.push(
      t("summaryRecapSkin", { value: t(`skinType.${ob.skinType}`) }),
    );
  }
  if (ob.aiConcernTags.length) {
    const concerns = ob.aiConcernTags
      .map((id) => concernChipLabel(t, id))
      .join(", ");
    lines.push(t("summaryRecapConcerns", { value: concerns }));
  }
  if (ob.skillMode) {
    lines.push(
      t("summaryRecapSkill", { value: t(`skill.${ob.skillMode}.short`) }),
    );
  }
  if (ob.goal) {
    lines.push(t("summaryRecapGoal", { value: t(`goal.${ob.goal}`) }));
  }
  return lines;
}

export function OnboardingFlow() {
  const t = useTranslations("onboarding");
  const tPrivacy = useTranslations("privacy");
  const tAuth = useTranslations("auth");
  const tCheckIn = useTranslations("checkIn");
  const locale = useLocale();
  const router = useRouter();
  const [guestTrialBlocked, setGuestTrialBlocked] = useState<boolean | null>(null);
  const [idx, setIdx] = useState(0);
  const [slideDir, setSlideDir] = useState<1 | -1>(1);
  const [finishing, setFinishing] = useState(false);
  const skinSectionRef = useRef<HTMLDivElement>(null);
/** Inline finish-error on summary — friendly AI / save failures with retry + default routine. */
  const [finishError, setFinishError] = useState<OnboardingAiErrorKind | "save_failed" | null>(
    null,
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const skipFaceCaptureWas = useRef(false);
  const ob = useOnboardingStore();
  const setSkillGlobal = useSkillStore((s) => s.setMode);
  const privacyHydrated = usePrivacyHydrated();
  const skipFaceCaptureStored = usePrivacyStore((s) => s.skipFaceCapture);
  const skipFaceCapture = privacyHydrated && skipFaceCaptureStored;
  const setSkipFaceCapture = usePrivacyStore((s) => s.setSkipFaceCapture);

  const photoCount = useOnboardingStore((s) => s.photos.length);
  const clearPhotos = useOnboardingStore((s) => s.clearPhotos);

  const refreshGuestTrialGate = useCallback(() => {
    setGuestTrialBlocked(isGuestOnboardingBlocked());
  }, []);

  useEffect(() => {
    refreshGuestTrialGate();
    const onAuthChanged = () => refreshGuestTrialGate();
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
  }, [refreshGuestTrialGate]);

  useEffect(() => {
    const persisted = readPersistedSkinInputMode();
    if (persisted && persisted !== "none" && useOnboardingStore.getState().skinInputMode === "none") {
      useOnboardingStore.getState().setSkinInputMode(persisted);
    }
  }, []);

  useEffect(() => {
    if (skipFaceCapture && !skipFaceCaptureWas.current) {
      clearPhotos();
    }
    skipFaceCaptureWas.current = skipFaceCapture;
  }, [skipFaceCapture, clearPhotos]);

  const summaryRecap = useMemo(() => buildSummaryRecap(ob, t), [ob, t]);

  const step = steps[idx];
  const analyzing = ob.analyzeStatus === "loading";
  const analyzeFailed = ob.analyzeStatus === "error";
  const aiFallbackManual = isAiFallbackManual(ob.skinInputMode);
  const showSkinSection =
    skipFaceCapture || ob.aiSnapshot != null || aiFallbackManual;
  const isManualReview = isManualSkinInput(
    ob.skinInputMode,
    skipFaceCapture,
    ob.aiSnapshot != null,
  );
  const needsAnalyze =
    step === "analyze" &&
    ob.photos.length >= ONBOARDING_MIN_PHOTOS &&
    !ob.aiSnapshot &&
    !skipFaceCapture &&
    !aiFallbackManual &&
    !analyzing &&
    !analyzeFailed;
  const blockInteraction = analyzing || finishing;

  useEffect(() => {
    if (!showSkinSection || !skinSectionRef.current) return;
    const t = window.setTimeout(() => {
      skinSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 120);
    return () => window.clearTimeout(t);
  }, [showSkinSection]);

  const addPhoto = useOnboardingStore((s) => s.addPhoto);

  const openCamera = useCallback(() => {
    cameraRef.current?.click();
  }, []);
  const openLibrary = useCallback(() => {
    fileRef.current?.click();
  }, []);

  const handlePhotoFiles = useCallback(
    (files: FileList | null, replace: boolean) => {
      if (!files?.length) return;
      setSkipFaceCapture(false);
      const list = Array.from(files);
      if (replace) {
        clearPhotos();
        void appendOnboardingPhotos(list, ONBOARDING_MAX_PHOTOS, addPhoto);
        return;
      }
      const remaining = Math.max(
        0,
        ONBOARDING_MAX_PHOTOS - useOnboardingStore.getState().photos.length,
      );
      void appendOnboardingPhotos(list, remaining, addPhoto);
    },
    [addPhoto, clearPhotos, setSkipFaceCapture],
  );

  async function runAnalyze() {
    if (ob.photos.length < ONBOARDING_MIN_PHOTOS) return;
    ob.setSkinInputMode("none");
    ob.setAnalyzeStatus("loading");
    try {
      const fd = new FormData();
      ob.photos.forEach((p) => fd.append("images", p.file));
      fd.append("locale", locale);
      const token = getAccessToken();
      const headers: HeadersInit = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetchOnboardingAi(
        `${apiBaseUrl}/api/v1/onboarding/analyze-skin`,
        { method: "POST", body: fd, headers },
        ONBOARDING_ANALYZE_TIMEOUT_MS,
      );
      const json = await parseJsonSafe(res);
      const data = assertAnalyzeSkinPayload(res, json);
      ob.applyAiAnalyzeResult(data);
      setSkipFaceCapture(false);
    } catch (err) {
      ob.setAnalyzeStatus("error", onboardingAiErrorKind(err));
    }
  }

  function chooseManualSkinAfterAnalyzeError() {
    ob.setSkinInputMode("manual_fallback");
    ob.setAnalyzeStatus("idle");
    if (!ob.undertone) ob.setUndertone("prefer_not");
  }

  function goSkipPhotos() {
    ob.clearPhotos();
    ob.setSkinInputMode("manual_skip");
    setSkipFaceCapture(true);
    if (!ob.undertone) ob.setUndertone("prefer_not");
  }

  function handlePrimary() {
    if (needsAnalyze) {
      void runAnalyze();
      return;
    }
    if (step === "summary") {
      void finish();
      return;
    }
    next();
  }

  const stickyContinueLabel = needsAnalyze
    ? t("analyzeCta")
    : step === "summary"
      ? t("finish")
      : t("next");

  const stickyCanContinue =
    needsAnalyze
      ? ob.photos.length >= ONBOARDING_MIN_PHOTOS
      : step === "summary"
        ? !finishing
        : canProceed(step, ob, skipFaceCapture);

  const showStickyContinue =
    step !== "analyze" || needsAnalyze || showSkinSection;

  const showFooterNav = showStickyContinue || idx > 0;

  function next() {
    setSlideDir(1);
    setIdx((i) => Math.min(i + 1, steps.length - 1));
  }

  function prev() {
    setSlideDir(-1);
    setIdx((i) => Math.max(i - 1, 0));
  }

  async function goToCoachWelcome(pack: CoachWelcomePayload) {
    const photosSkipped = skipFaceCapture || ob.photos.length === 0;
    let photoUrls: string[] | undefined;
    if (!photosSkipped) {
      try {
        photoUrls = await resolveReviewPhotoUrls(
          ob.photos.slice(0, ONBOARDING_MAX_PHOTOS),
          pack.reviewSummary?.photo_urls,
        );
      } catch {
        photoUrls = pack.reviewSummary?.photo_urls;
      }
    }
    const full: CoachWelcomePayload = {
      ...pack,
      locale,
      reviewSummary: {
        ...(pack.reviewSummary ?? buildReviewSummaryFromStore(ob)),
        photo_urls: photosSkipped ? undefined : photoUrls,
        photos_skipped: photosSkipped,
      },
    };
    try {
      sessionStorage.setItem(COACH_WELCOME_STORAGE_KEY, JSON.stringify(full));
      sessionStorage.setItem(ONBOARDING_EXIT_ANIM_KEY, "1");
      markJustCompletedOnboarding();
    } catch {
      /* storage full or private mode */
    }
    if (ob.skillMode) setSkillGlobal(ob.skillMode);
    ob.markComplete();
    router.push("/onboarding/coach-welcome");
  }

  /**
   * Finish onboarding — wait for AI with clear loading; offer retry + default routine on failure.
   */
  async function finish() {
    if (finishing) return;
    setFinishError(null);

    const photosSkipped = skipFaceCapture || ob.photos.length === 0;
    const finishBody = buildOnboardingFinishBody(ob, locale, photosSkipped);
    if (!finishBody) {
      setFinishError("save_failed");
      return;
    }

    const token = getAccessToken();
    setFinishing(true);

    try {
      if (!token) {
        const preview = await postGuestPreviewComplete(finishBody);
        const fallback = buildDefaultStarterRoutine(ob, locale);
        await goToCoachWelcome({
          profileId: GUEST_COACH_PROFILE_ID,
          guestPreview: true,
          starterRoutine: preview.starterRoutine ?? fallback,
          starterRoutinePending: preview.starterRoutinePending,
          previewJobId: preview.previewJobId,
          coachingNotes: ob.aiSnapshot?.coaching_notes?.trim() || undefined,
        });
        return;
      }

      const result = await postOnboardingComplete(
        finishBody,
        ob.photos,
        photosSkipped,
        token,
      );
      await goToCoachWelcome({
        profileId: result.profileId,
        starterRoutine: result.starterRoutine,
        starterRoutinePending: result.starterRoutinePending,
        coachingNotes: ob.aiSnapshot?.coaching_notes?.trim() || undefined,
        reviewSummary: { photo_urls: result.photoUrls },
      });
    } catch (err) {
      if (err instanceof OnboardingAiError && err.kind === "auth") {
        setFinishError("auth");
      } else {
        setFinishError(onboardingAiErrorKind(err));
      }
    } finally {
      setFinishing(false);
    }
  }

  async function finishWithDefaultRoutine() {
    if (finishing) return;
    setFinishError(null);

    const photosSkipped = skipFaceCapture || ob.photos.length === 0;
    const finishBody = buildOnboardingFinishBody(ob, locale, photosSkipped);
    if (!finishBody) {
      setFinishError("save_failed");
      return;
    }

    const fallback = buildDefaultStarterRoutine(ob, locale);
    const coachingNotes = ob.aiSnapshot?.coaching_notes?.trim() || undefined;
    const token = getAccessToken();

    setFinishing(true);
    try {
      if (!token) {
        await goToCoachWelcome({
          profileId: GUEST_COACH_PROFILE_ID,
          guestPreview: true,
          starterRoutine: fallback,
          starterRoutinePending: true,
          usedDefaultRoutine: true,
          coachingNotes,
        });
        void postGuestPreviewComplete(finishBody)
          .then((preview) => {
            patchCoachWelcomeSession({
              previewJobId: preview.previewJobId,
              starterRoutinePending: preview.starterRoutinePending,
              ...(preview.starterRoutine
                ? { starterRoutine: preview.starterRoutine, starterRoutinePending: false }
                : {}),
            });
          })
          .catch(() => {
            patchCoachWelcomeSession({ starterRoutinePending: false });
          });
        return;
      }

      await goToCoachWelcome({
        starterRoutine: fallback,
        starterRoutinePending: false,
        usedDefaultRoutine: true,
        coachingNotes,
      });

      postOnboardingCompleteBackground(
        finishBody,
        ob.photos,
        photosSkipped,
        token,
        (result) => {
          patchCoachWelcomeSession({
            profileId: result.profileId,
            starterRoutine: result.starterRoutine,
            starterRoutinePending: result.starterRoutinePending,
            reviewSummary: { photo_urls: result.photoUrls },
          });
        },
      );
    } finally {
      setFinishing(false);
    }
  }

  if (guestTrialBlocked === null) {
    return <OnboardingFlowSkeleton />;
  }

  if (guestTrialBlocked) {
    return (
      <GuestTrialGate
        title={t("guestTrial.title")}
        body1={t("guestTrial.body1")}
        body2={t("guestTrial.body2")}
        registerLabel={t("guestTrial.registerCta")}
        loginLabel={t("guestTrial.loginCta")}
        homeLabel={t("guestTrial.homeLink")}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 px-4 sm:space-y-6 sm:px-0">
      <div className="space-y-2 text-center sm:text-left">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {t("sectionLabel")}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("title")}</h1>
        <p className="text-sm text-muted-foreground sm:text-base">{t("intro")}</p>
      </div>

      <OnboardingProgress idx={idx} t={t} />

      <Card className="relative overflow-hidden border-border/80 shadow-sm">
        {analyzing && step === "analyze" && (
          <OnboardingAiLoading phase="analyze" overlay />
        )}
        {finishing && step === "summary" && (
          <OnboardingAiLoading phase="starterRoutine" overlay />
        )}
        <CardContent className="p-4 pt-5 sm:p-6 sm:pt-6">
          <OnboardingStepPanel stepKey={step} direction={slideDir}>
          {step === "analyze" && (
            <section className="space-y-5" aria-labelledby="onb-analyze-title">
              <div className="space-y-2">
                <h2 id="onb-analyze-title" className="text-lg font-semibold">
                  {t("analyze.title")}
                </h2>
                <p className="text-sm text-muted-foreground">{t("analyze.subtitle")}</p>
              </div>

              {showSkinSection ? (
                <>
                  {ob.photos.length > 0 ? (
                    <section
                      aria-label={t("review.photosSection")}
                      className="space-y-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-3"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("review.photosSection")}
                      </p>
                      <div className="grid grid-cols-3 gap-2 sm:max-w-md">
                        {ob.photos.map((p, i) => (
                          <OnboardingPhotoCard
                            key={p.preview}
                            previewUrl={p.preview}
                            altLabel={tCheckIn("altPhoto", { n: i + 1 })}
                            removeLabel={tPrivacy("captureCard.remove")}
                            onRemove={() => ob.removePhotoAt(i)}
                          />
                        ))}
                      </div>
                    </section>
                  ) : null}
                  <details className="rounded-xl border border-border/60 bg-muted/20 px-3 py-1">
                    <summary className="cursor-pointer py-2.5 text-sm font-medium">
                      {t("photos.changePhotos")}
                    </summary>
                    <div className="space-y-4 pb-3 pt-1">
                      <PhotoCaptureBlock
                        t={t}
                        tPrivacy={tPrivacy}
                        tCheckIn={tCheckIn}
                        openCamera={openCamera}
                        openLibrary={openLibrary}
                        onSkip={goSkipPhotos}
                        showSkip={false}
                        hidePhotoGrid
                      />
                    </div>
                  </details>
                </>
              ) : (
                <PhotoCaptureBlock
                  t={t}
                  tPrivacy={tPrivacy}
                  tCheckIn={tCheckIn}
                  openCamera={openCamera}
                  openLibrary={openLibrary}
                  onSkip={goSkipPhotos}
                  showSkip
                />
              )}

              {analyzeFailed && !aiFallbackManual && !analyzing && (
                <OnboardingAiErrorPanel
                  errorKind={ob.analyzeErrorKind ?? "unknown"}
                  onRetry={() => {
                    ob.setAnalyzeStatus("idle");
                    void runAnalyze();
                  }}
                  retryLabel={t("photos.errorRetry")}
                  secondaryLabel={t("aiLoading.manualSkin")}
                  onSecondary={chooseManualSkinAfterAnalyzeError}
                />
              )}

              {showSkinSection && (
                <div
                  ref={skinSectionRef}
                  key={ob.aiSnapshot ? "ai-skin" : aiFallbackManual ? "manual-fallback" : "manual-skip"}
                  className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-400"
                >
                <SkinProfilePanel
                  title={t("analyze.skinSection")}
                  subtitle={t("analyze.skinSectionHint")}
                >
              {aiFallbackManual && ob.photos.length >= ONBOARDING_MIN_PHOTOS ? (
                <ManualSkinFallbackBanner
                  title={t("aiLoading.manualSkinBannerTitle")}
                  body={t("aiLoading.manualSkinBannerBody")}
                  retryLabel={t("aiLoading.retryAnalyzeAiShort")}
                  onRetryAi={() => {
                    ob.setSkinInputMode("none");
                    void runAnalyze();
                  }}
                />
              ) : null}
              {ob.aiSnapshot && !isManualReview && (
                <details className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                  <summary className="cursor-pointer py-1 font-medium">
                    {t("aiReview.aiNotesToggle")} · {Math.round(ob.aiSnapshot.confidence * 100)}%
                  </summary>
                  <div className="space-y-2 pb-2 pt-2 text-muted-foreground">
                    <p>
                      {t("aiReview.barrier")}:{" "}
                      <span className="text-foreground">
                        {barrierLabel(t, ob.aiSnapshot.barrier_signal)}
                      </span>
                    </p>
                    {ob.aiSnapshot.coaching_notes ? (
                      <p className="leading-relaxed text-foreground">
                        {ob.aiSnapshot.coaching_notes}
                      </p>
                    ) : null}
                    {!ob.aiSnapshot.photo_quality.sufficient &&
                      ob.aiSnapshot.photo_quality.tips.length > 0 && (
                        <ul className="list-inside list-disc space-y-1">
                          {ob.aiSnapshot.photo_quality.tips.map((tip) => (
                            <li key={tip}>{tip}</li>
                          ))}
                        </ul>
                      )}
                  </div>
                </details>
              )}

              {/* Skin read from photos is a hint, not a diagnosis. */}
              {ob.aiSnapshot && !isManualReview ? (
                <AiDisclaimer variant="short" />
              ) : null}

              <QuickChipGrid
                title={t("steps.typeTitle")}
                options={(isManualReview ? MANUAL_QUICK_SKIN_TYPES : skinTypeOrder).map(
                  (k) => ({
                    id: k,
                    label: t(`skinType.${k}` as const),
                  }),
                )}
                selected={ob.skinType}
                onSelect={ob.setSkinType}
                columns={isManualReview ? 2 : 2}
              />

              {!isManualReview && (
                <QuickChipGrid
                  title={t("steps.undertoneTitle")}
                  options={QUICK_UNDERTONES.map((k) => ({
                    id: k,
                    label: t(`undertone.${k}` as const),
                  }))}
                  selected={ob.undertone}
                  onSelect={ob.setUndertone}
                  columns={2}
                />
              )}

              <ConcernChipRow
                title={t("aiReview.concerns")}
                hint={isManualReview ? t("aiReview.manualConcernsHint") : undefined}
                concernIds={
                  isManualReview ? MANUAL_QUICK_CONCERNS : PHOTO_QUICK_CONCERNS
                }
                selected={ob.aiConcernTags}
                onToggle={ob.toggleAiConcernTag}
                label={(id) => concernChipLabel(t, id)}
              />
                </SkinProfilePanel>
                </div>
              )}
            </section>
          )}

          {step === "quickInfo" && (
            <section className="space-y-4" aria-labelledby="onb-quick-title">
              <div className="space-y-1">
                <h2 id="onb-quick-title" className="text-lg font-semibold">
                  {t("quickInfo.title")}
                </h2>
                <p className="text-sm text-muted-foreground">{t("quickInfo.subtitle")}</p>
              </div>

              <QuickInfoGroup label={t("quickInfo.groupSkill")}>
                <QuickChipGrid
                  title={t("quickInfo.skillSection")}
                  hideTitle
                  options={skillOrder.map((m) => ({
                    id: m,
                    label: t(`skill.${m}.short` as const),
                  }))}
                  selected={ob.skillMode}
                  onSelect={ob.setSkillMode}
                  columns={3}
                />
              </QuickInfoGroup>

              <QuickInfoGroup label={t("quickInfo.groupGoal")}>
                <QuickChipGrid
                  title={t("quickInfo.goalSection")}
                  hideTitle
                  options={QUICK_GOALS.map((k) => ({
                    id: k,
                    label: t(`goal.${k}` as const),
                  }))}
                  selected={ob.goal}
                  onSelect={ob.setGoal}
                  columns={2}
                  size="large"
                />
              </QuickInfoGroup>
            </section>
          )}
          {step === "summary" && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">{t("summaryTitle")}</h2>
                <p className="text-sm text-muted-foreground">{t("summarySubtitle")}</p>
              </div>
              <ul className="space-y-2.5 rounded-xl border bg-muted/25 p-4 text-sm leading-relaxed">
                {summaryRecap.map((line) => (
                  <li key={line} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <details className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
                <summary className="cursor-pointer py-1 text-sm font-medium">
                  {t("summaryOptional")}
                </summary>
                <div className="space-y-3 pb-2 pt-3">
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
              </details>
              <p className="text-xs text-muted-foreground">{t("summaryFoot")}</p>
              {finishError ? (
                finishError === "save_failed" ? (
                  <FriendlyNotice variant="error" title={tAuth("finishNetworkError")}>
                    <Button type="button" size="sm" className="mt-2" onClick={() => void finish()}>
                      {t("aiLoading.retry")}
                    </Button>
                  </FriendlyNotice>
                ) : finishError === "auth" ? (
                  <FriendlyNotice variant="error" title={tAuth("finishNeedAuth")}>
                    <Button type="button" size="sm" className="mt-2" onClick={() => void finish()}>
                      {t("aiLoading.retry")}
                    </Button>
                  </FriendlyNotice>
                ) : (
                  <OnboardingAiErrorPanel
                    titleKey="aiLoading.routineErrorTitle"
                    errorKind={finishError}
                    onRetry={() => void finish()}
                    secondaryLabel={t("aiLoading.useDefaultRoutine")}
                    onSecondary={() => void finishWithDefaultRoutine()}
                  />
                )
              ) : null}
            </div>
          )}

          </OnboardingStepPanel>

          {showFooterNav ? (
            <OnboardingStickyNav
              backLabel={t("back")}
              continueLabel={
                finishing && step === "summary"
                  ? tAuth("submitting")
                  : stickyContinueLabel
              }
              onBack={prev}
              onContinue={handlePrimary}
              backDisabled={idx === 0 || blockInteraction}
              continueDisabled={!stickyCanContinue || blockInteraction}
              continueLoading={
                (analyzing && step === "analyze") || (finishing && step === "summary")
              }
              hideContinue={!showStickyContinue}
              continueIcon={
                step === "summary" ? (
                  <Sparkles className="size-5" aria-hidden />
                ) : undefined
              }
              primaryEmphasis={step === "summary"}
              singleCta={step === "summary"}
            />
          ) : null}
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/" className="underline underline-offset-4 hover:text-foreground">
          {t("homeLink")}
        </Link>
      </p>

      {/* Keep file inputs mounted outside <details> so programmatic .click() works on mobile. */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="user"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const replace = useOnboardingStore.getState().aiSnapshot != null;
          handlePhotoFiles(e.target.files, replace);
          e.target.value = "";
        }}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const replace = useOnboardingStore.getState().aiSnapshot != null;
          handlePhotoFiles(e.target.files, replace);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function PhotoCaptureBlock({
  t,
  tPrivacy,
  tCheckIn,
  openCamera,
  openLibrary,
  onSkip,
  showSkip,
  hidePhotoGrid = false,
}: {
  t: OnboardingT;
  tPrivacy: ReturnType<typeof useTranslations<"privacy">>;
  tCheckIn: ReturnType<typeof useTranslations<"checkIn">>;
  openCamera: () => void;
  openLibrary: () => void;
  onSkip: () => void;
  showSkip: boolean;
  hidePhotoGrid?: boolean;
}) {
  const ob = useOnboardingStore();
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{tPrivacy("captureCard.subtitle")}</p>

      {showSkip ? (
        <>
          <SkipPhotosButton
            title={t("photos.skipShyCta")}
            hint={t("photos.skipShyHint")}
            onClick={onSkip}
          />
          <p className="text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("photos.orUpload")}
          </p>
        </>
      ) : null}

      <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        {t("photos.tipsCompact")}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="min-h-12 gap-2"
          onClick={openCamera}
          disabled={ob.photos.length >= ONBOARDING_MAX_PHOTOS}
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
          disabled={ob.photos.length >= ONBOARDING_MAX_PHOTOS}
        >
          <ImagePlus className="size-4" aria-hidden />
          {tPrivacy("captureCard.actionLibrary")}
        </Button>
      </div>

      {ob.photos.length >= ONBOARDING_MAX_PHOTOS && (
        <p className="text-xs text-amber-600 dark:text-amber-400">{t("photos.maxPhotos")}</p>
      )}

      {ob.photos.length > 0 && ob.photos.length < ONBOARDING_MIN_PHOTOS && (
        <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
          {t("photos.needMore")}
        </p>
      )}

      {ob.photos.length > 0 && !hidePhotoGrid && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {ob.photos.map((p, i) => (
              <OnboardingPhotoCard
                key={p.preview}
                previewUrl={p.preview}
                altLabel={tCheckIn("altPhoto", { n: i + 1 })}
                removeLabel={tPrivacy("captureCard.remove")}
                onRemove={() => ob.removePhotoAt(i)}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => ob.clearPhotos()}>
              {tPrivacy("captureCard.removeAll")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={openLibrary}
              disabled={ob.photos.length >= ONBOARDING_MAX_PHOTOS}
            >
              {tPrivacy("captureCard.retake")}
            </Button>
          </div>
        </div>
      )}

      {ob.photos.length < 1 && !showSkip && (
        <FriendlyNotice variant="empty" title={t("photos.emptyTitle")}>
          {t("photos.emptyBody")}
        </FriendlyNotice>
      )}
    </div>
  );
}

function OnboardingPhotoCard({
  previewUrl,
  altLabel,
  removeLabel,
  onRemove,
}: {
  previewUrl: string;
  altLabel: string;
  removeLabel: string;
  onRemove: () => void;
}) {
  return (
    <figure className="space-y-1.5">
      <div className="relative aspect-3/4 overflow-hidden rounded-2xl border border-border bg-muted shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewUrl} alt={altLabel} className="size-full object-cover" />
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="absolute right-2 top-2 inline-flex size-9 items-center justify-center rounded-full bg-black/60 text-white shadow-md backdrop-blur transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:size-8"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </figure>
  );
}

function canProceed(
  step: OnboardingStepId,
  ob: ReturnType<typeof useOnboardingStore.getState>,
  skipFace: boolean,
): boolean {
  switch (step) {
    case "analyze": {
      const hasConcerns = ob.aiConcernTags.length > 0;
      const manualPath = isManualSkinInput(ob.skinInputMode, skipFace, ob.aiSnapshot != null);
      if (!manualPath && !ob.aiSnapshot) return false;
      if (manualPath && !ob.aiSnapshot) {
        return ob.skinType != null && hasConcerns;
      }
      return ob.skinType != null && ob.undertone != null && hasConcerns;
    }
    case "quickInfo":
      return ob.goal != null && ob.skillMode != null;
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
/** Shown when a guest has already completed their one free onboarding on this device. */
function GuestTrialGate({
  title,
  body1,
  body2,
  registerLabel,
  loginLabel,
  homeLabel,
}: {
  title: string;
  body1: string;
  body2: string;
  registerLabel: string;
  loginLabel: string;
  homeLabel: string;
}) {
  return (
    <div className="mx-auto w-full max-w-md px-4 sm:px-0">
      <Card className="overflow-hidden border-amber-200/70 bg-gradient-to-br from-amber-50/90 via-background to-primary/5 shadow-lg dark:border-amber-500/25 dark:from-amber-950/40 dark:to-primary/10">
        <CardContent className="space-y-6 p-6 text-center sm:p-8">
          <div
            className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-amber-100 text-amber-600 shadow-inner motion-safe:animate-in motion-safe:zoom-in motion-safe:duration-500 dark:bg-amber-900/50 dark:text-amber-300"
            aria-hidden
          >
            <Laugh className="size-8" />
          </div>
          <div className="space-y-3">
            <h2 className="text-xl font-bold leading-snug tracking-tight sm:text-2xl">
              {title}
            </h2>
            <div className="space-y-2.5 text-left text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p>{body1}</p>
              <p>{body2}</p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <ButtonLink
              href="/register"
              size="lg"
              className="min-h-12 w-full text-base font-semibold"
            >
              {registerLabel}
            </ButtonLink>
            <ButtonLink href="/login" size="lg" variant="outline" className="min-h-11 w-full">
              {loginLabel}
            </ButtonLink>
          </div>
          <p>
            <Link
              href="/"
              className="text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
            >
              {homeLabel}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

