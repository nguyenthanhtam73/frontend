"use client";

import { useCallback, useEffect, useState } from "react";

import { subscribePush } from "@/lib/api/push";
import { FUNNEL_EVENTS, trackFunnelEventOncePerUser } from "@/lib/analytics/funnel";
import { getAccessToken } from "@/lib/auth-token";
import {
  readPushNudgeStatus,
  shouldPromptActivationPush,
  shouldPromptFirstCheckInPush,
  writePushNudgeStatus,
} from "@/lib/check-in/first-check-in-push";
import { useAuthStore } from "@/lib/stores/auth-store";
import {
  checkPushSupport,
  createBrowserPushSubscription,
  getLocalPushEnabled,
  logPushError,
  setLocalPushEnabled,
} from "@/lib/web-push";

export type ActivationPushMode = "pre_checkin" | "post_first_checkin";

type Args = {
  surface: string;
  mode: ActivationPushMode;
  checkInCompleted?: boolean;
  isFirstCheckIn?: boolean;
  onVisibilityChange?: (visible: boolean) => void;
};

export function useActivationPushPrompt({
  surface,
  mode,
  checkInCompleted = false,
  isFirstCheckIn = false,
  onVisibilityChange,
}: Args) {
  const userId = useAuthStore((s) => s.user?.id);
  const signedIn = Boolean(userId || getAccessToken());
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const support = checkPushSupport();
    const permission: NotificationPermission | "unknown" =
      typeof Notification === "undefined" ? "unknown" : Notification.permission;
    const gate = {
      supportOk: support.ok,
      permission,
      localPushEnabled: getLocalPushEnabled(),
      nudgeStatus: userId ? readPushNudgeStatus(userId) : null,
    };
    const show =
      mode === "pre_checkin"
        ? shouldPromptActivationPush({ signedIn, ...gate })
        : shouldPromptFirstCheckInPush({
            checkInCompleted,
            isFirstCheckIn,
            ...gate,
          });
    setVisible(show);
    setReady(true);
  }, [checkInCompleted, isFirstCheckIn, mode, signedIn, userId]);

  useEffect(() => {
    onVisibilityChange?.(visible);
  }, [onVisibilityChange, visible]);

  const dismiss = useCallback(() => {
    if (userId) {
      writePushNudgeStatus(userId, "dismissed");
      trackFunnelEventOncePerUser(FUNNEL_EVENTS.pushDismissed, userId, {
        surface,
        mode,
      });
    }
    setVisible(false);
  }, [mode, surface, userId]);

  const enable = useCallback(async () => {
    setError(null);
    setEnabling(true);
    try {
      const sub = await createBrowserPushSubscription();
      await subscribePush(sub);
      setLocalPushEnabled(true);
      if (userId) {
        writePushNudgeStatus(userId, "enabled");
        trackFunnelEventOncePerUser(FUNNEL_EVENTS.pushOptIn, userId, {
          surface,
          mode,
        });
      }
      setVisible(false);
    } catch (err) {
      logPushError(`activation-push:${surface}`, err);
      const code = err instanceof Error ? err.message : "";
      if (code === "permission_denied") {
        if (userId) {
          writePushNudgeStatus(userId, "dismissed");
          trackFunnelEventOncePerUser(FUNNEL_EVENTS.pushDismissed, userId, {
            surface,
            mode,
            reason: "permission_denied",
          });
        }
        setVisible(false);
        return;
      }
      setError("failed");
    } finally {
      setEnabling(false);
    }
  }, [mode, surface, userId]);

  return { visible, ready, enabling, error, enable, dismiss };
}
