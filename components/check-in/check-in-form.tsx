"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { CaptureModeToggle } from "@/components/check-in/capture-mode-toggle";
import { SkipModePanel } from "@/components/check-in/skip-mode-panel";
import {
  UploadPhotos,
  compactPhotoSlots,
  itemsToSlots,
  type PhotoSlots,
} from "@/components/check-in/upload-photos";
import { useRouter } from "@/i18n/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { AiFeedbackLoading } from "@/components/check-in/ai-feedback-loading";
import { DailyCoachFeedback } from "@/components/check-in/daily-coach-feedback";
import { useCheckInFeedback } from "@/components/check-in/use-check-in-feedback";
import { StreakMilestoneHost } from "@/components/progress/streak-milestone-celebration";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IconDismissButton } from "@/components/ui/icon-dismiss-button";
import { Link } from "@/i18n/navigation";
import { apiBaseUrl } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-token";
import type { SkillMode } from "@/lib/stores/onboarding-store";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { usePrivacyHydrated } from "@/lib/use-privacy-hydrated";
import { usePrivacyStore } from "@/lib/stores/privacy-store";
import { useSkillStore } from "@/lib/stores/skill-store";
import { CHECKIN_PHOTO_MAX_MB } from "@/lib/check-in/photo-upload-validation";
import { cn } from "@/lib/utils";
import type { CreateSkinCheckResponseDTO } from "@/lib/types/skin-check";

/** Matches backend `domain.SkinCondition` string values. */
const conditionIds = [
  "dry",
  "oily",
  "combo",
  "normal",
  "sensitive",
  "breakout",
  "redness",
  "inflammation",
  "dull",
  "dehydrated",
  "hyperpigmentation",
  "clogged_pores",
  "pih",
  "weak_barrier",
  "large_pores",
] as const;

/** Matches backend `domain.SkinSymptom` string values. */
const symptomIds = [
  "itching",
  "stinging",
  "new_breakouts",
  "post_acne_marks",
  "recent_sun_exposure",
  "mask_friction",
] as const;

