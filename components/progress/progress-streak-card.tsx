"use client";

import { Check, Flame, Loader2, Shield, Trophy } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { ApplyConfirmDialog } from "@/components/routine/parts/apply-confirm-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api-client";
import { useCountUp } from "@/lib/hooks/use-count-up";
import { useStreak, useUseStreakFreeze } from "@/lib/hooks/use-streak";
import {
  buildStreakHistory,
  canUseFreeze,
  formatStreakDayLabel,
  freezeBlockReason,
  isPendingAutoSave,
  isSoftExpiredStreak,
  manualFreezeTarget,
  manualFreezeTargetDate,
  resolveStreakStatus,
  streakFlameTier,
} from "@/lib/streak/history";
import type { StreakDTO, StreakDayCell, StreakStatus } from "@/lib/types/streak";
import { cn } from "@/lib/utils";

const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

type ProgressStreakCardProps = {
  /**
   * Optional YYYY-MM-DD check days from the progress timeline.
   * Merged with streak reconstruct — never used alone (range may omit recent days).
   */
  checkedDates?: ReadonlySet<string>;
  /** How many recent days to show in the mini strip. */
  historyDays?: 7 | 14;
  className?: string;
};

/** Dedicated streak hero for /progress — current / longest / status + mini history. */
export function ProgressStreakCard({
  checkedDates,
  historyDays = 7,
  className,
}: ProgressStreakCardProps) {
  const t = useTranslations("progress.streak");
  const { success: toastSuccess, error: toastError } = useToast();
  const { data, isLoading, isError, refetch, isFetching } = useStreak();
  const freezeMutation = useUseStreakFreeze();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const locale = useLocale();

  const status: StreakStatus = data ? resolveStreakStatus(data) : "idle";
  const tier = streakFlameTier(data?.current_streak ?? 0);
  const tone = flameTone(tier);

  const history = useMemo(() => {
    if (!data) return [] as StreakDayCell[];
    return buildStreakHistory(data, historyDays, checkedDates);
  }, [data, historyDays, checkedDates]);

  const allowFreeze = data ? canUseFreeze(data) : false;
  const blockReason = data ? freezeBlockReason(data) : "no_streak";
  const freezeTarget = data ? manualFreezeTarget(data) : "today";
  const freezeTargetDate = data ? manualFreezeTargetDate(data) : "";
  const freezeTargetLabel = freezeTargetDate
    ? formatStreakDayLabel(freezeTargetDate, locale)
    : "";

  const onConfirmFreeze = () => {
    setConfirmOpen(false);
    freezeMutation.mutate(undefined, {
      onSuccess: () => {
        toastSuccess({
          title: t("freeze.successTitle"),
          description:
            freezeTarget === "tomorrow"
              ? t("freeze.successBodyTomorrow", { date: freezeTargetLabel })
              : t("freeze.successBodyToday", { date: freezeTargetLabel }),
        });
      },
      onError: (err) => {
        const code = err instanceof ApiError ? err.code : undefined;
        const msg =
          code === "no_freezes"
            ? t("freeze.block.no_freezes")
            : code === "already_protected"
              ? t("freeze.block.already_protected")
              : code === "no_streak"
                ? t("freeze.block.no_streak")
                : code === "streak_soft_expired"
                  ? t("freeze.block.soft_expired")
                  : code === "catch_up_required"
                    ? t("freeze.block.catch_up_required")
                    : t("freeze.error");
        toastError({ title: t("freeze.errorTitle"), description: msg });
      },
    });
  };

  if (isLoading && !data) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/30 px-4 py-5",
          className,
        )}
        aria-busy
      >
        <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      </div>
    );
  }

  if (isError && !data) {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/25 px-4 py-4",
          className,
        )}
      >
        <p className="text-sm text-muted-foreground">{t("error")}</p>
        <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>
          {t("retry")}
        </Button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <StreakCardBody
      className={className}
      tone={tone}
      isFetching={isFetching}
      current={data.current_streak}
      longest={data.longest_streak}
      freezes={data.freezes_available}
      status={status}
      history={history}
      historyDays={historyDays}
      allowFreeze={allowFreeze}
      blockReason={blockReason}
      freezeTarget={freezeTarget}
      freezeTargetDate={freezeTargetDate}
      freezeBusy={freezeMutation.isPending}
      confirmOpen={confirmOpen}
      setConfirmOpen={setConfirmOpen}
      onConfirmFreeze={onConfirmFreeze}
      streak={data}
    />
  );
}

