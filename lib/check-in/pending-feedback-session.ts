/** Shared sessionStorage helpers for in-flight check-in AI feedback. */

export const CHECKIN_FEEDBACK_SESSION_KEY = "dadiary_checkin_feedback_pending";
export const CHECKIN_FEEDBACK_JOB_TTL_MS = 15 * 60 * 1000;

/** Banner dismiss — localStorage map checkId → expiresAt (ms). */
export const PROGRESS_PENDING_BANNER_DISMISS_KEY =
  "dadiary_progress_pending_banner_dismiss_v2";

export type PersistedCheckInPending = {
  checkId: string;
  startedAt: number;
};

type BannerDismissStore = Record<string, number>;

function readDismissStore(): BannerDismissStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PROGRESS_PENDING_BANNER_DISMISS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as BannerDismissStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeDismissStore(store: BannerDismissStore) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      PROGRESS_PENDING_BANNER_DISMISS_KEY,
      JSON.stringify(store),
    );
  } catch {
    /* quota / private mode */
  }
}

function pruneDismissStore(store: BannerDismissStore): BannerDismissStore {
  const now = Date.now();
  const next: BannerDismissStore = {};
  for (const [id, expiresAt] of Object.entries(store)) {
    if (expiresAt > now) next[id] = expiresAt;
  }
  return next;
}

export function readPersistedCheckInPending(): PersistedCheckInPending | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CHECKIN_FEEDBACK_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedCheckInPending;
    if (!parsed?.checkId || !parsed.startedAt) return null;
    if (Date.now() - parsed.startedAt > CHECKIN_FEEDBACK_JOB_TTL_MS) {
      sessionStorage.removeItem(CHECKIN_FEEDBACK_SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function persistCheckInPending(job: PersistedCheckInPending) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CHECKIN_FEEDBACK_SESSION_KEY, JSON.stringify(job));
  } catch {
    /* quota / private mode */
  }
}

export function clearPersistedCheckInPending() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(CHECKIN_FEEDBACK_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function isBannerDismissedForCheck(checkId: string): boolean {
  if (typeof window === "undefined") return false;
  const store = pruneDismissStore(readDismissStore());
  const expiresAt = store[checkId];
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    delete store[checkId];
    writeDismissStore(store);
    return false;
  }
  return true;
}

/** Hide the progress banner for this check-in (default: 24 hours). */
export function dismissBannerForCheck(
  checkId: string,
  durationInHours = 24,
) {
  if (typeof window === "undefined") return;
  const store = pruneDismissStore(readDismissStore());
  store[checkId] = Date.now() + durationInHours * 60 * 60 * 1000;
  writeDismissStore(store);
}

export function isAnalysisProcessing(status: string | undefined): boolean {
  return status === "pending" || status === "processing";
}
