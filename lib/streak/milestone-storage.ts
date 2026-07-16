import { milestoneDaysThrough } from "@/lib/streak/milestones";

const STORAGE_PREFIX = "dadiary.streak.milestones.v1";

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}:${userId}`;
}

function readRaw(userId: string): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  } catch {
    return [];
  }
}

function writeRaw(userId: string, days: number[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify([...new Set(days)].sort((a, b) => a - b)));
  } catch {
    // Quota / private mode — celebration may repeat; acceptable fallback.
  }
}

/** Days the user has already been congratulated for (per account). */
export function getCelebratedMilestoneDays(userId: string): Set<number> {
  return new Set(readRaw(userId));
}

/**
 * Mark this milestone (and every lower one) as celebrated so we never show
 * a cascade of older celebrations on the next visit.
 */
export function markMilestonesCelebratedThrough(userId: string, upToDays: number): void {
  const next = new Set(readRaw(userId));
  for (const d of milestoneDaysThrough(upToDays)) {
    next.add(d);
  }
  writeRaw(userId, [...next]);
}
