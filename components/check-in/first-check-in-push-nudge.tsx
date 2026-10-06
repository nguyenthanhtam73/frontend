"use client";

import { Bell, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { isFirstCheckInStreak } from "@/lib/check-in/first-check-in-push";
import { useActivationPushPrompt } from "@/lib/hooks/use-activation-push";
import { useStreak } from "@/lib/hooks/use-streak";
import type { CreateSkinCheckResponseDTO } from "@/lib/types/skin-check";

type Props = {
  completed: boolean;
  payload: CreateSkinCheckResponseDTO | null;
  onVisibilityChange?: (visible: boolean) => void;
  onReadyChange?: (ready: boolean) => void;
};

export function PushNudgeCard({
  testId,
  enabling,
  error,
  onEnable,
  onDismiss,
}: {
  testId: string;
  enabling: boolean;
  error: string | null;
  onEnable: () => void;
  onDismiss: () => void;
}) {
  const t = useTranslations("checkIn.pushNudge");

  return (
    <aside
      className="rounded-2xl border border-primary/30 bg-primary/[0.07] px-4 py-4 sm:px-5"
      data-testid={testId}
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
              onClick={onEnable}
              disabled={enabling}
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
              onClick={onDismiss}
              disabled={enabling}
            >
              {t("later")}
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}

/**
 * Fallback Web Push nudge after the first check-in.
 * Hidden if the user already opted in or dismissed the pre-check-in CTA.
 */
export function FirstCheckInPushNudge({
  completed,
  payload,
  onVisibilityChange,
  onReadyChange,
}: Props) {
  const streakQuery = useStreak();

  const isFirst = useMemo(() => {
    if (streakQuery.data) return isFirstCheckInStreak(streakQuery.data);
    if (streakQuery.isPending) return false;
    return payload?.streak ? isFirstCheckInStreak(payload.streak) : false;
  }, [payload?.streak, streakQuery.data, streakQuery.isPending]);

  const { visible, enabling, error, enable, dismiss } = useActivationPushPrompt({
    surface: "first_check_in_fallback",
    mode: "post_first_checkin",
    checkInCompleted: completed,
    isFirstCheckIn: isFirst,
    onVisibilityChange,
    onReadyChange,
  });

  if (!visible) return null;

  return (
    <PushNudgeCard
      testId="first-check-in-push-nudge"
      enabling={enabling}
      error={error}
      onEnable={() => void enable()}
      onDismiss={dismiss}
    />
  );
}
