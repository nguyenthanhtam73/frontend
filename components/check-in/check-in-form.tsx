"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  AlertCircle,
  Camera,
  ChevronDown,
  ImageIcon,
  ImageOff,
  ImagePlus,
  Lightbulb,
  Loader2,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { DailyCoachFeedback } from "@/components/check-in/daily-coach-feedback";
import { FacePrivacyConsentDialog } from "@/components/privacy/face-privacy-consent-dialog";
import { useConsentGate } from "@/components/privacy/use-consent-gate";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { apiBaseUrl } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-token";
import { blurFaceInImage, type BlurMethod } from "@/lib/privacy/face-blur";
import type { SkillMode } from "@/lib/stores/onboarding-store";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { usePrivacyStore } from "@/lib/stores/privacy-store";
import { useSkillStore } from "@/lib/stores/skill-store";
import type { CreateSkinCheckResponseDTO } from "@/lib/types/skin-check";
import { cn } from "@/lib/utils";

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

type UploadItem = { file: File; url: string; blurMethod: BlurMethod };

export function CheckInForm() {
  const t = useTranslations("checkIn");
  const tPrivacy = useTranslations("privacy");
  const tRoutine = useTranslations("routine");
  const locale = useLocale();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const cameraBackRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [title, setTitle] = useState("");
  const [userNote, setUserNote] = useState("");
  const [environmentNote, setEnvironmentNote] = useState("");
  const [conditions, setConditions] = useState<string[]>([]);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [submitting, setSubmitting] = useState(false);
  const [coachPayload, setCoachPayload] = useState<CreateSkinCheckResponseDTO | null>(
    null,
  );
  /**
   * Number of files currently being blurred on-device + last error if a blur
   * failed. The "Send for analysis" button is disabled while inflight > 0 so
   * the user can never accidentally submit a half-processed batch.
   */
  const [blurStatus, setBlurStatus] = useState<{ inflight: number; error: string | null }>({
    inflight: 0,
    error: null,
  });
  // Inline error banner replaces native alert() — much friendlier on mobile (no modal
  // popups stealing focus or breaking scroll). Auto-cleared on next submit attempt.
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const feedbackAnchorRef = useRef<HTMLDivElement>(null);
  const errorAnchorRef = useRef<HTMLDivElement>(null);

  const skipFaceCapture = usePrivacyStore((s) => s.skipFaceCapture);
  const setSkipFaceCapture = usePrivacyStore((s) => s.setSkipFaceCapture);
  const consent = useConsentGate();

  // Show an inline error in a sticky-friendly banner and scroll it into view so
  // users on small screens never miss it.
  function showError(msg: string) {
    setErrorMsg(msg);
    requestAnimationFrame(() => {
      errorAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const skillMode = useSkillStore((s) => s.mode);
  const setSkillMode = useSkillStore((s) => s.setMode);
  const onboardingSkill = useOnboardingStore((s) => s.skillMode);
  const onboardingDone = useOnboardingStore((s) => s.completedAt);

  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    if (!skillMode && onboardingSkill) {
      setSkillMode(onboardingSkill);
    }
  }, [skillMode, onboardingSkill, setSkillMode]);

  useEffect(() => {
    return () => {
      itemsRef.current.forEach((x) => URL.revokeObjectURL(x.url));
    };
  }, []);

  /**
   * Build a blurred preview for the UI while keeping the original file for
   * upload — the backend AI needs the full image for accurate skin analysis.
   */
  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const remainingSlots = Math.max(0, 6 - items.length);
    const queue: File[] = [];
    let skippedEmpty = 0;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      if (file.size <= 0) {
        skippedEmpty += 1;
        return;
      }
      if (queue.length >= remainingSlots) return;
      queue.push(file);
    });
    if (skippedEmpty > 0) {
      showError(t("emptyImageSkipped"));
    }
    if (queue.length === 0) return;

    setBlurStatus((s) => ({ inflight: s.inflight + queue.length, error: null }));

    for (const file of queue) {
      try {
        const blurred = await blurFaceInImage(file);
        const newItem: UploadItem = {
          file,
          url: blurred.previewUrl,
          blurMethod: blurred.method,
        };
        setItems((cur) => [...cur, newItem].slice(0, 6));
        setBlurStatus((s) => ({ inflight: Math.max(0, s.inflight - 1), error: s.error }));
      } catch (err) {
        console.warn("[check-in] face-blur failed", err);
        setBlurStatus((s) => ({
          inflight: Math.max(0, s.inflight - 1),
          error: t("blurFailure"),
        }));
      }
    }
  }

  const openCamera = useCallback(() => {
    consent.requestCapture(() => cameraRef.current?.click());
  }, [consent]);
  const openCameraBack = useCallback(() => {
    consent.requestCapture(() => cameraBackRef.current?.click());
  }, [consent]);
  const openLibrary = useCallback(() => {
    consent.requestCapture(() => fileRef.current?.click());
  }, [consent]);

  function removeAt(idx: number) {
    setItems((cur) => {
      const copy = [...cur];
      const [removed] = copy.splice(idx, 1);
      if (removed) URL.revokeObjectURL(removed.url);
      return copy;
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
    setItems((cur) => {
      cur.forEach((x) => URL.revokeObjectURL(x.url));
      return [];
    });
    setTitle("");
    setUserNote("");
    setEnvironmentNote("");
    setConditions([]);
    setSymptoms([]);
    setVisibility("private");
    setCoachPayload(null);
    setErrorMsg(null);
    setBlurStatus({ inflight: 0, error: null });
  }

  /**
   * Switch into skip-face (tag + notes only) mode. Drops any inflight blurred
   * photos so we don't accidentally upload them on the next submit, and
   * keeps the rest of the form (notes, tags) intact since those are exactly
   * what the user is now relying on.
   */
  const enterSkipMode = useCallback(() => {
    setItems((cur) => {
      cur.forEach((x) => URL.revokeObjectURL(x.url));
      return [];
    });
    setBlurStatus({ inflight: 0, error: null });
    setSkipFaceCapture(true);
  }, [setSkipFaceCapture]);

  return (
    <form
      className="mx-auto w-full max-w-lg space-y-6 lg:max-w-none"
      onSubmit={async (e) => {
        e.preventDefault();
        setErrorMsg(null);
        if (skipFaceCapture) {
          // Tag + notes only path: require at least one signal so the AI
          // has *something* to read. We accept either condition tags,
          // symptom tags, or a non-empty note.
          if (
            conditions.length === 0 &&
            symptoms.length === 0 &&
            userNote.trim().length === 0
          ) {
            showError(t("skipModeNeedTags"));
            return;
          }
        } else if (items.length === 0) {
          showError(t("needImage"));
          return;
        }
        setSubmitting(true);
        setCoachPayload(null);
        try {
          const fd = new FormData();
          items.forEach((x) => fd.append("images", x.file));
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
            setCoachPayload(raw.data as CreateSkinCheckResponseDTO);
            requestAnimationFrame(() => {
              feedbackAnchorRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            });
          } else if (res.status === 401) {
            showError(t("needAuth"));
          } else {
            // Prefer the server-provided error message (auth/db/moderation/...) for clarity.
            const serverMsg =
              typeof raw === "object" &&
              raw !== null &&
              "error" in raw &&
              typeof (raw as { error?: { message?: string } }).error?.message ===
                "string"
                ? (raw as { error: { message: string } }).error.message
                : "";
            showError(
              serverMsg
                ? `${t("networkError")} (${res.status}). ${serverMsg}`
                : `${t("networkError")} (${res.status}).`,
            );
          }
        } catch {
          showError(t("networkError"));
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {/*
        `aria-live="assertive"` so screen readers announce the inline error as
        soon as it appears — this anchor wraps the InlineErrorBanner which
        also carries `role="alert"`, which together give the most reliable
        announcement across NVDA, JAWS and VoiceOver.
      */}
      <div ref={errorAnchorRef} aria-live="assertive" aria-atomic="true">
        {errorMsg ? (
          <InlineErrorBanner
            message={errorMsg}
            onDismiss={() => setErrorMsg(null)}
            dismissLabel={t("errorDismiss")}
          />
        ) : null}
      </div>

      <div className="flex flex-col gap-6 lg:grid lg:max-w-5xl lg:grid-cols-[1.05fr_1fr] lg:gap-8 xl:mx-auto">
      <Card className="overflow-hidden shadow-sm lg:shadow-md">
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-base font-semibold tracking-tight">{t("photoTitle")}</h2>
              <p className="text-sm text-muted-foreground">{t("photoHint")}</p>
            </div>
            <button
              type="button"
              onClick={consent.openManually}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
            >
              <ShieldCheck className="size-3.5" aria-hidden />
              {t("privacyOpen")}
            </button>
          </div>

          {skipFaceCapture ? (
            <SkipModeBanner
              message={t("skipModeBanner")}
              backCta={t("skipModeBackCta")}
              manageCta={t("skipModeManageCta")}
              onBack={() => setSkipFaceCapture(false)}
            />
          ) : (
            <>
              {/* Photo tips — appears only before user uploads, so the empty state has
                  tangible guidance (lighting, angle, clean skin) without clutter once
                  photos are already in the grid. */}
              {items.length === 0 ? (
                <PhotoTipsCard
                  title={t("photoTipsTitle")}
                  tips={[t("photoTipLight"), t("photoTipAngle"), t("photoTipClean")]}
                />
              ) : null}

              <div className="grid grid-cols-3 gap-2">
                <PhotoChoiceButton
                  onClick={openCamera}
                  icon={<Camera className="size-4" aria-hidden />}
                  label={t("photoCapture")}
                />
                <PhotoChoiceButton
                  onClick={openCameraBack}
                  icon={<Camera className="size-4" aria-hidden />}
                  label={t("photoCaptureBack")}
                />
                <PhotoChoiceButton
                  onClick={openLibrary}
                  icon={<ImageIcon className="size-4" aria-hidden />}
                  label={t("photoLibrary")}
                />
              </div>

              <button
                type="button"
                onClick={openLibrary}
                disabled={blurStatus.inflight > 0 || items.length >= 6}
                className="group flex aspect-4/3 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-muted/40 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="rounded-full bg-background p-3 shadow-sm ring-1 ring-border">
                  <ImagePlus className="size-6" aria-hidden />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">{t("dropTitle")}</p>
                  <p className="text-xs">{t("dropHint")}</p>
                </div>
              </button>

              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="user"
                className="sr-only"
                onChange={(e) => {
                  void handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <input
                ref={cameraBackRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(e) => {
                  void handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => {
                  void handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />

              {blurStatus.inflight > 0 && (
                <BlurringNotice
                  title={t("blurWorkingTitle")}
                  hint={t("blurWorkingHint")}
                />
              )}
              {blurStatus.error ? (
                <p
                  role="alert"
                  className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                >
                  {blurStatus.error}
                </p>
              ) : null}

              {items.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{t("photoCountLabel", { n: items.length })}</span>
                    <span>{t("photoCountHint")}</span>
                  </div>
                  <div className="grid gap-3 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300 sm:grid-cols-2">
                    {items.map((item, i) => (
                      <BlurredPreviewCard
                        key={item.url}
                        index={i + 1}
                        previewUrl={item.url}
                        blurMethod={item.blurMethod}
                        altLabel={t("altPhoto", { n: i + 1 })}
                        blurredCaption={t("blurredCaption")}
                        blurMethodNative={t("blurMethodNative")}
                        blurMethodHeuristic={t("blurMethodHeuristic")}
                        retakeLabel={tPrivacy("captureCard.retake")}
                        removeLabel={t("removePhoto")}
                        onRetake={openLibrary}
                        onRemove={() => removeAt(i)}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              <SkipFaceFooter
                hint={tPrivacy("captureCard.skipHint")}
                cta={tPrivacy("captureCard.skipCta")}
                onSkip={enterSkipMode}
              />
            </>
          )}
        </CardContent>
      </Card>

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
                className="min-h-[5.5rem] w-full resize-none rounded-xl border bg-background px-3 py-2.5 text-base outline-none ring-ring/40 transition focus:border-primary focus:ring-2 sm:text-sm"
              />
            </Field>

            <Field label={t("fieldConditions")}>
              <div className="flex flex-wrap gap-1.5">
                {conditionIds.map((id) => {
                  const on = conditions.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
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
                      onClick={() => setVisibility("private")}
                      className={cn(
                        "min-h-11 flex-1 rounded-xl border px-3 py-2 text-sm transition-colors sm:min-h-9 sm:rounded-md",
                        visibility === "private"
                          ? "border-primary bg-primary/5 text-primary"
                          : "hover:bg-muted",
                      )}
                    >
                      {t("visibilityPrivate")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisibility("public")}
                      className={cn(
                        "min-h-11 flex-1 rounded-xl border px-3 py-2 text-sm transition-colors sm:min-h-9 sm:rounded-md",
                        visibility === "public"
                          ? "border-primary bg-primary/5 text-primary"
                          : "hover:bg-muted",
                      )}
                    >
                      {t("visibilityPublic")}
                    </button>
                  </div>
                </Field>
              </div>
            </details>
          </CardContent>
        </Card>
      </div>
      </div>

      <div ref={feedbackAnchorRef} className="scroll-mt-24 space-y-3">
        {submitting ? <CoachThinkingCard message={t("analyzingCoach")} /> : null}
        {coachPayload ? <DailyCoachFeedback payload={coachPayload} /> : null}
        {!submitting && !coachPayload ? (
          <p className="rounded-xl border border-dashed bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
            {t("coachBeforeSubmit")}
          </p>
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
            disabled={submitting}
            onClick={resetForm}
          >
            {t("reset")}
          </Button>
          <Button
            type="submit"
            size="default"
            className="min-h-12 flex-[2] sm:min-h-9 sm:flex-initial"
            disabled={submitting || blurStatus.inflight > 0}
          >
            {submitting
              ? t("submitting")
              : skipFaceCapture
                ? t("noFaceSubmit")
                : t("analyzeToday")}
          </Button>
        </div>
      </div>

      <FacePrivacyConsentDialog {...consent.dialogProps} />
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

/** Animated "AI is thinking" placeholder rendered above the feedback while the pipeline runs. */
function CoachThinkingCard({ message }: { message: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-accent/30 to-background px-4 py-4 shadow-sm sm:px-5 sm:py-5">
      <div
        className="pointer-events-none absolute -right-12 -top-12 size-32 animate-pulse rounded-full bg-primary/25 blur-3xl"
        aria-hidden
      />
      <div className="relative flex items-start gap-3">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-background/80 shadow-sm ring-1 ring-primary/30">
          <Sparkles className="size-4 animate-pulse text-primary" aria-hidden />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{message}</p>
          <div className="flex items-center gap-1.5" aria-hidden>
            <span className="size-1.5 animate-bounce rounded-full bg-primary/70 [animation-delay:-0.3s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-primary/70 [animation-delay:-0.15s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-primary/70" />
          </div>
        </div>
      </div>
    </div>
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
      <button
        type="button"
        onClick={onDismiss}
        aria-label={dismissLabel}
        className="rounded-md p-1 text-destructive/70 transition-colors hover:bg-destructive/15 hover:text-destructive"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}

/** Compact tips strip shown above the photo dropzone when no photos have been
 *  chosen yet — gives the user a quick "how to take a useful photo" nudge. */
function PhotoTipsCard({ title, tips }: { title: string; tips: string[] }) {
  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200">
        <Lightbulb className="size-3.5" aria-hidden />
        {title}
      </div>
      <ul className="space-y-0.5 text-xs leading-relaxed text-foreground/80">
        {tips.map((tip, i) => (
          <li key={`tip-${i}`} className="flex gap-1.5">
            <span className="mt-1 size-1 shrink-0 rounded-full bg-amber-500/70" aria-hidden />
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Reusable photo-source button. Camera (front), camera (back), and library use the same shape. */
function PhotoChoiceButton({
  onClick,
  icon,
  label,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl border border-border bg-background px-2 py-2.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5 sm:flex-row sm:gap-2 sm:px-4 sm:py-3 sm:text-sm"
    >
      <span className="text-primary">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

/**
 * Blurred-preview card. Renders the on-device-anonymized photo at a generous
 * size with an obvious "Đã làm mờ khuôn mặt" overlay so the user can verify
 * the blur covered the right region BEFORE the photo is sent.
 *
 * The retake + remove controls live on this card (rather than only at the
 * bottom of the form) because once you've seen the blurred result, the most
 * common micro-decisions are "this looks good" vs "let me try again" — both
 * deserve to be one-tap right where the user is looking.
 */
function BlurredPreviewCard({
  index,
  previewUrl,
  blurMethod,
  altLabel,
  blurredCaption,
  blurMethodNative,
  blurMethodHeuristic,
  retakeLabel,
  removeLabel,
  onRetake,
  onRemove,
}: {
  index: number;
  previewUrl: string;
  blurMethod: BlurMethod;
  altLabel: string;
  blurredCaption: string;
  blurMethodNative: string;
  blurMethodHeuristic: string;
  retakeLabel: string;
  removeLabel: string;
  onRetake: () => void;
  onRemove: () => void;
}) {
  return (
    <figure className="space-y-1.5">
      <div className="relative aspect-3/4 overflow-hidden rounded-2xl border bg-muted shadow-sm ring-1 ring-transparent transition-shadow hover:ring-primary/40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrl}
          alt={altLabel}
          className="size-full object-cover"
        />
        <span className="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-background/95 px-2 py-1 text-[11px] font-semibold text-foreground shadow ring-1 ring-border/50 backdrop-blur">
          <ShieldCheck className="size-3.5 text-primary" aria-hidden />
          {blurredCaption}
        </span>
        <span className="pointer-events-none absolute right-2 top-2 rounded-full bg-background/85 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-foreground shadow-sm backdrop-blur">
          {index}
        </span>
        <button
          type="button"
          onClick={onRemove}
          aria-label={removeLabel}
          className="absolute right-2 bottom-2 inline-flex size-9 items-center justify-center rounded-full bg-black/60 text-white shadow-md backdrop-blur transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:size-8"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
        <figcaption className="text-[11px] leading-snug text-muted-foreground">
          {blurMethod === "native-face-detector" ? blurMethodNative : blurMethodHeuristic}
        </figcaption>
        <button
          type="button"
          onClick={onRetake}
          className="text-xs font-medium text-primary underline-offset-4 hover:underline"
        >
          {retakeLabel}
        </button>
      </div>
    </figure>
  );
}

/** "Đang làm mờ khuôn mặt…" status while we run the on-device blur pipeline. */
function BlurringNotice({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
      <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-primary" aria-hidden />
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

/** Visible-but-non-aggressive footer on the photos card that lets users
 *  switch into tag + notes only mode at any time during the flow. */
function SkipFaceFooter({
  hint,
  cta,
  onSkip,
}: {
  hint: string;
  cta: string;
  onSkip: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onSkip}
        className="gap-2 self-start sm:self-auto"
      >
        <ImageOff className="size-4" aria-hidden />
        {cta}
      </Button>
    </div>
  );
}

/**
 * Banner shown in place of the photo controls when the user opted out of
 * face capture. We *don't* hide the rest of the form — tag pickers and
 * notes still work — so the daily check-in remains useful in this mode.
 */
function SkipModeBanner({
  message,
  backCta,
  manageCta,
  onBack,
}: {
  message: string;
  backCta: string;
  manageCta: string;
  onBack: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-muted/40 p-4">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-background text-foreground ring-1 ring-border"
        >
          <ImageOff className="size-4" />
        </span>
        <p className="text-sm leading-relaxed text-foreground">{message}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 pl-12">
        <Button type="button" size="sm" onClick={onBack}>
          {backCta}
        </Button>
        <Link
          href="/cabinet"
          className="inline-flex h-7 items-center rounded-md px-2 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {manageCta}
        </Link>
      </div>
    </div>
  );
}
