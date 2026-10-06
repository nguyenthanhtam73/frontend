"use client";

import { useCallback, useEffect, useState } from "react";

import { subscribePush } from "@/lib/api/push";
import { skipPushOptIn } from "@/lib/api/reminder";
import { FUNNEL_EVENTS, trackFunnelEventOncePerUser } from "@/lib/analytics/funnel";
import { getAccessToken } from "@/lib/auth-token";
import {
  readPushNudgeStatus,
  shouldPromptActivationPush,
  shouldPromptFirstCheckInPush,
  writePushNudgeStatus,
} from "@/lib/check-in/first-check-in-push";
import { shouldReshowPushAfterCheckIn } from "@/lib/check-in/push-opt-in-reshow";
import { useAuthStore } from "@/lib/stores/auth-store";
import {
  checkPushSupport,
  createBrowserPushSubscription,
  getLocalPushEnabled,
  logPushError,
  setLocalPushEnabled,
} from "@/lib/web-push";

export type ActivationPushMode = "pre_checkin" | "post_first_checkin" | "post_checkin_reshow";

type Args = {
  surface: string;
  mode: ActivationPushMode;
  checkInCompleted?: boolean;
  isFirstCheckIn?: boolean;
  onVisibilityChange?: (visible: boolean) => void;
  onReadyChange?: (ready: boolean) => void;
  /** Server `push_opt_in_reshow_eligible`. Only read for `post_checkin_reshow`. */
  reshowEligible?: boolean;
  /**
   * PushManager subscription. `null` while the lookup is in flight.
   * Only read for `post_checkin_reshow`.
   */
  hasBrowserSubscription?: boolean | null;
  /** When the first-check-in card is already on screen, the re-show stays hidden. */
  firstCheckInNudgeVisible?: boolean;
};

export function useActivationPushPrompt({
  surface,
  mode,
  checkInCompleted = false,
  isFirstCheckIn = false,
  onVisibilityChange,
  onReadyChange,
  reshowEligible = false,
  hasBrowserSubscription = null,
  firstCheckInNudgeVisible = false,
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
    if (mode === "post_checkin_reshow") {
      const show =
        typeof hasBrowserSubscription === "boolean" &&
        shouldReshowPushAfterCheckIn({
          pushOptInReshowEligible: reshowEligible,
          supportOk: support.ok,
          permission,
          hasBrowserSubscription,
          localPushEnabled: getLocalPushEnabled(),
          firstCheckInNudgeVisible,
        });
      setVisible(show);
      setReady(true);
      return;
    }
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
  }, [
    checkInCompleted,
    firstCheckInNudgeVisible,
    hasBrowserSubscription,
    isFirstCheckIn,
    mode,
    reshowEligible,
    signedIn,
    userId,
  ]);

  useEffect(() => {
    onVisibilityChange?.(visible);
  }, [onVisibilityChange, visible]);

  useEffect(() => {
    onReadyChange?.(ready);
  }, [onReadyChange, ready]);

  const dismiss = useCallback(() => {
    if (userId) {
      writePushNudgeStatus(userId, "dismissed");
      trackFunnelEventOncePerUser(FUNNEL_EVENTS.pushDismissed, userId, {
        surface,
        mode,
      });
    }
    // Explicit Later only. permission_denied is handled in `enable` and must
    // not tell the server the user skipped the opt-in.
    if (getAccessToken()) {
      void skipPushOptIn();
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
