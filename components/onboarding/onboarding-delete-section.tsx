"use client";

import { Loader2, Trash2 } from "lucide-react";
import { useCallback, useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";

import { ToastBanner } from "@/components/ui/toast-banner";
import { Button } from "@/components/ui/button";
import { deleteOnboarding } from "@/lib/api/profile";
import { ONBOARDING_GUEST_TRIAL_KEY, ONBOARDING_RESET_KEY } from "@/lib/onboarding/constants";
import { clearOnboardingSessionCache } from "@/lib/onboarding/review-data";
import {
  canResetOnboardingToday,
  markOnboardingResetPerformed,
} from "@/lib/onboarding/reset-limit";
import { getAccessToken } from "@/lib/auth-token";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { useSkillStore } from "@/lib/stores/skill-store";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type DeleteStatus = "idle" | "confirming" | "deleting";

type OnboardingDeleteSectionProps = {
  isGuest: boolean;
  onDeleted?: () => void;
  className?: string;
};

export function OnboardingDeleteSection({
  isGuest,
  onDeleted,
  className,
}: OnboardingDeleteSectionProps) {
  const t = useTranslations("onboarding.review");
  const formatter = useFormatter();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const resetOnboarding = useOnboardingStore((s) => s.reset);
  const setSkillMode = useSkillStore((s) => s.setMode);

  const [status, setStatus] = useState<DeleteStatus>("idle");
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const resetAllowed = canResetOnboardingToday();

  const formatBlockedDate = useCallback(() => {
    if (typeof window === "undefined") return "";
    try {
      const last = localStorage.getItem(ONBOARDING_RESET_KEY);
      if (!last) return "";
      const d = new Date(last);
      if (Number.isNaN(d.getTime())) return "";
      return formatter.dateTime(d, { dateStyle: "medium" });
    } catch {
      return "";
    }
  }, [formatter]);

  const clearLocalOnboarding = useCallback(() => {
    resetOnboarding();
    setSkillMode(null);
    clearOnboardingSessionCache();
    try {
      localStorage.removeItem(ONBOARDING_GUEST_TRIAL_KEY);
    } catch {
      /* ignore */
    }
    markOnboardingResetPerformed();
  }, [resetOnboarding, setSkillMode]);

  const performDelete = useCallback(async () => {
    setStatus("deleting");
    setToast(null);

    if (isGuest || !getAccessToken()) {
      clearLocalOnboarding();
      setStatus("idle");
      setToast({ kind: "ok", text: t("deleteSuccess") });
      onDeleted?.();
      startTransition(() => router.push("/onboarding"));
      return;
    }

    try {
      await deleteOnboarding();
      clearLocalOnboarding();
      setStatus("idle");
      setToast({ kind: "ok", text: t("deleteSuccess") });
      onDeleted?.();
      startTransition(() => router.push("/onboarding"));
    } catch (err) {
      setStatus("idle");
      const msg = err instanceof Error && err.message === "auth" ? t("deleteNeedAuth") : t("deleteError");
      setToast({ kind: "err", text: msg });
    }
  }, [clearLocalOnboarding, isGuest, onDeleted, router, startTransition, t]);

  return (
    <section
      className={cn(
        "mt-8 space-y-3 rounded-xl border border-destructive/20 bg-muted/30 p-4",
        className,
      )}
    >
      {toast ? (
        <ToastBanner
          kind={toast.kind}
          message={toast.text}
          onDismiss={() => setToast(null)}
          dismissLabel={t("dismissToast")}
        />
      ) : null}

      {!resetAllowed ? (
        <p className="text-xs text-muted-foreground">
          {t("deleteBlocked", { date: formatBlockedDate() || "—" })}
        </p>
      ) : null}

      {status === "confirming" || status === "deleting" ? (
        <div
          role="alertdialog"
          aria-labelledby="onb-delete-title"
          aria-describedby="onb-delete-body"
          className="space-y-4 rounded-lg border border-destructive/40 bg-destructive/5 p-4"
        >
          <p id="onb-delete-title" className="text-sm font-semibold text-destructive">
            {t("deleteConfirmTitle")}
          </p>
          <p id="onb-delete-body" className="text-sm leading-relaxed text-muted-foreground">
            {t("deleteConfirmBody")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={status === "deleting"}
              onClick={() => void performDelete()}
            >
              {status === "deleting" ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {t("deleteConfirmOk")}
                </>
              ) : (
                t("deleteConfirmOk")
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={status === "deleting"}
              onClick={() => setStatus("idle")}
            >
              {t("deleteConfirmCancel")}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={!resetAllowed}
          className="h-auto px-0 text-destructive/80 hover:bg-transparent hover:text-destructive"
          onClick={() => {
            setToast(null);
            setStatus("confirming");
          }}
        >
          <Trash2 className="size-4" aria-hidden />
          {t("deleteCta")}
        </Button>
      )}
    </section>
  );
}