function StreakCardBody({
  className,
  tone,
  isFetching,
  current,
  longest,
  freezes,
  status,
  history,
  historyDays,
  allowFreeze,
  blockReason,
  freezeTarget,
  freezeTargetDate,
  freezeBusy,
  confirmOpen,
  setConfirmOpen,
  onConfirmFreeze,
  streak,
}: {
  className?: string;
  tone: ReturnType<typeof flameTone>;
  isFetching: boolean;
  current: number;
  longest: number;
  freezes: number;
  status: StreakStatus;
  history: StreakDayCell[];
  historyDays: 7 | 14;
  allowFreeze: boolean;
  blockReason: ReturnType<typeof freezeBlockReason>;
  freezeTarget: "today" | "tomorrow";
  freezeTargetDate: string;
  freezeBusy: boolean;
  confirmOpen: boolean;
  setConfirmOpen: (v: boolean) => void;
  onConfirmFreeze: () => void;
  streak: StreakDTO;
}) {
  const t = useTranslations("progress.streak");
  const locale = useLocale();
  const displayCurrent = useCountUp(current, 650);
  const pendingAuto = isPendingAutoSave(streak);
  const softExpired = isSoftExpiredStreak(streak);
  const targetLabel = freezeTargetDate
    ? formatStreakDayLabel(freezeTargetDate, locale)
    : "";

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border p-4 sm:p-5",
        tone.container,
        isFetching && "opacity-95",
        className,
      )}
      aria-label={t("ariaLabel")}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-6 -top-6 size-28 rounded-full blur-2xl sm:size-32",
          tone.glow,
        )}
        aria-hidden
      />

      <div className="relative space-y-4 sm:space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <span
              className={cn(
                "inline-flex size-12 shrink-0 items-center justify-center rounded-2xl shadow-md sm:size-16",
                tone.icon,
                current > 0 && "streak-flame-pulse",
              )}
            >
              <Flame className="size-6 sm:size-8" aria-hidden strokeWidth={2.25} />
            </span>
            <div className="min-w-0">
              <p className={cn("text-[11px] font-semibold uppercase tracking-wider", tone.label)}>
                {t("currentLabel")}
              </p>
              <p className="mt-1 flex items-baseline gap-1.5">
                <span
                  className={cn(
                    "text-4xl font-bold tabular-nums leading-none tracking-tight sm:text-5xl",
                    tone.value,
                  )}
                >
                  {displayCurrent}
                </span>
                <span className={cn("text-sm font-medium", tone.label)}>{t("daysUnit")}</span>
              </p>
            </div>
          </div>

          <StatusBadge status={status} pendingAutoSave={pendingAuto} />
        </div>

        {softExpired && streak.last_check_in_date ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("endedHint", {
              date: formatStreakDayLabel(streak.last_check_in_date, locale),
            })}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-2.5 sm:max-w-md sm:gap-3">
          <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-background/80 px-3 py-2.5 text-amber-900 shadow-xs dark:border-amber-400/35 dark:bg-background/55 dark:text-amber-100">
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-background shadow-xs dark:bg-background/90 sm:size-9">
              <Trophy className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-lg font-bold tabular-nums leading-none sm:text-xl">{longest}</p>
              <p className="mt-1 text-[10px] font-medium leading-snug opacity-90 sm:text-[11px]">
                {t("longestLabel")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border border-sky-500/30 bg-background/80 px-3 py-2.5 text-sky-900 shadow-xs dark:border-sky-400/35 dark:bg-background/55 dark:text-sky-100">
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-background shadow-xs dark:bg-background/90 sm:size-9">
              <Shield className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-lg font-bold tabular-nums leading-none sm:text-xl">{freezes}</p>
              <p className="mt-1 text-[10px] font-medium leading-snug opacity-90 sm:text-[11px]">
                {t("freezesLabel")}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className={cn("text-[11px] font-semibold uppercase tracking-wider", tone.label)}>
              {t("historyLabel", { n: historyDays })}
            </p>
            <p className="text-[10px] text-muted-foreground">{t("historyHint")}</p>
          </div>
          <ol className="flex justify-between gap-1 sm:gap-1.5" aria-label={t("historyAria")}>
            {history.map((cell) => (
              <DayCell key={cell.date} cell={cell} />
            ))}
          </ol>
          <HistoryLegend />
        </div>

        <StreakProtectionSection
          streak={streak}
          allowFreeze={allowFreeze}
          blockReason={blockReason}
          pendingAuto={pendingAuto}
          busy={freezeBusy}
          onRequestUse={() => setConfirmOpen(true)}
        />
      </div>

      <ApplyConfirmDialog
        open={confirmOpen}
        title={t("freeze.confirmTitle")}
        body={
          freezeTarget === "tomorrow"
            ? t("freeze.confirmBodyTomorrow", { date: targetLabel })
            : t("freeze.confirmBodyToday", { date: targetLabel })
        }
        cancelLabel={t("freeze.confirmCancel")}
        confirmLabel={t("freeze.confirmOk")}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={onConfirmFreeze}
      />
    </section>
  );
}

