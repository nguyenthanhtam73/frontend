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

/** Free plan: celebrate / list only these (matches backend BasicMilestoneDays). */
export const BASIC_MILESTONE_DAYS: ReadonlySet<number> = new Set([3, 7]);

/** Catalog visible for the current plan. */
export function milestonesForPlan(fullAccess: boolean): readonly StreakMilestone[] {
  if (fullAccess) return STREAK_MILESTONES;
  return STREAK_MILESTONES.filter((m) => BASIC_MILESTONE_DAYS.has(m.days));
}

/** Premium-only milestones (teaser / locked rows). */
export function premiumOnlyMilestones(): readonly StreakMilestone[] {
  return STREAK_MILESTONES.filter((m) => !BASIC_MILESTONE_DAYS.has(m.days));
}

/**
 * Highest milestone with days ≤ currentStreak that is not yet celebrated,
 * constrained to `catalog` (Free = basic only).
 */
export function findPendingMilestone(
  currentStreak: number,
  celebratedDays: ReadonlySet<number>,
  catalog: readonly StreakMilestone[] = STREAK_MILESTONES,
): StreakMilestone | null {
  if (currentStreak <= 0) return null;
  let pending: StreakMilestone | null = null;
  for (const m of catalog) {
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
