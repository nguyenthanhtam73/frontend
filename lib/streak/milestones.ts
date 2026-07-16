/** Streak milestone definitions — edit this list to add/remove celebration thresholds. */

export type MilestoneTier = "small" | "medium" | "large";

export type StreakMilestone = {
  /** Consecutive check-in days required. */
  days: number;
  tier: MilestoneTier;
  /** i18n key suffix under progress.streak.milestone.* */
  copyKey: string;
};

/**
 * Ordered ascending. Detection always picks the highest reached-but-unseen
 * milestone so users who jump ahead still get one clear celebration.
 */
export const STREAK_MILESTONES: readonly StreakMilestone[] = [
  { days: 3, tier: "small", copyKey: "d3" },
  { days: 7, tier: "small", copyKey: "d7" },
  { days: 14, tier: "medium", copyKey: "d14" },
  { days: 30, tier: "medium", copyKey: "d30" },
  { days: 60, tier: "large", copyKey: "d60" },
  { days: 100, tier: "large", copyKey: "d100" },
] as const;

/** Highest milestone with days ≤ currentStreak that is not yet celebrated. */
export function findPendingMilestone(
  currentStreak: number,
  celebratedDays: ReadonlySet<number>,
): StreakMilestone | null {
  if (currentStreak <= 0) return null;
  let pending: StreakMilestone | null = null;
  for (const m of STREAK_MILESTONES) {
    if (m.days > currentStreak) break;
    if (!celebratedDays.has(m.days)) {
      pending = m;
    }
  }
  return pending;
}

/** All milestone days at or below `upToDays` (inclusive) — mark as seen together. */
export function milestoneDaysThrough(upToDays: number): number[] {
  return STREAK_MILESTONES.filter((m) => m.days <= upToDays).map((m) => m.days);
}
