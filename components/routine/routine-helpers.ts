/**
 * Pure utilities for the Routine Management feature. Anything that does not
 * touch React, the network, or `next-intl` lives here so the parts/ files stay
 * lean and the unit-testable surface is obvious.
 */
import type { RoutineDTO, RoutineHistoryDTO, RoutineStepDTO } from "@/lib/types/routine";

export type StepSection = "morning" | "evening";

/**
 * Local in-memory shape used by the editor. We keep it slightly different from
 * the DTO so the UI can carry "draft" state (e.g. `routineDate` may be empty
 * before the first save, `source` defaults to "manual").
 */
export type LocalRoutine = {
  morning: RoutineStepDTO[];
  evening: RoutineStepDTO[];
  notes: string;
  source: string;
  skillMode: string;
  saved: boolean;
  routineDate: string;
  carriedFromDate: string;
};

export const emptyRoutine: LocalRoutine = {
  morning: [],
  evening: [],
  notes: "",
  source: "manual",
  skillMode: "",
  saved: false,
  routineDate: "",
  carriedFromDate: "",
};

/** Generate a stable client-side id for a freshly-added step. */
export function localId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `step-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

/** Convert a server-side `RoutineDTO` into the editor's local shape. */
export function toLocal(routine: RoutineDTO | null): LocalRoutine {
  if (!routine) return emptyRoutine;
  return {
    morning: (routine.morning ?? []).map((s) => ({ ...s, id: s.id || localId() })),
    evening: (routine.evening ?? []).map((s) => ({ ...s, id: s.id || localId() })),
    notes: routine.notes ?? "",
    source: routine.source ?? "manual",
    skillMode: routine.skill_mode ?? "",
    saved: !!routine.saved,
    routineDate: routine.routine_date ?? "",
    carriedFromDate: routine.carried_from_date ?? "",
  };
}

/** Step ids that were ticked complete and persisted — immutable in the editor. */
export function lockedCompletedIds(routine: LocalRoutine): Set<string> {
  const ids = new Set<string>();
  for (const s of [...routine.morning, ...routine.evening]) {
    if (s.completed) ids.add(s.id);
  }
  return ids;
}

/** Strip transient fields and trim strings before sending to the API. */
export function stripStep(s: RoutineStepDTO): RoutineStepDTO {
  return {
    id: s.id,
    title: s.title.trim(),
    category: (s.category ?? "other").trim(),
    notes: (s.notes ?? "").trim(),
    completed: !!s.completed,
  };
}

/** "10/05" — locale-agnostic so it always fits the tiny history pill. */
export function formatShortDate(iso: string): string {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}`;
}

/**
 * Soft validation result for the Save action.
 *
 * - `blockers` prevent saving (e.g. no steps at all). The save button is
 *   visually disabled and the explainer banner shows above the editor.
 * - `warnings` are nudges (e.g. AM is missing SPF). They show inline but do
 *   not block — skincare is personal and forcing rules erodes trust.
 */
export type ValidationIssueCode = "no_steps" | "no_title" | "missing_spf";

export type ValidationIssue = {
  code: ValidationIssueCode;
  message: string;
  severity: "blocker" | "warning";
  section?: "morning";
};

export type RoutineValidation = {
  issues: ValidationIssue[];
  blockers: string[];
  warnings: string[];
  canSave: boolean;
  hasEmptyTitles: boolean;
  missingSpf: boolean;
};

export type ValidationLabels = {
  noStepsBlocker: string;
  noStepsBlockerBeginner: string;
  noTitleBlocker: string;
  noTitleBlockerBeginner: string;
  amSpfWarning: string;
  amSpfWarningBeginner: string;
};

