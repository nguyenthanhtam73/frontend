"use client";

import { Bell, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
  hasNeverCheckedIn,
} from "@/lib/activation/first-check-in";
import { useActivationPushPrompt } from "@/lib/hooks/use-activation-push";
import { useStreak } from "@/lib/hooks/use-streak";
import { cn } from "@/lib/utils";

type Props = {
  surface: string;
  /** When true, only show for users who have never checked in. */
  onlyIfNeverCheckedIn?: boolean;
  className?: string;
  onVisibilityChange?: (visible: boolean) => void;
};

/** Dismissible Web Push CTA before first check-in (coach-welcome / /check-in). */
export function ActivationPushCta({
  surface,
  onlyIfNeverCheckedIn = false,
  className,
  onVisibilityChange,
}: Props) {
  const t = useTranslations("activation.push");
  const streakQuery = useStreak();
  const neverCheckedIn = hasNeverCheckedIn(streakQuery.data);
  const gatedOff =
    onlyIfNeverCheckedIn &&
    (!streakQuery.isSuccess || !neverCheckedIn);

  const { visible, enabling, error, enable, dismiss } = useActivationPushPrompt({
    surface,
    mode: "pre_checkin",
    onVisibilityChange,
  });

  const show = useMemo(
    () => visible && !gatedOff,
    [gatedOff, visible],
  );

  if (!show) return null;

  return (
    <aside
      className={cn(
        "rounded-2xl border border-primary/30 bg-primary/[0.07] px-4 py-4 sm:px-5",
        className,
      )}
      data-testid="activation-push-cta"
      data-surface={surface}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Bell className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-semibold leading-snug">{t("title")}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{t("body")}</p>
          {error ? (
            <p className="text-xs text-destructive" role="alert">
              {t("error")}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              onClick={() => void enable()}
              disabled={enabling}
              data-testid="activation-push-cta-enable"
            >
              {enabling ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Bell className="size-3.5" aria-hidden />
              )}
              {enabling ? t("enabling") : t("enable")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={dismiss}
              disabled={enabling}
              data-testid="activation-push-cta-dismiss"
            >
              {t("later")}
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
