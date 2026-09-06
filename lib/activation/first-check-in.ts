/**
 * Activation helpers: get a newly signed-in user to /check-in in the same session.
 *
 * Awaiting is session + per-user localStorage so a refresh / new tab still
 * prompts until the first check-in lands. Guest funnel is never blocked.
 */

const AWAITING_SESSION_KEY = "dadiary_awaiting_first_checkin_v1";
const AWAITING_PERSIST_KEY = "dadiary:awaiting-first-checkin-v1";
const LATER_TODAY_KEY = "dadiary:first-checkin-later-today-v1";

/** Delay before the demoted “later today” control appears. */
export const FIRST_CHECK_IN_LATER_DELAY_MS = 8_000;

export type FirstCheckInStreakHint = {
  current_streak?: number | null;
  first_check_in_date?: string | null;
  last_check_in_date?: string | null;
};

/** True when the user has never completed a skin check-in. */
export function hasNeverCheckedIn(streak: FirstCheckInStreakHint | null | undefined): boolean {
  if (!streak) return true;
  if ((streak.current_streak ?? 0) > 0) return false;
  if (streak.first_check_in_date?.trim()) return false;
  if (streak.last_check_in_date?.trim()) return false;
  return true;
}

function readSessionFlag(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeSessionFlag(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, "1");
  } catch {
    /* private mode / quota */
  }
}

function clearSessionFlag(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    /* private mode */
  }
}

type AwaitMap = Record<string, boolean>;

function readAwaitingMap(): AwaitMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(AWAITING_PERSIST_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: AwaitMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (v === true) out[k] = true;
    }
    return out;
  } catch {
    return {};
  }
}

function writeAwaitingUser(userId: string, on: boolean): void {
  if (typeof window === "undefined") return;
  const id = userId.trim();
  if (!id) return;
  try {
    const next = { ...readAwaitingMap() };
    if (on) next[id] = true;
    else delete next[id];
    window.localStorage.setItem(AWAITING_PERSIST_KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota */
  }
}

/** Call after guest claim, register, or signed-in onboarding finish. */
export function markAwaitingFirstCheckIn(userId?: string | null): void {
  writeSessionFlag(AWAITING_SESSION_KEY);
  const id = userId?.trim();
  if (id) writeAwaitingUser(id, true);
}

export function isAwaitingFirstCheckIn(userId?: string | null): boolean {
  if (readSessionFlag(AWAITING_SESSION_KEY)) return true;
  const id = userId?.trim();
  if (id) return readAwaitingMap()[id] === true;
  return false;
}

/** Clear after a successful first check-in (or streak proves they already have one). */
export function clearAwaitingFirstCheckIn(userId?: string | null): void {
  clearSessionFlag(AWAITING_SESSION_KEY);
  const id = userId?.trim();
  if (id) writeAwaitingUser(id, false);
}

type LaterMap = Record<string, string>;

function readLaterMap(): LaterMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LATER_TODAY_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: LaterMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

/** UI snooze for the first-check-in prompt/bar. Does not touch D0 reminder due. */
export function writeFirstCheckInLaterToday(userId: string, day: string): void {
  if (typeof window === "undefined") return;
  const id = userId.trim();
  if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
  try {
    const next = { ...readLaterMap(), [id]: day };
    window.localStorage.setItem(LATER_TODAY_KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota */
  }
}

export function isFirstCheckInLaterToday(userId: string, today: string): boolean {
  const id = userId.trim();
  if (!id) return false;
  return readLaterMap()[id] === today;
}

/** Parse helpers for unit tests (no window). */
export function laterTodayFromMap(raw: unknown, userId: string): string | null {
  if (!raw || typeof raw !== "object") return null;
  const value = (raw as Record<string, unknown>)[userId];
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : null;
}

export function shouldShowFirstCheckInPrompt(input: {
  signedIn: boolean;
  isGuest: boolean;
  pendingAccountClaim: boolean;
  laterToday: boolean;
  awaiting: boolean;
  streakStatus: "loading" | "ready" | "error";
  neverCheckedIn: boolean;
}): boolean {
  if (!input.signedIn || input.isGuest || input.pendingAccountClaim) return false;
  if (input.laterToday) return false;
  if (input.awaiting) return true;
  if (input.streakStatus === "loading") return false;
  if (input.streakStatus === "error") return true;
  return input.neverCheckedIn;
}

/**
 * Persistent in-app bar for users who have never checked in.
 * Hidden after first check-in or an explicit “later today” UI snooze.
 * Snooze must not write the D0/D1 reminder-dismiss key.
 */
export function shouldShowNeverCheckedInBar(input: {
  signedIn: boolean;
  laterToday: boolean;
  onFunnelPath: boolean;
  onCheckInPath: boolean;
  onCoachWelcomePath: boolean;
  streakStatus: "loading" | "ready" | "error";
  neverCheckedIn: boolean;
}): boolean {
  if (!input.signedIn || input.laterToday) return false;
  if (input.onFunnelPath || input.onCheckInPath || input.onCoachWelcomePath) {
    return false;
  }
  if (input.streakStatus !== "ready") return false;
  return input.neverCheckedIn;
}

/** @deprecated Use shouldShowNeverCheckedInBar — kept for existing tests. */
export function shouldShowActivationBanner(input: {
  signedIn: boolean;
  dismissed: boolean;
  onFunnelPath: boolean;
  onCheckInPath: boolean;
  onCoachWelcomePath: boolean;
  streakStatus: "loading" | "ready" | "error";
  neverCheckedIn: boolean;
}): boolean {
  return shouldShowNeverCheckedInBar({
    signedIn: input.signedIn,
    laterToday: input.dismissed,
    onFunnelPath: input.onFunnelPath,
    onCheckInPath: input.onCheckInPath,
    onCoachWelcomePath: input.onCoachWelcomePath,
    streakStatus: input.streakStatus,
    neverCheckedIn: input.neverCheckedIn,
  });
}

export function shouldShowCheckInFirstVisit(input: {
  signedIn: boolean;
  onCheckInPath: boolean;
  streakStatus: "loading" | "ready" | "error";
  neverCheckedIn: boolean;
}): boolean {
  if (!input.signedIn || !input.onCheckInPath) return false;
  if (input.streakStatus === "loading") return false;
  return input.neverCheckedIn || input.streakStatus === "error";
}