export function validateRoutine(
  routine: LocalRoutine,
  labels: ValidationLabels,
  opts?: { beginnerSimple?: boolean },
): RoutineValidation {
  const beginnerSimple = opts?.beginnerSimple ?? false;
  const morningClean = routine.morning.filter((s) => s.title.trim().length > 0);
  const eveningClean = routine.evening.filter((s) => s.title.trim().length > 0);

  const issues: ValidationIssue[] = [];
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (morningClean.length === 0 && eveningClean.length === 0) {
    const msg = beginnerSimple ? labels.noStepsBlockerBeginner : labels.noStepsBlocker;
    blockers.push(msg);
    issues.push({ code: "no_steps", message: msg, severity: "blocker" });
  }

  const totalRows = routine.morning.length + routine.evening.length;
  const hasEmptyTitles =
    totalRows > 0 &&
    morningClean.length === 0 &&
    eveningClean.length === 0;

  if (hasEmptyTitles) {
    const msg = beginnerSimple ? labels.noTitleBlockerBeginner : labels.noTitleBlocker;
    blockers.push(msg);
    issues.push({ code: "no_title", message: msg, severity: "blocker" });
  }

  const missingSpf = morningClean.length > 0 && !hasSPF(morningClean);
  if (missingSpf && !beginnerSimple) {
    const msg = labels.amSpfWarning;
    warnings.push(msg);
    issues.push({
      code: "missing_spf",
      message: msg,
      severity: "warning",
      section: "morning",
    });
  } else if (missingSpf && beginnerSimple) {
    warnings.push(labels.amSpfWarningBeginner);
  }

  return {
    issues,
    blockers,
    warnings,
    canSave: blockers.length === 0,
    hasEmptyTitles,
    missingSpf,
  };
}

/**
 * Heuristic SPF detection: matches the explicit `spf` category OR a permissive
 * keyword check (vi/en) so a step labelled "Kem chống nắng" still satisfies
 * the warning even if the user picked "Other" as the category.
 */
function hasSPF(steps: RoutineStepDTO[]): boolean {
  for (const s of steps) {
    if ((s.category ?? "").toLowerCase() === "spf") return true;
    const t = (s.title ?? "").toLowerCase();
    if (
      t.includes("spf") ||
      t.includes("sunscreen") ||
      t.includes("kem chống nắng") ||
      t.includes("chống nắng")
    ) {
      return true;
    }
  }
  return false;
}

/** Counts of completed/total across both AM + PM (used by the StatusBanner). */
export function countCompletion(routine: LocalRoutine): {
  total: number;
  completed: number;
  pct: number;
} {
  const total = routine.morning.length + routine.evening.length;
  const completed =
    routine.morning.filter((s) => s.completed).length +
    routine.evening.filter((s) => s.completed).length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, pct };
}

/** True only on the very first visit / after a reset that wiped both sides. */
export function isFreshlyEmpty(routine: LocalRoutine): boolean {
  return (
    !routine.saved &&
    routine.morning.length === 0 &&
    routine.evening.length === 0
  );
}

export type RoutineSourceKind = "saved_today" | "carried" | "onboarding_seed" | "ai_suggested";

export type RoutineSourceInfo = {
  kind: RoutineSourceKind;
  /** ISO date for carry-over (when kind === "carried"). */
  fromDate?: string;
};

/**
 * Derives a user-facing source label from the routine payload.
 * Falls back to history when the API omits carried_from_date (older backend).
 */
export function resolveRoutineSource(
  routine: LocalRoutine,
  history: RoutineHistoryDTO | null,
): RoutineSourceInfo {
  if (routine.saved) {
    return { kind: "saved_today" };
  }
  if (routine.source === "ai_suggested") {
    return { kind: "ai_suggested" };
  }
  if (routine.source === "onboarding_starter") {
    return { kind: "onboarding_seed" };
  }

  let fromDate = routine.carriedFromDate.trim();
  if (!fromDate && history?.entries?.length) {
    const today = routine.routineDate;
    const prior =
      history.entries.find((e) => e.routine_date && e.routine_date !== today) ??
      history.entries[0];
    fromDate = prior?.routine_date ?? "";
  }

  if (!fromDate && (history?.entries?.length ?? 0) === 0) {
    return { kind: "onboarding_seed" };
  }

  return { kind: "carried", fromDate: fromDate || undefined };
}
