"use client";

import { Download, Flame, Loader2, Share2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCountUp } from "@/lib/hooks/use-count-up";
import { Feature } from "@/lib/premium/features";
import { useFeatureGate } from "@/lib/premium/use-feature-gate";
import { renderStreakCard } from "@/lib/share/render-share-card";
import {
  shouldCelebrateStreakContinue,
  streakShareFilename,
} from "@/lib/share/streak-continue";
import {
  canNativeShareFiles,
  downloadBlob,
  nativeShareImageFile,
} from "@/lib/skin-review-share-image";
import { useAuthStore } from "@/lib/stores/auth-store";
import { getCelebratedMilestoneDays } from "@/lib/streak/milestone-storage";
import { findPendingMilestone, milestonesForPlan } from "@/lib/streak/milestones";
import { cn } from "@/lib/utils";

const SHARE_SITE = "https://dadiary.vn";

/**
 * Brief celebration after a successful check-in that continues a streak (≥2).
 * Yields to the existing milestone modal when that day is also a milestone.
 */
export function StreakContinueHost({
  sessionStreak,
  onDismiss,
}: {
  sessionStreak: number | null;
  onDismiss: () => void;
}) {
  const userId = useAuthStore((s) => s.user?.id);
  const milestoneGate = useFeatureGate(Feature.MilestoneFull);
  const [hasPendingMilestone, setHasPendingMilestone] = useState(false);
  const decidedFor = useRef<number | null>(null);

  useEffect(() => {
    if (sessionStreak == null) {
      decidedFor.current = null;
      setHasPendingMilestone(false);
      return;
    }
    if (decidedFor.current === sessionStreak) return;
    if (!userId || milestoneGate.isLoading) return;
    const catalog = milestonesForPlan(!milestoneGate.locked && milestoneGate.allowed);
    setHasPendingMilestone(
      findPendingMilestone(sessionStreak, getCelebratedMilestoneDays(userId), catalog) != null,
    );
    decidedFor.current = sessionStreak;
  }, [
    milestoneGate.allowed,
    milestoneGate.isLoading,
    milestoneGate.locked,
    sessionStreak,
    userId,
  ]);

  const show = shouldCelebrateStreakContinue({
    currentStreak: sessionStreak,
    submittedThisSession: sessionStreak != null,
    hasPendingMilestone,
  });

  if (!show || sessionStreak == null || decidedFor.current !== sessionStreak) {
    return null;
  }

  return <StreakContinueCelebration days={sessionStreak} onContinue={onDismiss} />;
}

export function StreakContinueCelebration({
  days,
  onContinue,
}: {
  days: number;
  onContinue: () => void;
}) {
  const t = useTranslations("progress.streak.continue");
  const locale = useLocale();
  const { success: toastSuccess, error: toastError } = useToast();
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState<"share" | "save" | null>(null);
  const [canFileShare, setCanFileShare] = useState(false);
  const count = useCountUp(days, 700, 0);

  useEffect(() => {
    setMounted(true);
    setCanFileShare(canNativeShareFiles());
  }, []);

  const copy = useMemo(
    () => ({
      brandMark: t("brandMark"),
      headline: t("cardHeadline", { n: days }),
      sub: t("cardSub"),
      ctaLine: t("cardCta"),
    }),
    [days, t],
  );

  const runExport = useCallback(
    async (mode: "share" | "save") => {
      if (busy) return;
      setBusy(mode);
      try {
        const blob = await renderStreakCard({ days, copy });
        const filename = streakShareFilename(days);
        const title = t("shareTitle", { n: days });

        if (mode === "share" && canFileShare) {
          const result = await nativeShareImageFile(blob, filename, title);
          if (result === "shared") {
            toastSuccess({ title: t("shared") });
            return;
          }
          if (result === "aborted") return;
        }

        downloadBlob(blob, filename);
        toastSuccess({
          title: t("saved"),
          description:
            mode === "share" && !canFileShare
              ? t("shareText", { n: days, url: `${SHARE_SITE}/${locale}` })
              : undefined,
        });
      } catch {
        toastError({ title: t("failed") });
      } finally {
        setBusy(null);
      }
    },
    [busy, canFileShare, copy, days, locale, t, toastError, toastSuccess],
  );

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[68] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label={t("continue")}
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px] motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
        onClick={onContinue}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="streak-continue-title"
        aria-describedby="streak-continue-body"
        className={cn(
          "relative w-full max-w-sm overflow-hidden rounded-3xl border border-amber-500/40 bg-gradient-to-b from-amber-500/18 via-orange-500/8 to-background p-5 shadow-2xl sm:p-6",
          "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:slide-in-from-bottom-5 motion-safe:duration-400",
        )}
      >
        <TastefulConfetti />

        <div className="relative space-y-4 text-center">
          <div className="flex justify-center">
            <span className="streak-flame-pulse inline-flex size-16 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-500 to-orange-500 text-amber-950 shadow-lg shadow-amber-500/30 dark:text-white">
              <Flame className="size-8" aria-hidden strokeWidth={2.25} />
            </span>
          </div>

          <div className="space-y-1.5">
            <p
              id="streak-continue-title"
              className="text-xl font-bold tracking-tight text-amber-950 dark:text-amber-50"
            >
              {t("title")}
            </p>
            <p id="streak-continue-body" className="text-sm leading-relaxed text-muted-foreground">
              {t("body", { n: days })}
            </p>
            <p className="text-sm font-semibold text-orange-800 dark:text-orange-200">{t("cheer")}</p>
          </div>

          <p className="text-5xl font-bold tabular-nums tracking-tight text-amber-950 dark:text-amber-50">
            {count}
            <span className="ml-2 text-base font-semibold opacity-75">{t("daysUnit")}</span>
          </p>

          <p
            data-testid="share-ugc-hint"
            className="text-xs leading-relaxed text-muted-foreground"
          >
            {t("ugcHint")}
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 gap-2 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/15"
              disabled={busy != null}
              onClick={() => void runExport("share")}
            >
              {busy === "share" ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Share2 className="size-4" aria-hidden />
              )}
              {t("share")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 gap-2"
              disabled={busy != null}
              onClick={() => void runExport("save")}
            >
              {busy === "save" ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Download className="size-4" aria-hidden />
              )}
              {t("save")}
            </Button>
          </div>

          <Button type="button" className="min-h-11 w-full" onClick={onContinue}>
            {t("continue")}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function TastefulConfetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        id: i,
        left: 10 + ((i * 29) % 80),
        delay: (i % 6) * 0.08,
        duration: 1.05 + (i % 3) * 0.12,
        size: 4 + (i % 3),
        color: ["bg-amber-400", "bg-orange-400", "bg-yellow-300", "bg-orange-300"][i % 4]!,
      })),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className={cn("streak-confetti absolute rounded-full opacity-80", p.color)}
          style={{
            left: `${p.left}%`,
            top: "-6%",
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            ["--streak-drift" as string]: `${(p.id % 2 === 0 ? 1 : -1) * (6 + (p.id % 4) * 4)}px`,
          }}
        />
      ))}
    </div>
  );
}
