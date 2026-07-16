import type { StreakDayCell, StreakDTO, StreakStatus } from "@/lib/types/streak";

/** Vietnam civil calendar timezone (matches backend streaktime). */
export const STREAK_TZ = "Asia/Ho_Chi_Minh";

/**
 * Calendar day key YYYY-MM-DD in the streak timezone (not browser-local, not UTC).
 * Avoids late-evening VN counting as the previous UTC day.
 */
export function streakDateKey(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: STREAK_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** @deprecated Alias of {@link streakDateKey} — do not treat as UTC. */
export const utcDateKey = streakDateKey;

function parseDateKey(key: string): Date {
  const [y, m, day] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

function shiftDateKey(key: string, deltaDays: number): string {
  const d = parseDateKey(key);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

/** ISO weekday 1 (Mon) … 7 (Sun) for a YYYY-MM-DD key. */
function isoWeekday(key: string): number {
  const dow = parseDateKey(key).getUTCDay(); // 0 Sun … 6 Sat
  return dow === 0 ? 7 : dow;
}

/** Format YYYY-MM-DD for UI (Vietnam calendar, localized). */
export function formatStreakDayLabel(dateKey: string, locale: string): string {
  const d = parseDateKey(dateKey);
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

/**
 * Status for the streak banner — prefer server soft-expire flags when present.
 * - idle — effective streak is 0
 * - protected — is_protected
 * - at_risk — is_at_risk (alive but need check-in today)
 * - maintaining — alive and checked in / not at risk
 */
export function resolveStreakStatus(streak: StreakDTO, today = streakDateKey()): StreakStatus {
  // Prefer API soft-expire fields (Get / freeze return them).
  if (typeof streak.is_at_risk === "boolean" || typeof streak.is_protected === "boolean") {
    if (streak.current_streak <= 0) return "idle";
    if (streak.is_protected) return "protected";
    if (streak.is_at_risk) return "at_risk";
    return "maintaining";
  }

  // Fallback for stale clients / partial payloads.
  if (!streak.last_check_in_date || streak.current_streak <= 0) {
    return "idle";
  }
  const last = streak.last_check_in_date;
  const yesterday = shiftDateKey(today, -1);

  if (last === today) {
    if (streak.protected_until && streak.protected_until >= today) {
      return "protected";
    }
    return "maintaining";
  }

  if (streak.protected_until && streak.protected_until >= today) {
    return "protected";
  }

  if (last === yesterday) {
    return "at_risk";
  }

  return "idle";
}

/**
 * Merge check-in calendar days for the mini history strip.
 *
 * Why merge (not either/or)?
 * - Progress `checkedDates` alone can miss days when the selected range is empty
 *   or does not cover the last N days.
 * - Streak reconstruct alone only covers the *current* consecutive streak window
 *   (plus a protected freeze day) — older check-ins outside that window are lost.
 *
 * Union = reliable last-N view: streak baseline always, progress fills gaps.
 * Freeze-covered days are stripped out so they never appear as false "checked".
 */
export function mergeCheckedDates(
  streak: StreakDTO,
  progressCheckedDates?: ReadonlySet<string> | null,
  today = streakDateKey(),
): Set<string> {
  const merged = reconstructCheckedDates(streak, today);
  if (progressCheckedDates) {
    for (const d of progressCheckedDates) {
      if (d) merged.add(d);
    }
  }
  // Progress may include nothing for freeze days; reconstruct must not invent
  // checks there. Also strip any accidental overlap with freeze-covered days.
  for (const d of resolveFreezeCoveredDates(streak, today)) {
    merged.delete(d);
  }
  return merged;
}

/**
 * Calendar days covered by a freeze (rescued misses), for mini-history.
 *
 * Only days that are actually reserved/consumed — not speculative pending
 * auto-save (those stay `missed` until check-in spends a freeze).
 */
export function resolveFreezeCoveredDates(
  streak: StreakDTO,
  _today = streakDateKey(),
): Set<string> {
  const out = new Set<string>();
  if (streak.freeze_dates) {
    for (const d of streak.freeze_dates) {
      if (d) out.add(d);
    }
  }
  if (streak.last_freeze_date) out.add(streak.last_freeze_date);
  if (streak.protected_until) out.add(streak.protected_until);
  return out;
}

/**
 * Build a short history strip (oldest → newest), always ending with today.
 *
 * Priority per day (after app-start gate):
 *  1. real check-in → `checked` (wins over freeze if both)
 *  2. freeze-covered → `protected`
 *  3. past day → `missed` while alive; soft-expired paints the gap *after*
 *     last_check_in as missed (so the break is visible)
 *  4. today open → `empty`
 */
export function buildStreakHistory(
  streak: StreakDTO,
  days: 7 | 14 = 7,
  checkedDates?: ReadonlySet<string> | null,
  today = streakDateKey(),
): StreakDayCell[] {
  const freezeDays = resolveFreezeCoveredDates(streak, today);
  const checked = mergeCheckedDates(streak, checkedDates, today);
  const appStart = resolveAppStartDate(streak, checked, freezeDays);
  const alive = streak.current_streak > 0;
  const lastCheck = streak.last_check_in_date ?? null;

  const cells: StreakDayCell[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = shiftDateKey(today, -i);
    const isToday = date === today;
    let state: StreakDayCell["state"] = "empty";

    // Before the user started DaDiary — show a blank slot, not a miss.
    if (appStart && date < appStart) {
      cells.push({ date, weekday: isoWeekday(date), state: "empty", isToday });
      continue;
    }

    // Never checked in at all — keep the whole strip empty (no false misses).
    if (!appStart) {
      cells.push({ date, weekday: isoWeekday(date), state: "empty", isToday });
      continue;
    }

    if (checked.has(date)) {
      state = "checked";
    } else if (freezeDays.has(date)) {
      state = "protected";
    } else if (!isToday) {
      if (alive) {
        state = "missed";
      } else if (lastCheck && date > lastCheck) {
        // Soft-expired: show the break gap, not a wall before the last check.
        state = "missed";
      }
    }

    cells.push({
      date,
      weekday: isoWeekday(date),
      state,
      isToday,
    });
  }
  return cells;
}

/**
 * Day the user began using the app (YYYY-MM-DD, Vietnam calendar).
 * Prefer API `first_check_in_date`; fall back to the earliest known activity day.
 */
export function resolveAppStartDate(
  streak: StreakDTO,
  checkedDates?: ReadonlySet<string> | null,
  freezeDays?: ReadonlySet<string> | null,
): string | null {
  if (streak.first_check_in_date) return streak.first_check_in_date;

  let earliest: string | null = null;
  const consider = (d: string | null | undefined) => {
    if (!d) return;
    if (!earliest || d < earliest) earliest = d;
  };
  consider(streak.last_check_in_date);
  consider(streak.last_freeze_date);
  if (checkedDates) {
    for (const d of checkedDates) consider(d);
  }
  if (freezeDays) {
    for (const d of freezeDays) consider(d);
  }
  return earliest;
}

/**
 * Walk back from last_check_in_date for `current_streak` *real* check days,
 * skipping freeze-covered days so they are never counted as checked.
 *
 * Soft-expired (effective streak 0): still seed `last_check_in_date` so the
 * mini strip shows the last real check instead of an empty slot.
 */
export function reconstructCheckedDates(
  streak: StreakDTO,
  today = streakDateKey(),
): Set<string> {
  const out = new Set<string>();
  if (!streak.last_check_in_date) return out;

  if (streak.current_streak <= 0) {
    out.add(streak.last_check_in_date);
    return out;
  }

  const freezeDays = resolveFreezeCoveredDates(streak, today);
  let cursor = streak.last_check_in_date;
  let remaining = streak.current_streak;
  // Safety cap — avoid infinite loops on bad data.
  let guard = 0;

  while (remaining > 0 && guard < 400) {
    guard++;
    if (freezeDays.has(cursor)) {
      // Freeze day bridges the streak but is not a SkinCheck day.
      cursor = shiftDateKey(cursor, -1);
      continue;
    }
    out.add(cursor);
    remaining--;
    cursor = shiftDateKey(cursor, -1);
  }
  return out;
}

/** Whether the user can proactively spend a freeze right now (manual freeze). */
export function canUseFreeze(streak: StreakDTO, today = streakDateKey()): boolean {
  if (streak.freezes_available <= 0) return false;
  if (streak.current_streak <= 0) return false;
  if (streak.is_protected) return false;
  if (!streak.last_check_in_date) return false;
  if (streak.protected_until && streak.protected_until >= today) return false;
  // Pending auto-freeze / bridged miss: must check in, not manual-freeze.
  if ((streak.days_since_last_check_in ?? 0) >= 2) return false;
  return true;
}

/**
 * Which calendar day a manual freeze will protect (mirrors backend UseFreeze).
 * - Checked in today → protect tomorrow
 * - Otherwise (at risk) → protect today
 */
export function manualFreezeTarget(
  streak: StreakDTO,
  today = streakDateKey(),
): "today" | "tomorrow" {
  if (streak.last_check_in_date === today) return "tomorrow";
  return "today";
}

/** YYYY-MM-DD that a manual freeze would cover right now. */
export function manualFreezeTargetDate(
  streak: StreakDTO,
  today = streakDateKey(),
): string {
  return manualFreezeTarget(streak, today) === "tomorrow"
    ? shiftDateKey(today, 1)
    : today;
}

export type FreezeBlockReason =
  | "none"
  | "no_freezes"
  | "no_streak"
  | "already_protected"
  | "catch_up_required"
  | "bridged_catch_up"
  | "soft_expired";

/** Short reason key when freeze cannot be used (for i18n). */
export function freezeBlockReason(
  streak: StreakDTO,
  today = streakDateKey(),
): FreezeBlockReason {
  if (streak.current_streak <= 0) {
    if (streak.last_check_in_date && (streak.days_since_last_check_in ?? 0) >= 2) {
      return "soft_expired";
    }
    return "no_streak";
  }
  if ((streak.days_since_last_check_in ?? 0) >= 2) {
    return isManualBridgeCatchUp(streak, today) ? "bridged_catch_up" : "catch_up_required";
  }
  if (streak.freezes_available <= 0) return "no_freezes";
  if (streak.is_protected || (streak.protected_until && streak.protected_until >= today)) {
    return "already_protected";
  }
  return "none";
}

/** True when yesterday was already covered by a spent manual freeze. */
export function isManualBridgeCatchUp(streak: StreakDTO, today = streakDateKey()): boolean {
  if ((streak.days_since_last_check_in ?? 0) !== 2) return false;
  if (!streak.is_at_risk || streak.current_streak <= 0) return false;
  const yesterday = shiftDateKey(today, -1);
  if (streak.last_freeze_date === yesterday) return true;
  if (streak.freeze_dates?.includes(yesterday)) return true;
  // Gap=2 + at_risk with no freezes left can only be a live bridge (pending
  // auto-save requires freezes_available > 0). Covers missing LFD on legacy rows.
  if (streak.freezes_available <= 0) return true;
  return false;
}

/** True when GET shows at_risk because a 1-day miss can still be auto-saved. */
export function isPendingAutoSave(streak: StreakDTO, today = streakDateKey()): boolean {
  if (
    !streak.is_at_risk ||
    streak.current_streak <= 0 ||
    (streak.days_since_last_check_in ?? 0) !== 2 ||
    streak.freezes_available <= 0
  ) {
    return false;
  }
  // Manual bridge already spent a freeze on yesterday — check-in won't auto-save.
  return !isManualBridgeCatchUp(streak, today);
}

/** Soft-expired with a known last check — for ended hint UI. */
export function isSoftExpiredStreak(streak: StreakDTO): boolean {
  return (
    streak.current_streak <= 0 &&
    Boolean(streak.last_check_in_date) &&
    (streak.days_since_last_check_in ?? 0) >= 2
  );
}

/** Flame colour tier by current streak length. */
export function streakFlameTier(n: number): "none" | "warm" | "hot" | "blaze" {
  if (n >= 7) return "blaze";
  if (n >= 3) return "hot";
  if (n >= 1) return "warm";
  return "none";
}
