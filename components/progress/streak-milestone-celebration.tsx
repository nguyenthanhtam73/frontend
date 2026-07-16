"use client";

import { Copy, Flame, Share2, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCountUp } from "@/lib/hooks/use-count-up";
import { useStreakMilestoneCelebration } from "@/lib/hooks/use-streak-milestone-celebration";
import type { MilestoneTier, StreakMilestone } from "@/lib/streak/milestones";
import { cn } from "@/lib/utils";

const SHARE_BASE_URL = "https://dadiary.vn";

/**
 * Global host: mount once on Progress / Check-in. Opens a celebration modal
 * when the user's streak crosses an unseen milestone.
 */
export function StreakMilestoneHost() {
  const { milestone, currentStreak, open, dismiss } = useStreakMilestoneCelebration();

  if (!open || !milestone) return null;

  return (
    <StreakMilestoneCelebration
      milestone={milestone}
      currentStreak={currentStreak}
      onContinue={dismiss}
    />
  );
}

export function StreakMilestoneCelebration({
  milestone,
  currentStreak,
  onContinue,
}: {
  milestone: StreakMilestone;
  currentStreak: number;
  onContinue: () => void;
}) {
  const t = useTranslations("progress.streak.milestone");
  const locale = useLocale();
  const { success: toastSuccess, error: toastError } = useToast();
  const [mounted, setMounted] = useState(false);
  const count = useCountUp(
    currentStreak,
    milestone.tier === "large" ? 1100 : 800,
    0,
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const tone = tierTone(milestone.tier);
  const confettiCount = milestone.tier === "large" ? 28 : milestone.tier === "medium" ? 18 : 12;

  const shareText = useMemo(
    () =>
      t("share.text", {
        n: milestone.days,
        url: `${SHARE_BASE_URL}/${locale}`,
      }),
    [t, milestone.days, locale],
  );

  const onShare = useCallback(async () => {
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({
          title: t("share.title", { n: milestone.days }),
          text: shareText,
          url: `${SHARE_BASE_URL}/${locale}`,
        });
        toastSuccess({ title: t("share.shared") });
        return;
      }
      await navigator.clipboard.writeText(shareText);
      toastSuccess({ title: t("share.copied") });
    } catch (err) {
      // User cancelled share sheet — ignore AbortError.
      if (err instanceof DOMException && err.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(shareText);
        toastSuccess({ title: t("share.copied") });
      } catch {
        toastError({ title: t("share.failed") });
      }
    }
  }, [shareText, t, milestone.days, locale, toastSuccess, toastError]);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      toastSuccess({ title: t("share.copied") });
    } catch {
      toastError({ title: t("share.failed") });
    }
  }, [shareText, t, toastSuccess, toastError]);

  if (!mounted) return null;

  const title = t(`items.${milestone.copyKey}.title`);
  const body = t(`items.${milestone.copyKey}.body`);
  const cheer = t(`items.${milestone.copyKey}.cheer`);

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label={t("continue")}
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px] motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
        onClick={onContinue}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="streak-milestone-title"
        aria-describedby="streak-milestone-body"
        className={cn(
          "relative w-full max-w-md overflow-hidden rounded-3xl border p-5 shadow-2xl sm:p-7",
          "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:slide-in-from-bottom-5 motion-safe:duration-400",
          tone.panel,
        )}
      >
        <ConfettiBurst count={confettiCount} colors={tone.confetti} tier={milestone.tier} />

        <div className="relative space-y-5 text-center">
          <div className="flex justify-center">
            <span
              className={cn(
                "inline-flex size-[4.5rem] items-center justify-center rounded-3xl shadow-lg sm:size-20",
                tone.icon,
                "streak-flame-pulse motion-safe:animate-in motion-safe:zoom-in-75 motion-safe:duration-500",
              )}
            >
              {milestone.tier === "large" ? (
                <Sparkles className="size-9 sm:size-10" aria-hidden strokeWidth={2.25} />
              ) : (
                <Flame className="size-9 sm:size-10" aria-hidden strokeWidth={2.25} />
              )}
            </span>
          </div>

          <div className="space-y-2">
            <p className={cn("text-[11px] font-semibold uppercase tracking-[0.2em]", tone.eyebrow)}>
              {t("badge", { n: milestone.days })}
            </p>
            <p
              id="streak-milestone-title"
              className={cn(
                "text-2xl font-bold tracking-tight sm:text-3xl",
                tone.title,
                "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500",
              )}
            >
              {title}
            </p>
            <p
              id="streak-milestone-body"
              className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground sm:text-[15px]"
            >
              {body}
            </p>
            <p className={cn("text-sm font-semibold sm:text-base", tone.cheer)}>{cheer}</p>
          </div>

          <p
            className={cn(
              "text-5xl font-bold tabular-nums tracking-tight sm:text-6xl",
              tone.value,
            )}
          >
            {count}
            <span className="ml-2 text-base font-semibold opacity-75 sm:text-lg">
              {t("daysUnit")}
            </span>
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className={cn("min-h-11 gap-2", tone.shareBtn)}
              onClick={() => void onShare()}
            >
              <Share2 className="size-4" aria-hidden />
              {t("share.cta")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 gap-2"
              onClick={() => void onCopy()}
            >
              <Copy className="size-4" aria-hidden />
              {t("share.copy")}
            </Button>
          </div>

          <Button type="button" className={cn("min-h-11 w-full", tone.primaryBtn)} onClick={onContinue}>
            {t("continue")}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ConfettiBurst({
  count,
  colors,
  tier,
}: {
  count: number;
  colors: string[];
  tier: MilestoneTier;
}) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: 4 + ((i * 37) % 92),
        delay: (i % 10) * 0.07,
        duration: tier === "large" ? 1.6 + (i % 5) * 0.15 : 1.2 + (i % 4) * 0.12,
        size: tier === "large" ? 6 + (i % 4) : 4 + (i % 3),
        rotate: (i * 47) % 360,
        color: colors[i % colors.length]!,
        shape: i % 3 === 0 ? "round" : i % 3 === 1 ? "square" : "rect",
      })),
    [count, colors, tier],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className={cn(
            "streak-confetti absolute opacity-90",
            p.shape === "round" && "rounded-full",
            p.shape === "square" && "rounded-[2px]",
            p.shape === "rect" && "rounded-sm",
            p.color,
          )}
          style={{
            left: `${p.left}%`,
            top: "-8%",
            width: p.shape === "rect" ? p.size * 1.6 : p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            ["--streak-drift" as string]: `${(p.id % 2 === 0 ? 1 : -1) * (8 + (p.id % 5) * 6)}px`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}

function tierTone(tier: MilestoneTier): {
  panel: string;
  icon: string;
  eyebrow: string;
  title: string;
  value: string;
  cheer: string;
  confetti: string[];
  shareBtn: string;
  primaryBtn: string;
} {
  if (tier === "large") {
    return {
      panel:
        "border-violet-500/45 bg-gradient-to-b from-violet-500/25 via-amber-500/10 to-background dark:from-violet-500/30 dark:via-amber-500/10",
      icon: "bg-gradient-to-br from-violet-600 via-fuchsia-500 to-amber-400 text-white shadow-violet-500/40",
      eyebrow: "text-violet-800/85 dark:text-violet-200/90",
      title: "text-violet-950 dark:text-violet-50",
      value: "bg-gradient-to-br from-violet-700 to-amber-600 bg-clip-text text-transparent dark:from-violet-200 dark:to-amber-200",
      cheer: "text-amber-800 dark:text-amber-200",
      confetti: [
        "bg-violet-400",
        "bg-amber-300",
        "bg-fuchsia-400",
        "bg-yellow-300",
        "bg-purple-500",
        "bg-orange-300",
      ],
      shareBtn: "border-violet-500/40 bg-violet-500/10 hover:bg-violet-500/15",
      primaryBtn: "bg-violet-600 text-white hover:bg-violet-600/90",
    };
  }
  if (tier === "medium") {
    return {
      panel:
        "border-emerald-500/45 bg-gradient-to-b from-emerald-500/22 via-teal-500/10 to-background dark:from-emerald-500/28 dark:via-teal-500/12",
      icon: "bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-emerald-500/35",
      eyebrow: "text-teal-800/85 dark:text-teal-200/90",
      title: "text-emerald-950 dark:text-emerald-50",
      value: "text-emerald-900 dark:text-emerald-50",
      cheer: "text-teal-800 dark:text-teal-200",
      confetti: [
        "bg-emerald-400",
        "bg-teal-400",
        "bg-cyan-300",
        "bg-green-400",
        "bg-teal-300",
      ],
      shareBtn: "border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/15",
      primaryBtn: "bg-emerald-600 text-white hover:bg-emerald-600/90",
    };
  }
  return {
    panel:
      "border-amber-500/45 bg-gradient-to-b from-amber-500/20 via-orange-500/10 to-background dark:from-amber-500/25",
    icon: "bg-gradient-to-br from-amber-500 to-orange-500 text-amber-950 dark:text-white shadow-amber-500/30",
    eyebrow: "text-amber-900/85 dark:text-amber-200/90",
    title: "text-amber-950 dark:text-amber-50",
    value: "text-amber-950 dark:text-amber-50",
    cheer: "text-orange-800 dark:text-orange-200",
    confetti: ["bg-amber-400", "bg-orange-400", "bg-yellow-300", "bg-orange-300"],
    shareBtn: "border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/15",
    primaryBtn: "",
  };
}