export function CheckInForm() {
  const t = useTranslations("checkIn");
  const tCoach = useTranslations("checkIn.coach");
  const tRoutine = useTranslations("routine");
  const locale = useLocale();
  const [photoSlots, setPhotoSlots] = useState<PhotoSlots>([null, null]);
  const [title, setTitle] = useState("");
  const [userNote, setUserNote] = useState("");
  const [environmentNote, setEnvironmentNote] = useState("");
  const [conditions, setConditions] = useState<string[]>([]);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  // Public timeline is not shipped yet — always private to avoid a false privacy choice.
  const visibility = "private" as const;
  const router = useRouter();
  const feedback = useCheckInFeedback();
  // Inline error banner replaces native alert() — much friendlier on mobile (no modal
  // popups stealing focus or breaking scroll). Auto-cleared on next submit attempt.
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const feedbackAnchorRef = useRef<HTMLDivElement>(null);
  const errorAnchorRef = useRef<HTMLDivElement>(null);

  const privacyHydrated = usePrivacyHydrated();
  const skipFaceCaptureStored = usePrivacyStore((s) => s.skipFaceCapture);
  const skipFaceCapture = privacyHydrated && skipFaceCaptureStored;
  const setSkipFaceCapture = usePrivacyStore((s) => s.setSkipFaceCapture);

  // Show an inline error in a sticky-friendly banner and scroll it into view so
  // users on small screens never miss it.
  function showError(msg: string) {
    setErrorMsg(msg);
    requestAnimationFrame(() => {
      errorAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const scrollToFeedback = useCallback(() => {
    requestAnimationFrame(() => {
      feedbackAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const handleViewLater = useCallback(() => {
    feedback.dismissWait();
    router.push("/progress");
  }, [feedback, router]);

  const skillMode = useSkillStore((s) => s.mode);
  const setSkillMode = useSkillStore((s) => s.setMode);
  const onboardingSkill = useOnboardingStore((s) => s.skillMode);
  const onboardingDone = useOnboardingStore((s) => s.completedAt);

  const items = compactPhotoSlots(photoSlots);
  const skipModeReady =
    conditions.length > 0 ||
    symptoms.length > 0 ||
    userNote.trim().length > 0;
  const canSubmit = skipFaceCapture ? skipModeReady : items.length > 0;

  const itemsRef = useRef(items);
  itemsRef.current = items;

  const revokeAllPhotos = useCallback((slots: PhotoSlots) => {
    slots.forEach((x) => {
      if (x) URL.revokeObjectURL(x.url);
    });
  }, []);

  useEffect(() => {
    if (!skillMode && onboardingSkill) {
      setSkillMode(onboardingSkill);
    }
  }, [skillMode, onboardingSkill, setSkillMode]);

  useEffect(() => {
    return () => {
      revokeAllPhotos(itemsRef.current.length ? itemsToSlots(itemsRef.current) : [null, null]);
    };
  }, [revokeAllPhotos]);

  function handleSlotsChange(next: PhotoSlots) {
    setPhotoSlots((prev) => {
      prev.forEach((old, i) => {
        const neu = next[i];
        if (old && old !== neu) URL.revokeObjectURL(old.url);
      });
      return next;
    });
  }

  function toggleCondition(id: string) {
    setConditions((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  }

  function toggleSymptom(id: string) {
    setSymptoms((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  }

  /**
   * Reset the form back to its initial state.
   *
   * The previous implementation relied on `<Button type="reset">` plus the
   * browser's native form-reset semantics — that only works for *uncontrolled*
   * inputs. All our fields are controlled with `useState`, so native reset
   * left the React state in place and the user saw stale photos / tags / notes.
   * This handler clears every controlled slice explicitly and revokes object
   * URLs so we don't leak memory after multiple clear cycles.
   */
  function resetForm() {
    revokeAllPhotos(photoSlots);
    setPhotoSlots([null, null]);
    setTitle("");
    setUserNote("");
    setEnvironmentNote("");
    setConditions([]);
    setSymptoms([]);
    feedback.resetFeedback();
    setErrorMsg(null);
  }

  /** Switch into skip-face (tag + notes only) mode. Clears staged photos. */
  const enterSkipMode = useCallback(() => {
    revokeAllPhotos(photoSlots);
    setPhotoSlots([null, null]);
    setSkipFaceCapture(true);
    setErrorMsg(null);
  }, [photoSlots, revokeAllPhotos, setSkipFaceCapture]);

  const exitSkipMode = useCallback(() => {
    setSkipFaceCapture(false);
    setErrorMsg(null);
  }, [setSkipFaceCapture]);

  return (
    <form
      className="mx-auto w-full max-w-lg space-y-6 lg:max-w-none"
      onSubmit={async (e) => {
        e.preventDefault();
        setErrorMsg(null);
        if (skipFaceCapture) {
          if (!skipModeReady) {
            showError(t("skipModeNeedTags"));
            return;
          }
        } else if (items.length === 0) {
          showError(t("needImage"));
          return;
        }
        feedback.beginSubmit();
        scrollToFeedback();
        try {
          const fd = new FormData();
          if (skipFaceCapture) {
            fd.append("skip_mode", "true");
          } else {
            items.forEach((x) => fd.append("images", x.file));
          }
          fd.append("title", title);
          fd.append("user_note", userNote);
          fd.append("environment_note", environmentNote);
          fd.append("conditions", JSON.stringify(conditions));
          fd.append("symptoms", JSON.stringify(symptoms));
          fd.append("visibility", visibility);
          fd.append(
            "climate_context",
            JSON.stringify({
              coach_skill_level: skillMode ?? "beginner",
              client: "dadiary-web",
              ui_locale: locale,
            }),
          );

          const headers: Record<string, string> = {};
          const auth = getAccessToken();
          if (auth) headers.Authorization = `Bearer ${auth}`;

          const res = await fetch(`${apiBaseUrl}/api/v1/skin-checks`, {
            method: "POST",
            body: fd,
            // Omit credentials: auth is Bearer-only. `include` + CORS `*` breaks browsers (opaque CORS error).
            headers,
          });

          const raw = await res.json().catch(() => ({}));
          if (res.ok && raw?.success && raw?.data) {
            feedback.onSubmitSuccess(raw.data as CreateSkinCheckResponseDTO);
            scrollToFeedback();
          } else if (res.status === 401) {
            feedback.onSubmitError();
            showError(t("needAuth"));
          } else {
            feedback.onSubmitError();
            const errCode =
              typeof raw === "object" &&
              raw !== null &&
              "error" in raw &&
              typeof (raw as { error?: { code?: string } }).error?.code === "string"
                ? (raw as { error: { code: string } }).error.code
                : "";
            const serverMsg =
              typeof raw === "object" &&
              raw !== null &&
              "error" in raw &&
              typeof (raw as { error?: { message?: string } }).error?.message ===
                "string"
                ? (raw as { error: { message: string } }).error.message
                : "";

            if (res.status === 413 || errCode === "file_too_large") {
              showError(
                t("photoErrorTooLargeShort", { maxMb: CHECKIN_PHOTO_MAX_MB }),
              );
            } else if (errCode === "moderation_failed") {
              showError(t("photoErrorModeration"));
            } else if (errCode === "missing_images" && skipFaceCapture) {
              showError(t("submitErrorMissingImages"));
            } else if (res.status === 429 || errCode === "rate_limited") {
              showError(t("submitErrorRateLimited"));
            } else if (
              res.status === 403 &&
              (errCode === "feature_denied" || errCode === "premium_required")
            ) {
              showError(t("photoAngleLockedHint"));
            } else if (res.status >= 500 || res.status === 0) {
              showError(t("submitErrorNetwork"));
            } else {
              showError(
                serverMsg
                  ? t("submitErrorGeneric", { status: res.status, detail: serverMsg })
                  : t("submitErrorGeneric", {
                      status: res.status,
                      detail: t("submitErrorUnknown"),
                    }),
              );
            }
          }
        } catch {
          feedback.onSubmitError();
          showError(t("submitErrorNetwork"));
        }
      }}
    >
      <div className="flex flex-col gap-6 lg:grid lg:max-w-5xl lg:grid-cols-[1.05fr_1fr] lg:gap-8 xl:mx-auto">
      <div className="space-y-3">
        <CaptureModeToggle
          skipMode={skipFaceCapture}
          photoLabel={t("modeTogglePhoto")}
          skipLabel={t("modeToggleSkip")}
          onSelectPhoto={exitSkipMode}
          onSelectSkip={enterSkipMode}
          disabled={feedback.isWaiting}
        />
        <Card
          className={cn(
            "overflow-hidden shadow-sm transition-all duration-300 lg:shadow-md",
            skipFaceCapture && "border-primary/15",
          )}
        >
          <CardContent className="p-4 sm:p-6">
            {!skipFaceCapture ? (
              <UploadPhotos
                slots={photoSlots}
                onSlotsChange={handleSlotsChange}
              />
            ) : (
              <SkipModePanel
                onBack={exitSkipMode}
                readyToSubmit={skipModeReady}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 lg:min-w-0">
        <Card>
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div>
              <h2 className="text-base font-semibold tracking-tight">{t("modeTitle")}</h2>
              <p className="text-sm text-muted-foreground">
                {onboardingDone ? (
                  <span className="text-foreground">{t("modeFromOnboarding")}</span>
                ) : (
                  <Link
                    href="/onboarding"
                    className="font-medium text-primary underline underline-offset-4"
                  >
                    {t("modeLinkRoutine")}
                  </Link>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["beginner", tRoutine("modeBeginner")],
                  ["intermediate", tRoutine("modeIntermediate")],
                  ["advanced", tRoutine("modeAdvanced")],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSkillMode(id as SkillMode)}
                  className={cn(
                    "min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    skillMode === id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{t("modeHint")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-4 sm:p-6">
            <Field label={t("fieldUserNote")} htmlFor="user_note">
              <textarea
                id="user_note"
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
                placeholder={t("placeholderUserNote")}
                rows={3}
                className={cn(
                  "min-h-[5.5rem] w-full resize-none rounded-xl border bg-background px-3 py-2.5 text-base outline-none ring-ring/40 transition focus:border-primary focus:ring-2 sm:text-sm",
                  skipFaceCapture &&
                    !skipModeReady &&
                    "border-amber-500/40 focus:border-amber-500 focus:ring-amber-500/30",
                )}
              />
              {skipFaceCapture && !skipModeReady ? (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {t("skipModeNeedTagsHint")}
                </p>
              ) : null}
            </Field>

            <Field label={t("fieldConditions")}>
              <div className="flex flex-wrap gap-1.5">
                {conditionIds.map((id) => {
                  const on = conditions.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      data-testid={`checkin-condition-${id}`}
                      onClick={() => toggleCondition(id)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        on
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {t(`conditions.${id}` as const)}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label={t("fieldSymptoms")}>
              <p className="text-xs text-muted-foreground">{t("symptomsHint")}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {symptomIds.map((id) => {
                  const on = symptoms.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleSymptom(id)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        on
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      {t(`symptoms.${id}` as const)}
                    </button>
                  );
                })}
              </div>
            </Field>

            <details className="group rounded-xl border border-border bg-muted/20 open:bg-muted/30">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
                <span>{t("advancedToggle")}</span>
                <ChevronDown
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <div className="space-y-4 border-t border-border px-4 py-4">
                <Field label={t("fieldTitle")} htmlFor="title">
                  <input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t("placeholderTitle")}
                    className="h-11 w-full rounded-xl border bg-background px-3 text-base outline-none ring-ring/40 transition focus:border-primary focus:ring-2 sm:h-9 sm:text-sm"
                  />
                </Field>

                <Field label={t("fieldEnv")} htmlFor="environment_note">
                  <textarea
                    id="environment_note"
                    value={environmentNote}
                    onChange={(e) => setEnvironmentNote(e.target.value)}
                    placeholder={t("placeholderEnv")}
                    rows={2}
                    className="w-full resize-none rounded-xl border bg-background px-3 py-2 text-base outline-none ring-ring/40 transition focus:border-primary focus:ring-2 sm:text-sm"
                  />
                </Field>

                <Field label={t("fieldVisibility")}>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      aria-pressed="true"
                      className="min-h-11 flex-1 rounded-xl border border-primary bg-primary/5 px-3 py-2 text-sm text-primary sm:min-h-9 sm:rounded-md"
                    >
                      {t("visibilityPrivate")}
                    </button>
                    <button
                      type="button"
                      disabled
                      aria-disabled="true"
                      title={t("visibilityPublicSoonHint")}
                      className="min-h-11 flex-1 cursor-not-allowed rounded-xl border border-dashed px-3 py-2 text-sm text-muted-foreground opacity-70 sm:min-h-9 sm:rounded-md"
                    >
                      {t("visibilityPublicSoon")}
                    </button>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                    {t("visibilityPublicSoonHint")}
                  </p>
                </Field>
              </div>
            </details>
          </CardContent>
        </Card>
      </div>
      </div>

      <div ref={feedbackAnchorRef} className="scroll-mt-24 space-y-3">
        {feedback.phase === "idle" ? (
          <p className="rounded-xl border border-dashed bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
            {t("coachBeforeSubmit")}
          </p>
        ) : null}

        {feedback.phase === "submitting" ? (
          <AiFeedbackLoading variant="submitting" progress={0} />
        ) : null}

        {feedback.phase === "processing" ? (
          <AiFeedbackLoading
            variant="processing"
            progress={feedback.fakeProgress}
            statusStep={feedback.statusStep}
            isSlow={feedback.isSlow}
            isResumed={feedback.isResumed}
            startedAt={feedback.startedAt}
            onCancelWait={feedback.cancelWait}
            onViewLater={handleViewLater}
          />
        ) : null}

        {feedback.phase === "timeout" ? (
          <AiFeedbackLoading
            variant="timeout"
            progress={feedback.fakeProgress}
            isResumed={feedback.isResumed}
            onRetryPolling={feedback.retryPolling}
            onViewLater={handleViewLater}
          />
        ) : null}

        {feedback.phase === "failed" ? (
          <FeedbackFailedCard
            message={
              feedback.failureMessage ?? tCoach("failedUnknown")
            }
            onRetry={feedback.resetFeedback}
            retryLabel={tCoach("retry")}
            title={tCoach("failedTitle")}
          />
        ) : null}

        {feedback.phase === "completed" && feedback.payload ? (
          <DailyCoachFeedback
            payload={feedback.payload}
            onRetry={feedback.resetFeedback}
          />
        ) : null}
      </div>

      <div
        ref={errorAnchorRef}
        aria-live="assertive"
        aria-atomic="true"
        className="scroll-mt-24"
      >
        {errorMsg ? (
          <InlineErrorBanner
            message={errorMsg}
            onDismiss={() => setErrorMsg(null)}
            dismissLabel={t("errorDismiss")}
          />
        ) : null}
      </div>

      <div
        className={cn(
          "sticky bottom-0 z-20 -mx-4 flex flex-col gap-3 border-t bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:static lg:z-0 lg:mx-0 lg:flex-row lg:items-center lg:justify-between lg:rounded-xl lg:border lg:bg-card lg:px-4 lg:py-4 lg:pb-4",
        )}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground sm:text-sm">
          <span className="inline-flex items-center gap-2">
            <Sparkles className="size-4 shrink-0 text-primary" aria-hidden />
            {t("afterSubmit")}
          </span>
          <Link
            href="/cabinet"
            className="font-medium text-primary underline underline-offset-4"
          >
            {t("linkCabinet")}
          </Link>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-11 flex-1 sm:min-h-9 sm:flex-none"
            disabled={feedback.isWaiting}
            onClick={resetForm}
          >
            {t("reset")}
          </Button>
          <Button
            type="submit"
            data-testid="checkin-submit"
            size="default"
            className="min-h-12 flex-[2] sm:min-h-9 sm:flex-initial"
            disabled={feedback.isWaiting || !canSubmit}
          >
            {feedback.phase === "submitting"
              ? t("submitting")
              : skipFaceCapture
                ? t("noFaceSubmit")
                : t("analyzeToday")}
          </Button>
        </div>
      </div>

      <StreakMilestoneHost />
    </form>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

/** Inline error when AI analysis fails after submit. */
function FeedbackFailedCard({
  title,
  message,
  retryLabel,
  onRetry,
}: {
  title: string;
  message: string;
  retryLabel: string;
  onRetry: () => void;
}) {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="space-y-3 pt-6">
        <div className="flex items-center gap-2 font-medium text-destructive" role="alert">
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          {title}
        </div>
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button type="button" variant="outline" size="sm" className="min-h-11 gap-2 sm:min-h-9" onClick={onRetry}>
          <RefreshCw className="size-4" aria-hidden />
          {retryLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

/** Inline, dismissible error banner. Replaces native alert() so errors live inside
 *  the page flow on mobile (no focus-stealing modal, no scroll break). */
function InlineErrorBanner({
  message,
  onDismiss,
  dismissLabel,
}: {
  message: string;
  onDismiss: () => void;
  dismissLabel: string;
}) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive shadow-sm motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-300"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p className="flex-1 leading-relaxed">{message}</p>
      <IconDismissButton
        onClick={onDismiss}
        ariaLabel={dismissLabel}
        className="text-destructive/70 hover:bg-destructive/15 hover:text-destructive"
      >
        <X className="size-4" aria-hidden />
      </IconDismissButton>
    </div>
  );
}
