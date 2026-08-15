"use client";

import { Bell, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { subscribePush } from "@/lib/api/push";
import {
  isFirstCheckInStreak,
  readPushNudgeStatus,
  shouldPromptFirstCheckInPush,
  writePushNudgeStatus,
} from "@/lib/check-in/first-check-in-push";
import { useStreak } from "@/lib/hooks/use-streak";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { CreateSkinCheckResponseDTO } from "@/lib/types/skin-check";
import {
  checkPushSupport,
  createBrowserPushSubscription,
  getLocalPushEnabled,
  logPushError,
  setLocalPushEnabled,
} from "@/lib/web-push";

type Props = {
  completed: boolean;
  payload: CreateSkinCheckResponseDTO | null;
};

export function FirstCheckInPushNudge({ completed, payload }: Props) {
  const t = useTranslations("checkIn.pushNudge");
  const userId = useAuthStore((s) => s.user?.id);
  const streakQuery = useStreak();
  const [visible, setVisible] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFirst = useMemo(() => {
    if (streakQuery.data) return isFirstCheckInStreak(streakQuery.data);
    if (streakQuery.isPending) return false;
    return payload?.streak ? isFirstCheckInStreak(payload.streak) : false;
  }, [payload?.streak, streakQuery.data, streakQuery.isPending]);

  useEffect(() => {
    if (!completed || !userId) {
      setVisible(false);
      return;
    }
    const support = checkPushSupport();
    const permission =
      typeof Notification === "undefined" ? "unknown" : Notification.permission;
    const show = shouldPromptFirstCheckInPush({
      checkInCompleted: true,
      isFirstCheckIn: isFirst,
      supportOk: support.ok,
      permission,
      localPushEnabled: getLocalPushEnabled(),
      nudgeStatus: readPushNudgeStatus(userId),
    });
    setVisible(show);
  }, [completed, isFirst, userId]);

  const dismiss = useCallback(() => {
    if (userId) writePushNudgeStatus(userId, "dismissed");
    setVisible(false);
  }, [userId]);

  const enable = useCallback(async () => {
    setError(null);
    setEnabling(true);
    try {
      const sub = await createBrowserPushSubscription();
      await subscribePush(sub);
      setLocalPushEnabled(true);
      if (userId) writePushNudgeStatus(userId, "enabled");
      setVisible(false);
    } catch (err) {
      logPushError("first-check-in-nudge", err);
      const code = err instanceof Error ? err.message : "";
      if (code === "permission_denied") {
        if (userId) writePushNudgeStatus(userId, "dismissed");
        setVisible(false);
        return;
      }
      setError(t("error"));
    } finally {
      setEnabling(false);
    }
  }, [t, userId]);

  if (!visible) return null;

  return (
    <aside
      className="rounded-2xl border border-primary/30 bg-primary/[0.07] px-4 py-4 sm:px-5"
      data-testid="first-check-in-push-nudge"
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
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              onClick={() => void enable()}
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
              onClick={dismiss}
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
