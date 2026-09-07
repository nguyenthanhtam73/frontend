"use client";

import { useLocale, useTranslations } from "next-intl";
import { Laugh, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { OnboardingAiErrorPanel } from "@/components/onboarding/onboarding-ai-error-panel";
import { OnboardingAiLoading } from "@/components/onboarding/onboarding-ai-loading";
import { OnboardingFlowSkeleton } from "@/components/onboarding/onboarding-flow-skeleton";
import { OnboardingStepSkinProfile } from "@/components/onboarding/onboarding-steps";
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
import { buildAuthHrefWithNext } from "@/lib/auth/return-path";
import { markAwaitingFirstCheckIn } from "@/lib/activation/first-check-in";
import { FUNNEL_EVENTS, trackFunnelEvent } from "@/lib/analytics/funnel";
import { buildStepStarterRoutine } from "@/lib/onboarding/build-step-routine";
import { appendOnboardingPhotos } from "@/lib/onboarding/compress-photo";
import { GUEST_CLAIM_RETURN_PATH } from "@/lib/onboarding/claim-guest-coach-welcome";
import {
  patchCoachWelcomeSession,
  readCoachWelcomeSession,
  writeCoachWelcomeSession,
} from "@/lib/onboarding/coach-welcome-session";
import {
  buildDefaultStarterRoutine,
  resolveWelcomeStarter,
} from "@/lib/onboarding/guest-starter";
import {
  postGuestPreviewComplete,
  postOnboardingComplete,
} from "@/lib/onboarding/finish-request";
import { buildOnboardingFinishBody } from "@/lib/onboarding/finish-body";
import {
  clearOnboardingSkipped,
  persistOnboardingSkipped,
} from "@/lib/onboarding/skip";
import { inferSkinTypeFromConcerns } from "@/lib/onboarding/infer-skin-type";
import {
  canContinueStep1,
  canProceedStep1Basics,
  isQuickSkinType,
  isStep1SkinTypePickerVisible,
  shouldAdvanceFromStep1,
  shouldRunAnalyze as shouldRunAnalyzeGate,
} from "@/lib/onboarding/step1-gate";
import { useAuthStore } from "@/lib/stores/auth-store";
import {
  assertAnalyzeSkinPayload,
  fetchOnboardingAi,
  isRejectedPhotoError,
  onboardingAiErrorKind,
  OnboardingAiError,
  parseJsonSafe,
  type OnboardingAiErrorKind,
} from "@/lib/onboarding/onboarding-ai";
import { resolveReviewPhotoUrls } from "@/lib/onboarding/photo-session-urls";
import { saveGuestClaimPhotos } from "@/lib/onboarding/guest-photo-idb";
import { buildReviewSummaryFromStore } from "@/lib/onboarding/review-data";
import {
  ONBOARDING_ANALYZE_TIMEOUT_MS,
  ONBOARDING_MAX_PHOTOS,
  ONBOARDING_MIN_PHOTOS,
  ONBOARDING_EXIT_ANIM_KEY,
} from "@/lib/onboarding/constants";
import {
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

function step1GateFromStore(
  ob: ReturnType<typeof useOnboardingStore.getState>,
  skipFace: boolean,
  analyzing: boolean,
) {
  return {
    hasGoal: ob.goal != null,
    concernCount: ob.aiConcernTags.length,
    skipFace,
    photoCount: ob.photos.length,
    hasAiSnapshot: ob.aiSnapshot != null,
    analyzing,
    skinType: ob.skinType,
    skinInputMode: ob.skinInputMode,
  };
}

function canProceedStep1(ob: ReturnType<typeof useOnboardingStore.getState>): boolean {
  return canProceedStep1Basics({
    hasGoal: ob.goal != null,
    concernCount: ob.aiConcernTags.length,
  });
}

function shouldRunAnalyze(
  ob: ReturnType<typeof useOnboardingStore.getState>,
  skipFace: boolean,
): boolean {
  return shouldRunAnalyzeGate({
    skipFace,
    photoCount: ob.photos.length,
    hasAiSnapshot: ob.aiSnapshot != null,
    analyzing: ob.analyzeStatus === "loading",
  });
}

function applyManualProfile(skipFace: boolean) {
  const ob = useOnboardingStore.getState();
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
  // Product affiliate intros stay for Premium (same as Free) — never strip merge.
  const blockAnalyzeCommerceMerge = false;

  const [guestTrialBlocked, setGuestTrialBlocked] = useState<boolean | null>(null);
  const [idx, setIdx] = useState(0);
  const [slideDir, setSlideDir] = useState<1 | -1>(1);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<OnboardingAiErrorKind | "save_failed" | null>(null);
  /** Which finish path last failed — drives Retry / secondary actions. */
  const [finishErrorSource, setFinishErrorSource] = useState<"ai" | "default" | null>(null);
  const [skippingToApp, setSkippingToApp] = useState(false);
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
  const blockInteraction = analyzing || finishing || skippingToApp;

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
      const state = useOnboardingStore.getState();
      // A staged photo was rejected upstream. Appending would keep the bad one,
      // and does nothing at all once three are staged — so start the set over.
      const rejected =
        state.analyzeStatus === "error" &&
        state.analyzeErrorKind != null &&
        isRejectedPhotoError(state.analyzeErrorKind);
      const before = replace || rejected ? 0 : state.photos.length;
      if (replace || rejected) {
        clearPhotos();
        void appendOnboardingPhotos(list, ONBOARDING_MAX_PHOTOS, addPhoto).then(() => {
          const count = useOnboardingStore.getState().photos.length;
          if (count > before) {
            trackFunnelEvent(FUNNEL_EVENTS.photoAdded, { count, source: "replace" });
          }
        });
        return;
      }
      const remaining = Math.max(0, ONBOARDING_MAX_PHOTOS - before);
      void appendOnboardingPhotos(list, remaining, addPhoto).then(() => {
        const count = useOnboardingStore.getState().photos.length;
        if (count > before) {
          trackFunnelEvent(FUNNEL_EVENTS.photoAdded, { count, source: "add" });
        }
      });
    },
    [addPhoto, clearPhotos, setSkipFaceCapture],
  );

  async function runAnalyze(): Promise<boolean> {
    const state = useOnboardingStore.getState();
    if (state.photos.length < ONBOARDING_MIN_PHOTOS) return true;

    analyzeSkipRequested.current = false;
    state.setSkinInputMode("none");
    state.setAnalyzeStatus("loading");
    trackFunnelEvent(FUNNEL_EVENTS.photosSubmitted, {
      count: state.photos.length,
    });
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
    const state = useOnboardingStore.getState();
    // Loading/error fallback still infers so a long wait can leave step 1.
    if (!isQuickSkinType(state.skinType)) {
      state.setSkinType(inferSkinTypeFromConcerns(state.aiConcernTags, state.goal));
    }
    buildRoutineForStep2(locale, routineLabelFn);
    setSlideDir(1);
    setIdx((i) => Math.min(i + 1, steps.length - 1));
  }

  /**
   * Second chance from step 2 after a failed read. Always lands on step 1 — the
   * readback confirms a good result there, and too-few photos are fixed there too.
   */
  function retryAnalyzeFromRoutine() {
    const state = useOnboardingStore.getState();
    state.setAnalyzeStatus("idle");
    setSlideDir(-1);
    setIdx(0);
    if (state.photos.length >= ONBOARDING_MIN_PHOTOS) void runAnalyze();
  }

  function continueWithoutPhotos() {
    clearPhotos();
    setSkipFaceCapture(true);
    const ob = useOnboardingStore.getState();
    ob.setSkinType(null);
    applyManualProfile(true);
  }

  async function advanceFromStep1() {
    const state = useOnboardingStore.getState();
    const gate = step1GateFromStore(state, skipFaceCapture, false);
    if (!canProceedStep1Basics(gate)) return;

    if (shouldRunAnalyze(state, skipFaceCapture)) {
      const ok = await runAnalyze();
      if (!ok) return;
      // Stay on step 1 so the user can confirm/override the 5-type guess.
      return;
    }

    if (!shouldAdvanceFromStep1(step1GateFromStore(useOnboardingStore.getState(), skipFaceCapture, false))) {
      if (
        skipFaceCapture ||
        useOnboardingStore.getState().photos.length < ONBOARDING_MIN_PHOTOS
      ) {
        continueWithoutPhotos();
      }
      return;
    }

    const nextState = useOnboardingStore.getState();
    if (!nextState.aiSnapshot) {
      applyManualProfile(skipFaceCapture || nextState.photos.length === 0);
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
      trackFunnelEvent(FUNNEL_EVENTS.routineAccepted, {
        guest: !getAccessToken(),
        edited: useOnboardingStore.getState().starterRoutineUserEdited,
      });
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
    const guestish =
      !getAccessToken() ||
      pack.guestPreview === true ||
      pack.profileId === GUEST_COACH_PROFILE_ID;

    let photoUrls: string[] | undefined;
    let guestPhotosIdb = false;
    if (!photosSkipped) {
      if (guestish) {
        // Prefer IndexedDB over sessionStorage data URLs (quota + blob revoke).
        try {
          const n = await saveGuestClaimPhotos(
            state.photos.slice(0, ONBOARDING_MAX_PHOTOS),
          );
          guestPhotosIdb = n > 0;
        } catch {
          guestPhotosIdb = false;
        }
        if (!guestPhotosIdb) {
          try {
            photoUrls = await resolveReviewPhotoUrls(
              state.photos.slice(0, ONBOARDING_MAX_PHOTOS),
              pack.reviewSummary?.photo_urls,
            );
          } catch {
            photoUrls = pack.reviewSummary?.photo_urls;
          }
        }
      } else {
        try {
          photoUrls = await resolveReviewPhotoUrls(
            state.photos.slice(0, ONBOARDING_MAX_PHOTOS),
            pack.reviewSummary?.photo_urls,
          );
        } catch {
          photoUrls = pack.reviewSummary?.photo_urls;
        }
      }
    }

    const baseReview = pack.reviewSummary ?? buildReviewSummaryFromStore(state);
    let sessionPhotoUrls: string[] | undefined;
    if (!photosSkipped && !guestPhotosIdb && photoUrls?.length) {
      const persistent = photoUrls.filter((u) => !u.startsWith("data:"));
      // Prefer /uploads paths; fall back to data URLs only when IDB save failed.
      sessionPhotoUrls = persistent.length ? persistent : photoUrls;
    }
    const reviewSummary = {
      ...baseReview,
      photo_urls: sessionPhotoUrls,
      photos_skipped: photosSkipped,
      // Premium: drop analyze from session cache so reload can't rehydrate brands.
      skin_analysis: blockAnalyzeCommerceMerge
        ? undefined
        : baseReview.skin_analysis,
    };

    const full: CoachWelcomePayload = {
      ...pack,
      starterRoutine: resolveWelcomeStarter({
        userRoutine,
        packStarter: pack.starterRoutine,
        analysis: blockAnalyzeCommerceMerge
          ? null
          : (state.aiSnapshot ?? baseReview.skin_analysis),
        noAds: blockAnalyzeCommerceMerge,
        locale,
      }),
      locale,
      reviewSummary,
      guestPhotosIdb: guestPhotosIdb || undefined,
    };

    try {
      writeCoachWelcomeSession(full);
      sessionStorage.setItem(ONBOARDING_EXIT_ANIM_KEY, "1");
      markJustCompletedOnboarding();
    } catch {
      /* storage full — IDB photos still available for claim */
      try {
        const slim: CoachWelcomePayload = {
          ...full,
          reviewSummary: {
            ...full.reviewSummary,
            photo_urls: undefined,
            skin_analysis: full.reviewSummary?.skin_analysis
              ? {
                  ...full.reviewSummary.skin_analysis,
                  // keep coaching notes; strip bulky guidance if needed
                }
              : undefined,
          },
        };
        writeCoachWelcomeSession(slim);
        sessionStorage.setItem(ONBOARDING_EXIT_ANIM_KEY, "1");
        markJustCompletedOnboarding();
      } catch {
        /* ignore */
      }
    }

    if (state.skillMode) setSkillGlobal(state.skillMode);
    state.markComplete();
    if (!guestish) markAwaitingFirstCheckIn(useAuthStore.getState().user?.id);
    router.push("/onboarding/coach-welcome");
  }

  async function finish() {
    if (finishing) return;
    setFinishError(null);
    setFinishErrorSource(null);

    const state = useOnboardingStore.getState();
    const photosSkipped = skipFaceCapture || state.photos.length === 0;
    const userRoutine =
      state.starterRoutine ?? buildDefaultStarterRoutine(state, locale);
    // Build payload (incl. edited morning/evening) before any navigation.
    const finishBody = buildOnboardingFinishBody(
      state,
      locale,
      photosSkipped,
      userRoutine,
    );
    if (!finishBody) {
      setFinishError("save_failed");
      setFinishErrorSource("ai");
      return;
    }

    const token = getAccessToken();
    setFinishing(true);

    try {
      if (!token) {
        // Don't block the signup moment on preview-complete — guests already
        // have a local routine from step 2. Patch session when the job lands.
        await goToCoachWelcome({
          profileId: GUEST_COACH_PROFILE_ID,
          guestPreview: true,
          starterRoutine: userRoutine,
          starterRoutinePending: !state.starterRoutineUserEdited,
          coachingNotes: state.aiSnapshot?.coaching_notes?.trim() || undefined,
        });
        void postGuestPreviewComplete(finishBody)
          .then((preview) => {
            if (useOnboardingStore.getState().starterRoutineUserEdited) {
              patchCoachWelcomeSession({
                previewJobId: preview.previewJobId,
                previewAccessToken: preview.previewAccessToken,
                starterRoutinePending: false,
              });
              return;
            }
            patchCoachWelcomeSession({
              previewJobId: preview.previewJobId,
              previewAccessToken: preview.previewAccessToken,
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

      const result = await postOnboardingComplete(
        finishBody,
        state.photos,
        photosSkipped,
        token,
      );
      const auth = useAuthStore.getState();
      clearOnboardingSkipped(auth.user?.id);
      // Optimistic: avoid gate bouncing check-in before /me refresh lands.
      if (auth.user) {
        useAuthStore.setState({
          user: {
            ...auth.user,
            onboarding_completed: true,
            onboarding_skipped: false,
          },
        });
      }
      void auth.refresh();
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
      setFinishErrorSource("ai");
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
    setFinishErrorSource(null);

    const state = useOnboardingStore.getState();
    const photosSkipped = skipFaceCapture || state.photos.length === 0;
    const fallback = state.starterRoutine ?? buildDefaultStarterRoutine(state, locale);
    state.setStarterRoutine(fallback);
    const finishBody = buildOnboardingFinishBody(
      useOnboardingStore.getState(),
      locale,
      photosSkipped,
      fallback,
    );
    if (!finishBody) {
      setFinishError("save_failed");
      setFinishErrorSource("default");
      return;
    }

    const coachingNotes = state.aiSnapshot?.coaching_notes?.trim() || undefined;
    const token = getAccessToken();

    setFinishing(true);
    try {
      if (!token) {
        // Guest: navigate immediately with local fallback; preview job patches session.
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
                previewAccessToken: preview.previewAccessToken,
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

      // Auth: await complete before navigate so profileId / feedback are ready.
      const result = await postOnboardingComplete(
        finishBody,
        state.photos,
        photosSkipped,
        token,
      );
      const auth = useAuthStore.getState();
      clearOnboardingSkipped(auth.user?.id);
      if (auth.user) {
        useAuthStore.setState({
          user: {
            ...auth.user,
            onboarding_completed: true,
            onboarding_skipped: false,
          },
        });
      }
      void auth.refresh();

      await goToCoachWelcome({
        profileId: result.profileId,
        starterRoutine: result.starterRoutine ?? fallback,
        starterRoutinePending: result.starterRoutinePending,
        usedDefaultRoutine: true,
        coachingNotes,
        reviewSummary: { photo_urls: result.photoUrls },
      });
    } catch (err) {
      setFinishErrorSource("default");
      if (err instanceof OnboardingAiError && err.kind === "auth") {
        setFinishError("auth");
      } else {
        setFinishError(onboardingAiErrorKind(err));
      }
    } finally {
      setFinishing(false);
    }
  }

  async function skipOnboardingToApp() {
    if (skippingToApp) return;
    setSkippingToApp(true);
    let userId = useAuthStore.getState().user?.id;
    if (!userId && getAccessToken()) {
      await useAuthStore.getState().refresh();
      userId = useAuthStore.getState().user?.id;
    }
    if (!userId) {
      // No session identity yet — don't enter a gate bounce loop.
      setSkippingToApp(false);
      return;
    }
    try {
      await persistOnboardingSkipped(userId);
      const auth = useAuthStore.getState();
      if (auth.user) {
        useAuthStore.setState({
          user: { ...auth.user, onboarding_skipped: true },
        });
      }
    } catch {
      // Local flag already written — still leave so the user is not trapped.
    }
    // Keep disabled through navigation; unmount clears state.
    router.push("/check-in");
  }

  const stickyContinueLabel =
    step === "skinProfile"
      ? analyzing
        ? tAuth("submitting")
        : t("next")
      : finishing
        ? tAuth("submitting")
        : routineEditing
          ? t("step2.saveAndUseRoutine")
          : t("step2.useRoutine");

  const stickyCanContinue =
    step === "skinProfile"
      ? canContinueStep1(step1GateFromStore(ob, skipFaceCapture, analyzing))
      : ob.starterRoutine != null && !finishing;

  if (guestTrialBlocked === null) {
    return <OnboardingFlowSkeleton />;
  }

  if (guestTrialBlocked) {
    if (readCoachWelcomeSession()?.starterRoutine) {
      router.replace("/onboarding/coach-welcome");
      return <OnboardingFlowSkeleton />;
    }
    return (
      <GuestTrialGate
        title={t("guestTrial.title")}
        body1={t("guestTrial.body1")}
        body2={t("guestTrial.body2")}
        registerLabel={t("guestTrial.registerCta")}
        loginLabel={t("guestTrial.loginCta")}
        homeLabel={t("guestTrial.homeLink")}
        viewRoutineLabel={t("guestTrial.viewRoutineCta")}
      />
    );
  }

  const showSkipToApp = Boolean(getAccessToken());

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 px-4 sm:space-y-6 sm:px-0">
      <div className="space-y-2 text-center sm:text-left">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {t("sectionLabel")}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("title")}</h1>
        <p className="text-sm text-muted-foreground sm:text-base">{t("intro")}</p>
        {showSkipToApp ? (
          <p className="pt-1">
            <button
              type="button"
              disabled={skippingToApp}
              onClick={() => void skipOnboardingToApp()}
              data-testid="onboarding-skip-to-app"
              aria-busy={skippingToApp}
              className="text-sm font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-60"
            >
              {skippingToApp ? tAuth("submitting") : t("skipToApp")}
            </button>
          </p>
        ) : null}
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
        {finishing && step === "starterRoutine" && (
          <OnboardingAiLoading phase="starterRoutine" overlay />
        )}
        <CardContent>
          <OnboardingStepPanel stepKey={step} direction={slideDir}>
            {step === "skinProfile" && (
              <OnboardingStepSkinProfile
                analyzing={analyzing}
                analyzeFailed={ob.analyzeStatus === "error"}
                analyzeErrorKind={ob.analyzeErrorKind}
                aiSnapshot={ob.aiSnapshot}
                showSkinTypePicker={isStep1SkinTypePickerVisible({
                  hasAiSnapshot: ob.aiSnapshot != null,
                  skipFace: skipFaceCapture,
                  skinInputMode: ob.skinInputMode,
                })}
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
              <>
                <OnboardingStepStarterRoutine
                  editing={routineEditing}
                  onToggleEditing={() => setRoutineEditing((v) => !v)}
                  onRetryAnalyze={retryAnalyzeFromRoutine}
                />
                {finishError ? (
                  finishError === "save_failed" ? (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
                      <p className="font-medium">{tAuth("finishNetworkError")}</p>
                      <Button
                        type="button"
                        size="sm"
                        className="mt-2"
                        onClick={() =>
                          void (finishErrorSource === "default"
                            ? finishWithDefaultRoutine()
                            : finish())
                        }
                      >
                        {t("aiLoading.retry")}
                      </Button>
                    </div>
                  ) : finishError === "auth" ? (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
                      <p className="font-medium">{tAuth("finishNeedAuth")}</p>
                      <Button
                        type="button"
                        size="sm"
                        className="mt-2"
                        onClick={() =>
                          void (finishErrorSource === "default"
                            ? finishWithDefaultRoutine()
                            : finish())
                        }
                      >
                        {t("aiLoading.retry")}
                      </Button>
                    </div>
                  ) : finishErrorSource === "default" ? (
                    <OnboardingAiErrorPanel
                      titleKey="aiLoading.routineErrorTitle"
                      errorKind={finishError}
                      onRetry={() => void finish()}
                      retryLabel={t("aiLoading.retryAiRoutine")}
                      secondaryLabel={t("aiLoading.retry")}
                      onSecondary={() => void finishWithDefaultRoutine()}
                    />
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

          {step === "skinProfile" && !analyzing ? (
            !canProceedStep1(ob) ? (
              <p className="mt-4 text-center text-xs leading-snug text-amber-700 dark:text-amber-300 sm:text-left">
                {t("step1.continueBlockedHint")}
              </p>
            ) : isStep1SkinTypePickerVisible({
                hasAiSnapshot: ob.aiSnapshot != null,
                skipFace: skipFaceCapture,
                skinInputMode: ob.skinInputMode,
              }) && !isQuickSkinType(ob.skinType) ? (
              <p className="mt-4 text-center text-xs leading-snug text-amber-700 dark:text-amber-300 sm:text-left">
                {t("step1.skinTypeRequiredHint")}
              </p>
            ) : null
          ) : null}

          <OnboardingStickyNav
            backLabel={t("back")}
            continueLabel={stickyContinueLabel}
            onBack={prev}
            onContinue={next}
            backDisabled={idx === 0 || blockInteraction}
            continueDisabled={!stickyCanContinue || blockInteraction}
            continueLoading={
              (analyzing && step === "skinProfile") ||
              (finishing && step === "starterRoutine")
            }
            continueIcon={
              step === "starterRoutine" && !routineEditing ? (
                <Sparkles className="size-5" aria-hidden />
              ) : undefined
            }
            primaryEmphasis={step === "starterRoutine" && !routineEditing}
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
  viewRoutineLabel,
}: {
  title: string;
  body1: string;
  body2: string;
  registerLabel: string;
  loginLabel: string;
  homeLabel: string;
  viewRoutineLabel: string;
}) {
  const hasRoutine = Boolean(readCoachWelcomeSession()?.starterRoutine);
  const registerHref = buildAuthHrefWithNext("/register", GUEST_CLAIM_RETURN_PATH);
  const loginHref = buildAuthHrefWithNext("/login", GUEST_CLAIM_RETURN_PATH);
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
              href={registerHref}
              size="lg"
              className="min-h-12 w-full text-base font-semibold"
              onClick={() =>
                trackFunnelEvent(FUNNEL_EVENTS.signupCtaClick, {
                  surface: "guest_trial_gate",
                })
              }
            >
              {registerLabel}
            </ButtonLink>
            <ButtonLink href={loginHref} size="lg" variant="outline" className="min-h-11 w-full">
              {loginLabel}
            </ButtonLink>
            {hasRoutine ? (
              <ButtonLink
                href="/onboarding/coach-welcome"
                size="lg"
                variant="ghost"
                className="min-h-11 w-full"
              >
                {viewRoutineLabel}
              </ButtonLink>
            ) : null}
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