function freezeContextLine(
  t: (key: string) => string,
  {
    allowFreeze,
    blockReason,
    pendingAuto,
    isProtected,
  }: {
    allowFreeze: boolean;
    blockReason: ReturnType<typeof freezeBlockReason>;
    pendingAuto: boolean;
    isProtected: boolean;
  },
): string {
  if (isProtected) {
    return ""; // activeUntil line handles it
  }
  if (pendingAuto) return t("freeze.contextAutoSave");
  if (blockReason === "bridged_catch_up") return t("freeze.block.bridged_catch_up");
  if (blockReason === "catch_up_required") return t("freeze.block.catch_up_required");
  if (blockReason === "soft_expired") return t("freeze.block.soft_expired");
  if (blockReason === "no_freezes") return t("freeze.exhausted");
  if (blockReason === "already_protected") return t("freeze.block.already_protected");
  if (blockReason === "no_streak") return t("freeze.block.no_streak");
  if (allowFreeze) return t("freeze.contextManual");
  return t("freeze.contextIdle");
}

function StreakProtectionSection({
  streak,
  allowFreeze,
  blockReason,
  pendingAuto,
  busy,
  onRequestUse,
}: {
  streak: StreakDTO;
  allowFreeze: boolean;
  blockReason: ReturnType<typeof freezeBlockReason>;
  pendingAuto: boolean;
  busy: boolean;
  onRequestUse: () => void;
}) {
  const t = useTranslations("progress.streak");
  const locale = useLocale();
  const isProtected = streak.is_protected;
  const context = freezeContextLine(t, {
    allowFreeze,
    blockReason,
    pendingAuto,
    isProtected,
  });
  const untilLabel =
    isProtected && streak.protected_until
      ? formatStreakDayLabel(streak.protected_until, locale)
      : null;

  return (
    <div className="space-y-2.5 rounded-xl border border-sky-500/25 bg-background/70 px-3 py-3 dark:bg-background/50">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-700 dark:text-sky-200">
          <Shield className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{t("freeze.title")}</p>
            {isProtected ? (
              <span className="inline-flex items-center rounded-full border border-sky-500/35 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-900 dark:text-sky-100">
                {t("freeze.activeBadge")}
              </span>
            ) : null}
          </div>
          {untilLabel ? (
            <p className="text-[11px] font-medium text-sky-800 dark:text-sky-200">
              {t("freeze.activeUntil", { date: untilLabel })}
            </p>
          ) : null}
          {context ? (
            <p className="text-xs leading-relaxed text-muted-foreground">{context}</p>
          ) : null}
        </div>
      </div>
      {allowFreeze ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-11 w-full border-sky-500/40 bg-sky-500/10 text-sky-900 hover:bg-sky-500/15 dark:text-sky-100 sm:w-auto"
          disabled={busy}
          onClick={onRequestUse}
        >
          {busy ? (
            <>
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              {t("freeze.using")}
            </>
          ) : (
            t("freeze.useCta")
          )}
        </Button>
      ) : null}
    </div>
  );
}

function StatusBadge({
  status,
  pendingAutoSave = false,
}: {
  status: StreakStatus;
  pendingAutoSave?: boolean;
}) {
  const t = useTranslations("progress.streak");
  const styles: Record<StreakStatus, string> = {
    maintaining:
      "border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-100",
    at_risk: "border-amber-500/40 bg-amber-500/15 text-amber-900 dark:text-amber-100",
    protected: "border-sky-500/40 bg-sky-500/15 text-sky-900 dark:text-sky-100",
    idle: "border-border/70 bg-muted/50 text-muted-foreground",
  };
  const label =
    status === "at_risk" && pendingAutoSave
      ? t("status.at_risk_auto_save")
      : t(`status.${status}`);
  return (
    <span
      className={cn(
        "inline-flex max-w-[11.5rem] items-center rounded-full border px-2 py-1 text-left text-[10px] font-semibold leading-snug sm:max-w-[14rem] sm:px-2.5 sm:text-[11px]",
        styles[status],
      )}
    >
      {label}
    </span>
  );
}

