import { hasNeverCheckedIn, type FirstCheckInStreakHint } from "@/lib/activation/first-check-in";

import type { FreezeBlockReason } from "./history";

export type StreakProtectionContextInput = {
  allowFreeze: boolean;
  blockReason: FreezeBlockReason;
  pendingAuto: boolean;
  isProtected: boolean;
  /** Alive streak that still needs today's check-in. */
  atRisk: boolean;
};

/**
 * i18n key under `progress.streak`, or null when the active-until line is enough.
 *
 * Idle / never-started users keep the educational `freeze.contextIdle` line —
 * not `freeze.block.no_streak`, which reads as a hard deny under "Streak
 * protection" and fights "Check in to start".
 */
export function streakProtectionContextKey(
  input: StreakProtectionContextInput,
): string | null {
  if (input.isProtected) return null;
  if (input.pendingAuto) return "freeze.contextAutoSave";
  if (input.blockReason === "bridged_catch_up") return "freeze.block.bridged_catch_up";
  if (input.blockReason === "catch_up_required") return "freeze.block.catch_up_required";
  if (input.blockReason === "soft_expired") return "freeze.block.soft_expired";
  if (input.blockReason === "no_freezes") return "freeze.exhausted";
  if (input.blockReason === "already_protected") return "freeze.block.already_protected";
  if (input.blockReason === "no_streak") return "freeze.contextIdle";
  if (input.allowFreeze && input.atRisk) return "freeze.contextAtRisk";
  if (input.allowFreeze) return "freeze.contextManual";
  return "freeze.contextIdle";
}

/** Mini-history caption: don't imply DaDiary already started with no check-in. */
export function streakHistoryHintKey(
  streak: FirstCheckInStreakHint | null | undefined,
): "historyHintEmpty" | "historyHint" {
  return hasNeverCheckedIn(streak) ? "historyHintEmpty" : "historyHint";
}

/** Milestone blurb: don't promise a Premium lock before the first check-in. */
export function streakMilestoneSubKey(
  streak: FirstCheckInStreakHint | null | undefined,
): "list.subBeforeCheckIn" | "list.sub" {
  return hasNeverCheckedIn(streak) ? "list.subBeforeCheckIn" : "list.sub";
}
