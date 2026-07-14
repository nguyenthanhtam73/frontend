"use client";

import { useLocale, useTranslations } from "next-intl";
import { Laugh, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { OnboardingAiErrorPanel } from "@/components/onboarding/onboarding-ai-error-panel";
import { OnboardingAiLoading } from "@/components/onboarding/onboarding-ai-loading";
import { OnboardingFlowSkeleton } from "@/components/onboarding/onboarding-flow-skeleton";
import {
  OnboardingStepReady,
  OnboardingStepSkinProfile,
} from "@/components/onboarding/onboarding-steps";
import { OnboardingStepStarterRoutine } from "@/components/onboarding/onboarding-starter-routine-step";
import {
  OnboardingProgress,
  OnboardingStepPanel,
  OnboardingStickyNav,
} from "@/components/onboarding/onboarding-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button-link";
import { Link, useRouter } from "@/i18n/navigation";
import { apiBaseUrl } from "@/lib/api";
import { getAccessToken, AUTH_CHANGED_EVENT } from "@/lib/auth-token";
import { buildStepStarterRoutine } from "@/lib/onboarding/build-step-routine";
import { appendOnboardingPhotos } from "@/lib/onboarding/compress-photo";
import { patchCoachWelcomeSession } from "@/lib/onboarding/coach-welcome-session";
import { buildDefaultStarterRoutine } from "@/lib/onboarding/guest-starter";
import {
  postGuestPreviewComplete,
  postOnboardingComplete,
  postOnboardingCompleteBackground,
} from "@/lib/onboarding/finish-request";
import { buildOnboardingFinishBody } from "@/lib/onboarding/finish-body";
import { inferSkinTypeFromConcerns } from "@/lib/onboarding/infer-skin-type";
import {
  assertAnalyzeSkinPayload,
  fetchOnboardingAi,
  onboardingAiErrorKind,
  OnboardingAiError,
  parseJsonSafe,
  type OnboardingAiErrorKind,
} from "@/lib/onboarding/onboarding-ai";
import { resolveReviewPhotoUrls } from "@/lib/onboarding/photo-session-urls";
import { buildReviewSummaryFromStore } from "@/lib/onboarding/review-data";
import {
  ONBOARDING_ANALYZE_TIMEOUT_MS,
  ONBOARDING_MAX_PHOTOS,
  ONBOARDING_MIN_PHOTOS,
  ONBOARDING_EXIT_ANIM_KEY,
} from "@/lib/onboarding/constants";
import {
  COACH_WELCOME_STORAGE_KEY,
  GUEST_COACH_PROFILE_ID,
  type CoachWelcomePayload,
} from "@/lib/types/starter-routine";
import {
  isGuestOnboardingBlocked,
  markJustCompletedOnboarding,
  ONBOARDING_STEPS,
  readPersistedSkinInputMode,
  useOnboardingStore,
} from "@/lib/stores/onboarding-store";
import { usePrivacyHydrated } from "@/lib/use-privacy-hydrated";
import { usePrivacyStore } from "@/lib/stores/privacy-store";
import { useSkillStore } from "@/lib/stores/skill-store";

const steps = ONBOARDING_STEPS;

function canProceedStep1(ob: ReturnType<typeof useOnboardingStore.getState>): boolean {
  return ob.goal != null && ob.aiConcernTags.length >= 1;
}

function shouldRunAnalyze(
  ob: ReturnType<typeof useOnboardingStore.getState>,
  skipFace: boolean,
): boolean {
  return (
    !skipFace &&
    ob.photos.length >= ONBOARDING_MIN_PHOTOS &&
    !ob.aiSnapshot &&
    ob.analyzeStatus !== "loading"
  );
}

function applyManualProfile(skipFace: boolean) {
  const ob = useOnboardingStore.getState();
  const concerns = ob.aiConcernTags;
  const inferred = inferSkinTypeFromConcerns(concerns, ob.goal);
  if (!ob.skinType) ob.setSkinType(inferred);
  if (!ob.undertone) ob.setUndertone("prefer_not");
  ob.setSkinInputMode(skipFace || ob.photos.length === 0 ? "manual_skip" : "manual_fallback");
  ob.setAnalyzeStatus("idle");
}

function buildRoutineForStep2(
  locale: string,
  labelFn?: (key: string) => string,
) {
  const ob = useOnboardingStore.getState();
  if (!ob.starterRoutine || !ob.starterRoutineUserEdited) {
    ob.setStarterRoutine(buildStepStarterRoutine(ob, locale, labelFn));
  }
}

export function OnboardingFlow() {
  const t = useTranslations("onboarding");
  const tAuth = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();

  const [guestTrialBlocked, setGuestTrialBlocked] = useState<boolean | null>(null);
  const [idx, setIdx] = useState(0);
  const [slideDir, setSlideDir] = useState<1 | -1>(1);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<OnboardingAiErrorKind | "save_failed" | null>(null);
  const [routineEditing, setRoutineEditing] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const skipFaceCaptureWas = useRef(false);
  const analyzeSkipRequested = useRef(false);

  const ob = useOnboardingStore();
  const setSkillGlobal = useSkillStore((s) => s.setMode);
  const privacyHydrated = usePrivacyHydrated();
  const skipFaceCaptureStored = usePrivacyStore((s) => s.skipFaceCapture);
  const skipFaceCapture = privacyHydrated && skipFaceCaptureStored;
  const setSkipFaceCapture = usePrivacyStore((s) => s.setSkipFaceCapture);

  const clearPhotos = useOnboardingStore((s) => s.clearPhotos);
  const addPhoto = useOnboardingStore((s) => s.addPhoto);

  const routineLabelFn = useCallback(
    (key: string) => {
      try {
        return t(key as Parameters<typeof t>[0]);
      } catch {
        return key;
      }
    },
    [t],
  );

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

  const step = steps[idx];
  const analyzing = ob.analyzeStatus === "loading";
  const blockInteraction = analyzing || finishing;

  const openCamera = useCallback(() => {
    setSkipFaceCapture(false);
    cameraRef.current?.click();
  }, [setSkipFaceCapture]);

  const openLibrary = useCallback(() => {
    setSkipFaceCapture(false);
    fileRef.current?.click();
  }, [setSkipFaceCapture]);

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

  async function runAnalyze(): Promise<boolean> {
    const state = useOnboardingStore.getState();
    if (state.photos.length < ONBOARDING_MIN_PHOTOS) return true;

    analyzeSkipRequested.current = false;
    state.setSkinInputMode("none");
    state.setAnalyzeStatus("loading");
    try {
      const fd = new FormData();
      state.photos.forEach((p) => fd.append("images", p.file));
      fd.append("locale", locale);
      const token = getAccessToken();
      const headers: HeadersInit = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetchOnboardingAi(
        `${apiBaseUrl}/api/v1/onboarding/analyze-skin`,
        { method: "POST", body: fd, headers },
        ONBOARDING_ANALYZE_TIMEOUT_MS,
      );
      if (analyzeSkipRequested.current || useOnboardingStore.getState().analyzeStatus !== "loading") {
        return false;
      }
      const json = await parseJsonSafe(res);
      const data = assertAnalyzeSkinPayload(res, json);
      if (analyzeSkipRequested.current || useOnboardingStore.getState().analyzeStatus !== "loading") {
        return false;
      }
      useOnboardingStore.getState().applyAiAnalyzeResult(data);
      setSkipFaceCapture(false);
      return true;
    } catch (err) {
      if (analyzeSkipRequested.current) return false;
      useOnboardingStore.getState().setAnalyzeStatus("error", onboardingAiErrorKind(err));
      return false;
    }
  }

  function skipAnalyzeAndProceed() {
    analyzeSkipRequested.current = true;
    useOnboardingStore.getState().setAnalyzeStatus("idle");
    applyManualProfile(skipFaceCapture);
    buildRoutineForStep2(locale, routineLabelFn);
    setSlideDir(1);
    setIdx((i) => Math.min(i + 1, steps.length - 1));
  }

  function continueWithoutPhotos() {
    clearPhotos();
    setSkipFaceCapture(true);
    applyManualProfile(true);
    if (shouldRunAnalyze(useOnboardingStore.getState(), true)) return;
    buildRoutineForStep2(locale, routineLabelFn);
    setSlideDir(1);
    setIdx((i) => Math.min(i + 1, steps.length - 1));
  }

  async function advanceFromStep1() {
    const state = useOnboardingStore.getState();
    if (!canProceedStep1(state)) return;

    if (shouldRunAnalyze(state, skipFaceCapture)) {
      const ok = await runAnalyze();
      if (!ok) return;
    } else if (!state.aiSnapshot) {
      applyManualProfile(skipFaceCapture || state.photos.length === 0);
    }

    buildRoutineForStep2(locale, routineLabelFn);
    setSlideDir(1);
    setIdx((i) => Math.min(i + 1, steps.length - 1));
  }

  function next() {
    if (step === "skinProfile") {
      void advanceFromStep1();
      return;
    }
    if (step === "starterRoutine") {
      setRoutineEditing(false);
      useOnboardingStore.getState().markStarterRoutineAccepted();
      setSlideDir(1);
      setIdx((i) => Math.min(i + 1, steps.length - 1));
      return;
    }
    if (step === "ready") {
      void finish();
    }
  }

  function prev() {
    setSlideDir(-1);
    setIdx((i) => Math.max(i - 1, 0));
  }

  async function goToCoachWelcome(pack: CoachWelcomePayload) {
    const state = useOnboardingStore.getState();
    const photosSkipped = skipFaceCapture || state.photos.length === 0;
    const userRoutine = state.starterRoutine;

    let photoUrls: string[] | undefined;
    if (!photosSkipped) {
      try {
        photoUrls = await resolveReviewPhotoUrls(
          state.photos.slice(0, ONBOARDING_MAX_PHOTOS),
          pack.reviewSummary?.photo_urls,
        );
      } catch {
        photoUrls = pack.reviewSummary?.photo_urls;
      }
    }

    const full: CoachWelcomePayload = {
      ...pack,
      starterRoutine: userRoutine ?? pack.starterRoutine,
      locale,
      reviewSummary: {
        ...(pack.reviewSummary ?? buildReviewSummaryFromStore(state)),
        photo_urls: photosSkipped ? undefined : photoUrls,
        photos_skipped: photosSkipped,
      },
    };

    try {
      sessionStorage.setItem(COACH_WELCOME_STORAGE_KEY, JSON.stringify(full));
      sessionStorage.setItem(ONBOARDING_EXIT_ANIM_KEY, "1");
      markJustCompletedOnboarding();
    } catch {
      /* storage full */
    }

    if (state.skillMode) setSkillGlobal(state.skillMode);
    state.markComplete();
    router.push("/onboarding/coach-welcome");
  }

  async function finish() {
    if (finishing) return;
    setFinishError(null);

    const state = useOnboardingStore.getState();
    const photosSkipped = skipFaceCapture || state.photos.length === 0;
    const finishBody = buildOnboardingFinishBody(state, locale, photosSkipped);
    if (!finishBody) {
      setFinishError("save_failed");
      return;
    }

    const userRoutine =
      state.starterRoutine ?? buildDefaultStarterRoutine(state, locale);
    const token = getAccessToken();
    setFinishing(true);

    try {
      if (!token) {
        const preview = await postGuestPreviewComplete(finishBody);
        const fallback = buildDefaultStarterRoutine(state, locale);
        await goToCoachWelcome({
          profileId: GUEST_COACH_PROFILE_ID,
          guestPreview: true,
          starterRoutine: state.starterRoutineUserEdited
            ? userRoutine
            : (preview.starterRoutine ?? fallback),
          starterRoutinePending: state.starterRoutineUserEdited
            ? false
            : preview.starterRoutinePending,
          previewJobId: preview.previewJobId,
          coachingNotes: state.aiSnapshot?.coaching_notes?.trim() || undefined,
        });
        return;
      }

      const result = await postOnboardingComplete(
        finishBody,
        state.photos,
        photosSkipped,
        token,
      );
      await goToCoachWelcome({
        profileId: result.profileId,
        starterRoutine: state.starterRoutineUserEdited
          ? userRoutine
          : result.starterRoutine,
        starterRoutinePending: state.starterRoutineUserEdited
          ? false
          : result.starterRoutinePending,
        coachingNotes: state.aiSnapshot?.coaching_notes?.trim() || undefined,
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

    const state = useOnboardingStore.getState();
    const photosSkipped = skipFaceCapture || state.photos.length === 0;
    const finishBody = buildOnboardingFinishBody(state, locale, photosSkipped);
    if (!finishBody) {
      setFinishError("save_failed");
      return;
    }

    const fallback = state.starterRoutine ?? buildDefaultStarterRoutine(state, locale);
    state.setStarterRoutine(fallback);
    const coachingNotes = state.aiSnapshot?.coaching_notes?.trim() || undefined;
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
            if (!useOnboardingStore.getState().starterRoutineUserEdited) {
              patchCoachWelcomeSession({
                previewJobId: preview.previewJobId,
                starterRoutinePending: preview.starterRoutinePending,
                ...(preview.starterRoutine
                  ? { starterRoutine: preview.starterRoutine, starterRoutinePending: false }
                  : {}),
              });
            }
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
        state.photos,
        photosSkipped,
        token,
        (result) => {
          if (!useOnboardingStore.getState().starterRoutineUserEdited) {
            patchCoachWelcomeSession({
              profileId: result.profileId,
              starterRoutine: result.starterRoutine,
              starterRoutinePending: result.starterRoutinePending,
              reviewSummary: { photo_urls: result.photoUrls },
            });
          }
        },
      );
    } finally {
      setFinishing(false);
    }
  }

  const stickyContinueLabel =
    step === "skinProfile"
      ? analyzing
        ? tAuth("submitting")
        : t("next")
      : step === "starterRoutine"
        ? routineEditing
          ? t("step2.useRoutine")
          : t("step2.useRoutine")
        : finishing
          ? tAuth("submitting")
          : t("step3.finish");

  const stickyCanContinue =
    step === "skinProfile"
      ? canProceedStep1(ob) && !analyzing
      : step === "starterRoutine"
        ? ob.starterRoutine != null
        : !finishing;

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
        {analyzing && step === "skinProfile" && (
          <OnboardingAiLoading
            phase="analyze"
            overlay
            onUseDefault={skipAnalyzeAndProceed}
            useDefaultLabel={t("aiLoading.useDefaultNow")}
          />
        )}
        {finishing && step === "ready" && (
          <OnboardingAiLoading phase="starterRoutine" overlay />
        )}
        <CardContent className="p-4 pt-5 sm:p-6 sm:pt-6">
          <OnboardingStepPanel stepKey={step} direction={slideDir}>
            {step === "skinProfile" && (
              <OnboardingStepSkinProfile
                analyzing={analyzing}
                analyzeFailed={ob.analyzeStatus === "error"}
                analyzeErrorKind={ob.analyzeErrorKind}
                aiSnapshot={ob.aiSnapshot}
                onRetryAnalyze={() => {
                  ob.setAnalyzeStatus("idle");
                  void runAnalyze();
                }}
                onSkipAnalyze={skipAnalyzeAndProceed}
                openCamera={openCamera}
                openLibrary={openLibrary}
                onContinueWithoutPhotos={continueWithoutPhotos}
              />
            )}

            {step === "starterRoutine" && (
              <OnboardingStepStarterRoutine
                editing={routineEditing}
                onToggleEditing={() => setRoutineEditing((v) => !v)}
              />
            )}

            {step === "ready" && (
              <>
                <OnboardingStepReady />
                {finishError ? (
                  finishError === "save_failed" ? (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
                      <p className="font-medium">{tAuth("finishNetworkError")}</p>
                      <Button type="button" size="sm" className="mt-2" onClick={() => void finish()}>
                        {t("aiLoading.retry")}
                      </Button>
                    </div>
                  ) : finishError === "auth" ? (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
                      <p className="font-medium">{tAuth("finishNeedAuth")}</p>
                      <Button type="button" size="sm" className="mt-2" onClick={() => void finish()}>
                        {t("aiLoading.retry")}
                      </Button>
                    </div>
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
              </>
            )}
          </OnboardingStepPanel>

          <OnboardingStickyNav
            backLabel={t("back")}
            continueLabel={stickyContinueLabel}
            onBack={prev}
            onContinue={next}
            backDisabled={idx === 0 || blockInteraction}
            continueDisabled={!stickyCanContinue || blockInteraction}
            continueLoading={
              (analyzing && step === "skinProfile") || (finishing && step === "ready")
            }
            continueIcon={step === "ready" ? <Sparkles className="size-5" aria-hidden /> : undefined}
            primaryEmphasis={step === "ready"}
            singleCta={step === "ready"}
          />
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/" className="underline underline-offset-4 hover:text-foreground">
          {t("homeLink")}
        </Link>
      </p>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="user"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          handlePhotoFiles(e.target.files, false);
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
          handlePhotoFiles(e.target.files, false);
          e.target.value = "";
        }}
      />
    </div>
  );
}

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
            <h2 className="text-xl font-bold leading-snug tracking-tight sm:text-2xl">{title}</h2>
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
