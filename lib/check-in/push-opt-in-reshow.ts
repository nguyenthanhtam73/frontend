/**
 * One-time push card after a logged-in check-in.
 * Deliberately does not read the local "dismissed" nudge flag — the server
 * `push_opt_in_reshow_eligible` bit is what re-opens the card.
 */
export type PushOptInReshowInput = {
  pushOptInReshowEligible: boolean;
  supportOk: boolean;
  permission: NotificationPermission | "unknown";
  /** True when `pushManager.getSubscription()` returned a subscription. */
  hasBrowserSubscription: boolean;
  localPushEnabled: boolean;
  /** True when the first-check-in nudge is already on screen. */
  firstCheckInNudgeVisible: boolean;
};

export function shouldReshowPushAfterCheckIn(input: PushOptInReshowInput): boolean {
  if (!input.pushOptInReshowEligible) return false;
  if (!input.supportOk) return false;
  if (input.permission === "denied") return false;
  if (input.hasBrowserSubscription) return false;
  if (input.localPushEnabled) return false;
  if (input.firstCheckInNudgeVisible) return false;
  return true;
}
