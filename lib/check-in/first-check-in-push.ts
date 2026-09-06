const STORAGE_KEY = "dadiary:push-nudge-v1";

export type PushNudgeStatus = "dismissed" | "enabled";

type NudgeMap = Record<string, PushNudgeStatus>;

export function isFirstCheckInStreak(streak: {
  current_streak?: number | null;
  first_check_in_date?: string | null;
  last_check_in_date?: string | null;
}): boolean {
  if (streak.current_streak !== 1) return false;
  const first = streak.first_check_in_date?.trim();
  const last = streak.last_check_in_date?.trim();
  if (!first || !last) return true;
  return first === last;
}

export type ActivationPushGate = {
  supportOk: boolean;
  permission: NotificationPermission | "unknown";
  localPushEnabled: boolean;
  nudgeStatus: PushNudgeStatus | null;
};

/** Shared “already decided / cannot prompt” gates for activation + fallback. */
export function canOfferActivationPush(input: ActivationPushGate): boolean {
  if (!input.supportOk) return false;
  if (input.permission === "denied") return false;
  if (input.localPushEnabled) return false;
  if (input.nudgeStatus === "dismissed" || input.nudgeStatus === "enabled") {
    return false;
  }
  return true;
}

/**
 * Pre-check-in Web Push CTA (register / coach-welcome / /check-in).
 * Does not require a completed first check-in.
 */
export function shouldPromptActivationPush(
  input: ActivationPushGate & { signedIn: boolean },
): boolean {
  if (!input.signedIn) return false;
  return canOfferActivationPush(input);
}

export function shouldPromptFirstCheckInPush(input: {
  checkInCompleted: boolean;
  isFirstCheckIn: boolean;
  supportOk: boolean;
  permission: NotificationPermission | "unknown";
  localPushEnabled: boolean;
  nudgeStatus: PushNudgeStatus | null;
}): boolean {
  if (!input.checkInCompleted || !input.isFirstCheckIn) return false;
  return canOfferActivationPush(input);
}

function readMap(): NudgeMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as NudgeMap;
  } catch {
    return {};
  }
}

export function readPushNudgeStatus(userId: string): PushNudgeStatus | null {
  const id = userId.trim();
  if (!id) return null;
  const value = readMap()[id];
  return value === "dismissed" || value === "enabled" ? value : null;
}

export function writePushNudgeStatus(
  userId: string,
  status: PushNudgeStatus,
): void {
  if (typeof window === "undefined") return;
  const id = userId.trim();
  if (!id) return;
  try {
    const next = { ...readMap(), [id]: status };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // private mode / quota
  }
}
