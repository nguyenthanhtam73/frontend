"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useFormatter, useTranslations } from "next-intl";
import {
  AlertCircle,
  Brain,
  Eye,
  ImageOff,
  Loader2,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useCallback, useMemo, useState, useTransition } from "react";
import { useLocale } from "next-intl";

import { ToastBanner } from "@/components/ui/toast-banner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { deleteAllUserData } from "@/lib/api/user-data";
import { wardrobeQueryKey } from "@/lib/api/wardrobe";
import { clearLocalUserData } from "@/lib/clear-local-user-data";
import { Link, useRouter } from "@/i18n/navigation";
import { getAccessToken } from "@/lib/auth-token";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { usePrivacyStore } from "@/lib/stores/privacy-store";
import { cn } from "@/lib/utils";

type ResetStatus =
  | { kind: "idle" }
  | { kind: "confirming" }
  | { kind: "deleting" }
  | { kind: "ok" }
  | { kind: "auth" }
  | { kind: "network" };

export function PrivacyControls() {
  const t = useTranslations("privacy");
  const formatter = useFormatter();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [, startTransition] = useTransition();
  const logout = useAuthStore((s) => s.logout);

  const consentAcknowledged = usePrivacyStore((s) => s.consentAcknowledged);
  const consentAt = usePrivacyStore((s) => s.consentAcknowledgedAt);
  const skipFaceCapture = usePrivacyStore((s) => s.skipFaceCapture);
  const dataResetAt = usePrivacyStore((s) => s.dataResetAt);
  const setSkipFaceCapture = usePrivacyStore((s) => s.setSkipFaceCapture);
  const withdrawConsent = usePrivacyStore((s) => s.withdrawConsent);
  const markDataReset = usePrivacyStore((s) => s.markDataReset);

  const obClearPhotos = useOnboardingStore((s) => s.clearPhotos);

  const locale = useLocale();
  const [status, setStatus] = useState<ResetStatus>({ kind: "idle" });
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [confirmInput, setConfirmInput] = useState("");

  const confirmPhrase = locale === "vi" ? "XOÁ" : "DELETE";
  const confirmReady = confirmInput.trim().toUpperCase() === confirmPhrase;

  const deleteBullets = useMemo(
    () => [t("deleteBullet1"), t("deleteBullet2"), t("deleteBullet3"), t("deleteBullet4")],
    [t],
  );

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
    setConfirmInput("");
    setStatus({ kind: "confirming" });
    setToast(null);
  }, []);

  const cancelDelete = useCallback(() => {
    setConfirmInput("");
    setStatus({ kind: "idle" });
  }, []);

  const performDelete = useCallback(async () => {
    setStatus({ kind: "deleting" });
    setToast(null);
    obClearPhotos();

    const token = getAccessToken();
    if (!token) {
      clearLocalUserData();
      markDataReset();
      setStatus({ kind: "ok" });
      setToast({ kind: "ok", text: t("deleteSuccess") });
      startTransition(() => router.push("/login"));
      return;
    }

    try {
      await deleteAllUserData();
      clearLocalUserData();
      logout();
      queryClient.removeQueries({ queryKey: wardrobeQueryKey });
      queryClient.removeQueries({ queryKey: ["me", "memory"] });
      queryClient.clear();
      markDataReset();
      setStatus({ kind: "ok" });
      setToast({ kind: "ok", text: t("deleteSuccessServer") });
      startTransition(() => router.push("/login"));
    } catch (err) {
      if (err instanceof Error && err.message === "auth") {
        clearLocalUserData();
        logout();
        queryClient.clear();
        setStatus({ kind: "auth" });
        return;
      }
      setStatus({ kind: "network" });
      setToast({ kind: "err", text: t("deleteNetwork") });
    }
  }, [logout, markDataReset, obClearPhotos, queryClient, router, t]);

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

        <section className="rounded-xl border border-border/70 bg-muted/20 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <Brain className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="text-sm font-semibold">{t("memoryLinkTitle")}</p>
                <p className="text-xs text-muted-foreground">{t("memoryLinkSub")}</p>
              </div>
            </div>
            <Link href="/me/memory" className={buttonVariants({ size: "sm", variant: "outline" })}>
              {t("memoryLinkCta")}
            </Link>
          </div>
        </section>

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
              onClick={() => withdrawConsent()}
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

          {toast ? (
            <ToastBanner
              kind={toast.kind}
              message={toast.text}
              onDismiss={() => setToast(null)}
              dismissLabel={t("dismissToast")}
            />
          ) : null}

          {status.kind === "confirming" || status.kind === "deleting" ? (
            <div
              role="alertdialog"
              aria-labelledby="delete-confirm-title"
              aria-describedby="delete-confirm-body"
              className="space-y-4 rounded-lg border-2 border-destructive/50 bg-destructive/5 p-4"
            >
              <p id="delete-confirm-title" className="text-sm font-semibold text-destructive">
                {t("deleteConfirmTitle")}
              </p>
              <p id="delete-confirm-body" className="text-xs leading-relaxed text-muted-foreground">
                {t("deleteConfirmBody")}
              </p>
              <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
                {deleteBullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <p className="text-xs font-medium text-foreground">{t("deleteAccountKept")}</p>
              <div className="space-y-1.5">
                <label
                  htmlFor="delete-confirm-input"
                  className="text-xs font-medium text-muted-foreground"
                >
                  {t("deleteConfirmTypeLabel", { phrase: confirmPhrase })}
                </label>
                <input
                  id="delete-confirm-input"
                  type="text"
                  autoComplete="off"
                  autoCapitalize="characters"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  disabled={status.kind === "deleting"}
                  placeholder={confirmPhrase}
                  className="w-full min-h-11 rounded-xl border border-destructive/40 bg-background px-3 py-2 font-mono text-sm uppercase tracking-widest outline-none focus-visible:border-destructive focus-visible:ring-[3px] focus-visible:ring-destructive/25"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => void performDelete()}
                  disabled={status.kind === "deleting" || !confirmReady}
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
              <Button type="button" size="sm" variant="destructive" onClick={requestDelete}>
                <Trash2 className="size-4" aria-hidden />
                {t("deleteCta")}
              </Button>
            </div>
          )}

          {status.kind === "ok" && !toast ? (
            <p
              role="status"
              className="flex items-start gap-2 text-xs text-emerald-700 dark:text-emerald-300"
            >
              {t("deleteSuccess")}
            </p>
          ) : null}

          {status.kind === "auth" ? (
            <p role="alert" className="flex items-start gap-2 text-xs text-destructive">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {t("deleteAuth")}
            </p>
          ) : null}

          {status.kind === "network" && !toast ? (
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
