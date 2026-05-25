"use client";

import { useFormatter, useLocale, useTranslations } from "next-intl";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  ImageOff,
  Loader2,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiBaseUrl } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-token";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { usePrivacyStore } from "@/lib/stores/privacy-store";
import { cn } from "@/lib/utils";

type ResetStatus =
  | { kind: "idle" }
  | { kind: "confirming" }
  | { kind: "deleting" }
  | { kind: "ok" }
  | { kind: "auth" }
  | { kind: "network" }
  | { kind: "unsupported" };

/**
 * Privacy & data control panel — surfaces every "soft promise" the consent
 * dialog made to the user, plus the controls to act on them.
 *
 * - Status row: are we in face-capture or tag-only mode? When was consent
 *   last given?
 * - Toggles: opt out of face capture (tag-only mode); re-read the
 *   transparency notice before the next photo step.
 * - Hard delete: wipe all photos + check-in history. We try the backend
 *   `DELETE /api/v1/me/data` endpoint and gracefully degrade to a local
 *   reset if the API isn't ready (the user's data on this device is
 *   always purged either way).
 */
export function PrivacyControls() {
  const t = useTranslations("privacy");
  const locale = useLocale();
  const formatter = useFormatter();

  const consentAcknowledged = usePrivacyStore((s) => s.consentAcknowledged);
  const consentAt = usePrivacyStore((s) => s.consentAcknowledgedAt);
  const skipFaceCapture = usePrivacyStore((s) => s.skipFaceCapture);
  const dataResetAt = usePrivacyStore((s) => s.dataResetAt);
  const setSkipFaceCapture = usePrivacyStore((s) => s.setSkipFaceCapture);
  const withdrawConsent = usePrivacyStore((s) => s.withdrawConsent);
  const markDataReset = usePrivacyStore((s) => s.markDataReset);

  const obReset = useOnboardingStore((s) => s.reset);
  const obClearPhotos = useOnboardingStore((s) => s.clearPhotos);

  const [status, setStatus] = useState<ResetStatus>({ kind: "idle" });

  const formatTimestamp = useCallback(
    (iso: string | null) => {
      if (!iso) return "";
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return "";
      return formatter.dateTime(date, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    },
    [formatter],
  );

  const requestDelete = useCallback(() => {
    setStatus({ kind: "confirming" });
  }, []);

  const cancelDelete = useCallback(() => {
    setStatus({ kind: "idle" });
  }, []);

  const performDelete = useCallback(async () => {
    setStatus({ kind: "deleting" });

    // Always nuke local-only state first so the device feels clean even if
    // the backend rejects us — important for users who explicitly invoked
    // "delete everything".
    obClearPhotos();

    const token = getAccessToken();
    if (!token) {
      // No login => nothing on server, just a local wipe.
      obReset();
      markDataReset();
      setStatus({ kind: "ok" });
      return;
    }

    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/me/data`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Accept-Language": locale,
        },
      });
      if (res.ok) {
        obReset();
        markDataReset();
        setStatus({ kind: "ok" });
        return;
      }
      if (res.status === 401) {
        setStatus({ kind: "auth" });
        return;
      }
      if (res.status === 404 || res.status === 405) {
        // Endpoint not implemented yet — be honest with the user but still
        // wipe local data so the device-level promise holds.
        obReset();
        markDataReset();
        setStatus({ kind: "unsupported" });
        return;
      }
      setStatus({ kind: "network" });
    } catch {
      setStatus({ kind: "network" });
    }
  }, [locale, markDataReset, obClearPhotos, obReset]);

  return (
    <Card className="border-primary/15">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <header className="flex items-start gap-3">
          <span
            aria-hidden
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20"
          >
            <ShieldCheck className="size-5" />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {t("settingsEyebrow")}
            </p>
            <h2 className="text-lg font-semibold tracking-tight">{t("settingsTitle")}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("settingsSub")}
            </p>
          </div>
        </header>

        <ul className="grid gap-2 rounded-xl border border-border/70 bg-muted/30 p-3 text-sm sm:grid-cols-2">
          <PromiseLine icon={<Eye className="size-4" aria-hidden />} text={t("dialogBullet1")} />
          <PromiseLine
            icon={<ShieldCheck className="size-4" aria-hidden />}
            text={t("dialogBullet2")}
          />
          <PromiseLine
            icon={<ImageOff className="size-4" aria-hidden />}
            text={t("dialogBullet3")}
          />
          <PromiseLine
            icon={<Trash2 className="size-4" aria-hidden />}
            text={t("dialogBullet4")}
          />
        </ul>

        <section className="space-y-3 rounded-xl border border-border/70 bg-card p-4">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-semibold">{t("modeRowTitle")}</p>
              <p className="text-xs text-muted-foreground">
                {skipFaceCapture
                  ? t("modeStatusSkip")
                  : consentAcknowledged
                    ? t("modeStatusFace", { when: formatTimestamp(consentAt) })
                    : t("modeStatusFresh")}
              </p>
            </div>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-xs font-medium",
                skipFaceCapture
                  ? "bg-muted text-muted-foreground"
                  : "bg-primary/10 text-primary",
              )}
            >
              {skipFaceCapture ? (
                <>
                  <ImageOff className="size-3.5" aria-hidden />
                  {t("modeBadgeSkip")}
                </>
              ) : (
                <>
                  <Sparkles className="size-3.5" aria-hidden />
                  {t("modeBadgeFace")}
                </>
              )}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={skipFaceCapture ? "default" : "outline"}
              onClick={() => {
                setSkipFaceCapture(!skipFaceCapture);
                if (!skipFaceCapture) {
                  // Switching INTO skip mode purges any unsent local photos.
                  obClearPhotos();
                }
              }}
            >
              {skipFaceCapture ? t("modeEnableFaceCta") : t("modeEnableSkipCta")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                withdrawConsent();
              }}
              disabled={!consentAcknowledged}
            >
              {t("modeReshowNoticeCta")}
            </Button>
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-semibold text-destructive">{t("deleteRowTitle")}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t("deleteRowSub")}
              </p>
              {dataResetAt ? (
                <p className="pt-1 text-xs text-muted-foreground">
                  {t("deleteLastReset", { when: formatTimestamp(dataResetAt) })}
                </p>
              ) : null}
            </div>
          </div>

          {status.kind === "confirming" || status.kind === "deleting" ? (
            <div
              role="alertdialog"
              aria-live="polite"
              className="space-y-3 rounded-lg border border-destructive/40 bg-background/80 p-3"
            >
              <p className="text-sm font-medium">{t("deleteConfirmTitle")}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t("deleteConfirmBody")}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => void performDelete()}
                  disabled={status.kind === "deleting"}
                >
                  {status.kind === "deleting" ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      {t("deleteWorking")}
                    </>
                  ) : (
                    t("deleteConfirmCta")
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={cancelDelete}
                  disabled={status.kind === "deleting"}
                >
                  {t("deleteCancel")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={requestDelete}
              >
                <Trash2 className="size-4" aria-hidden />
                {t("deleteCta")}
              </Button>
            </div>
          )}

          {status.kind === "ok" ? (
            <p
              role="status"
              className="flex items-start gap-2 text-xs text-emerald-700 dark:text-emerald-300"
            >
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {t("deleteSuccess")}
            </p>
          ) : null}

          {status.kind === "unsupported" ? (
            <p
              role="status"
              className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300"
            >
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {t("deleteUnsupported")}
            </p>
          ) : null}

          {status.kind === "auth" ? (
            <p role="alert" className="flex items-start gap-2 text-xs text-destructive">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {t("deleteAuth")}
            </p>
          ) : null}

          {status.kind === "network" ? (
            <p role="alert" className="flex items-start gap-2 text-xs text-destructive">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {t("deleteNetwork")}
            </p>
          ) : null}
        </section>
      </CardContent>
    </Card>
  );
}

function PromiseLine({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
      <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </span>
      <span>{text}</span>
    </li>
  );
}
