"use client";

import { useEffect, useRef, useState } from "react";

import { PushNudgeCard } from "@/components/check-in/first-check-in-push-nudge";
import { consumePushOptInReshow, fetchPushOptInReminder } from "@/lib/api/reminder";
import { getAccessToken } from "@/lib/auth-token";
import { useActivationPushPrompt } from "@/lib/hooks/use-activation-push";
import { probeBrowserPushSubscription } from "@/lib/web-push";

type Props = {
  checkInId: string;
  /** False until the first-check-in nudge has finished its own gate. */
  firstNudgeReady: boolean;
  firstNudgeVisible: boolean;
};

/** One consume per check-in, including React strict-mode remounts. */
const consumedReshowIds = new Set<string>();

/**
 * After a logged-in check-in completes, ask the server once whether the push
 * card should appear again. Does not run on a bare app open — the parent only
 * mounts this while `feedback.phase === "completed"`.
 */
export function PostCheckInPushReshow({
  checkInId,
  firstNudgeReady,
  firstNudgeVisible,
}: Props) {
  const consumedRef = useRef(false);
  const [reshowEligible, setReshowEligible] = useState(false);
  const [hasBrowserSubscription, setHasBrowserSubscription] = useState<boolean | null>(null);
  // If the first-check-in card showed for this completion, don't replace it
  // with the re-show the moment the user taps Later.
  const [sawFirstNudge, setSawFirstNudge] = useState(false);
  if (firstNudgeVisible && !sawFirstNudge) {
    setSawFirstNudge(true);
  }

  useEffect(() => {
    let cancelled = false;
    if (!getAccessToken()) return;
    void (async () => {
      const [reminder, subscribed] = await Promise.all([
        fetchPushOptInReminder(),
        probeBrowserPushSubscription(),
      ]);
      if (cancelled) return;
      setReshowEligible(reminder?.push_opt_in_reshow_eligible === true);
      setHasBrowserSubscription(subscribed);
    })();
    return () => {
      cancelled = true;
    };
  }, [checkInId]);

  const { visible, enabling, error, enable, dismiss } = useActivationPushPrompt({
    surface: "post_checkin_reshow",
    mode: "post_checkin_reshow",
    reshowEligible,
    hasBrowserSubscription,
    firstCheckInNudgeVisible: !firstNudgeReady || firstNudgeVisible || sawFirstNudge,
  });

  useEffect(() => {
    if (!visible || !checkInId || consumedRef.current || consumedReshowIds.has(checkInId)) {
      return;
    }
    consumedRef.current = true;
    consumedReshowIds.add(checkInId);
    void consumePushOptInReshow();
  }, [checkInId, visible]);

  if (!visible) return null;

  return (
    <PushNudgeCard
      testId="post-checkin-push-reshow"
      enabling={enabling}
      error={error}
      onEnable={() => void enable()}
      onDismiss={dismiss}
    />
  );
}