function HistoryLegend() {
  const t = useTranslations("progress.streak");
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
      <li className="inline-flex items-center gap-1">
        <span className="size-2.5 rounded-full bg-emerald-500/90" aria-hidden />
        {t("dayState.checked")}
      </li>
      <li className="inline-flex items-center gap-1">
        <span className="size-2.5 rounded-full border border-sky-400/70 bg-sky-500/30" aria-hidden />
        {t("dayState.protected")}
      </li>
      <li className="inline-flex items-center gap-1">
        <span className="size-2.5 rounded-full bg-muted ring-1 ring-border/60" aria-hidden />
        {t("dayState.missed")}
      </li>
    </ul>
  );
}

function DayCell({ cell }: { cell: StreakDayCell }) {
  const t = useTranslations("progress.streak");
  const weekday = WEEKDAY_KEYS[cell.weekday - 1] ?? "mon";
  const tip =
    cell.state === "protected"
      ? `${cell.date} — ${t("dayState.protected")}`
      : `${cell.date}: ${t(`dayState.${cell.state}`)}`;

  return (
    <li className="flex min-w-0 flex-1 flex-col items-center gap-1">
      <span
        className={cn(
          "text-[9px] font-medium uppercase tracking-wide sm:text-[10px]",
          cell.isToday ? "font-semibold text-primary" : "text-muted-foreground",
        )}
      >
        {cell.isToday ? t("today") : t(`weekday.${weekday}`)}
      </span>
      <span
        role="img"
        aria-label={tip}
        title={tip}
        className={cn(
          "relative flex size-9 items-center justify-center rounded-full text-[10px] transition-[transform,box-shadow] duration-200 sm:size-10",
          "hover:z-10 hover:scale-110 hover:shadow-md",
          cell.state === "checked" &&
            "bg-emerald-500/90 text-white shadow-sm ring-2 ring-emerald-500/30",
          cell.state === "protected" &&
            "border border-sky-400/70 bg-sky-500/20 text-sky-800 shadow-sm ring-2 ring-sky-400/25 dark:text-sky-100",
          cell.state === "missed" &&
            "bg-muted/70 text-muted-foreground/80 ring-1 ring-border/60 opacity-70",
          cell.state === "empty" &&
            "bg-background/80 text-muted-foreground ring-1 ring-dashed ring-border/80",
          cell.isToday && "ring-2 ring-offset-1 ring-offset-background ring-primary",
        )}
      >
        {cell.state === "checked" ? <Check className="size-3.5" aria-hidden strokeWidth={3} /> : null}
        {cell.state === "protected" ? <Shield className="size-3.5" aria-hidden /> : null}
      </span>
    </li>
  );
}

function flameTone(tier: ReturnType<typeof streakFlameTier>): {
  container: string;
  icon: string;
  glow: string;
  label: string;
  value: string;
} {
  if (tier === "blaze") {
    return {
      container:
        "border-rose-500/45 bg-gradient-to-br from-rose-500/22 via-orange-500/12 to-background dark:from-rose-500/30 dark:via-orange-500/14 dark:border-rose-400/50",
      glow: "bg-gradient-to-br from-rose-400/40 to-transparent dark:from-rose-400/30",
      icon: "bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-rose-500/40",
      label: "text-rose-800/85 dark:text-rose-100/90",
      value: "text-rose-950 dark:text-rose-50",
    };
  }
  if (tier === "hot") {
    return {
      container:
        "border-orange-500/45 bg-gradient-to-br from-orange-500/22 via-amber-500/12 to-background dark:from-orange-500/30 dark:via-amber-500/14 dark:border-orange-400/50",
      glow: "bg-gradient-to-br from-orange-400/40 to-transparent dark:from-orange-400/30",
      icon: "bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-orange-500/40",
      label: "text-orange-800/85 dark:text-orange-100/90",
      value: "text-orange-950 dark:text-orange-50",
    };
  }
  if (tier === "warm") {
    return {
      container:
        "border-amber-500/45 bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-background dark:from-amber-500/28 dark:via-yellow-500/12 dark:border-amber-400/50",
      glow: "bg-gradient-to-br from-amber-400/40 to-transparent dark:from-amber-400/30",
      icon: "bg-gradient-to-br from-amber-500 to-yellow-500 text-amber-950 dark:text-white shadow-amber-500/35",
      label: "text-amber-900/85 dark:text-amber-100/90",
      value: "text-amber-950 dark:text-amber-50",
    };
  }
  return {
    container: "border-border/80 bg-muted/35 dark:bg-muted/25 dark:border-border/70",
    glow: "bg-gradient-to-br from-muted/40 to-transparent",
    icon: "bg-muted text-muted-foreground dark:bg-muted/80",
    label: "text-muted-foreground dark:text-muted-foreground/90",
    value: "text-foreground dark:text-foreground",
  };
}
