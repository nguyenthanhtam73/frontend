/**
 * Pure utilities for the Routine Management feature. Anything that does not
 * touch React, the network, or `next-intl` lives here so the parts/ files stay
 * lean and the unit-testable surface is obvious.
 */
import type { RoutineDTO, RoutineStepDTO } from "@/lib/types/routine";

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
};

export const emptyRoutine: LocalRoutine = {
  morning: [],
  evening: [],
  notes: "",
  source: "manual",
  skillMode: "",
  saved: false,
  routineDate: "",
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
  };
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
export type RoutineValidation = {
  blockers: string[];
  warnings: string[];
  canSave: boolean;
};

export type ValidationLabels = {
  noStepsBlocker: string;
  noTitleBlocker: string;
  amSpfWarning: string;
};

export function validateRoutine(
  routine: LocalRoutine,
  labels: ValidationLabels,
): RoutineValidation {
  const morningClean = routine.morning.filter((s) => s.title.trim().length > 0);
  const eveningClean = routine.evening.filter((s) => s.title.trim().length > 0);

  const blockers: string[] = [];
  const warnings: string[] = [];

  if (morningClean.length === 0 && eveningClean.length === 0) {
    blockers.push(labels.noStepsBlocker);
  }

  // If the user added rows but none of them have a title, surface that as a
  // separate explainer (different fix than "no steps at all").
  const totalRows = routine.morning.length + routine.evening.length;
  if (
    totalRows > 0 &&
    morningClean.length === 0 &&
    eveningClean.length === 0
  ) {
    blockers.push(labels.noTitleBlocker);
  }

  if (morningClean.length > 0 && !hasSPF(morningClean)) {
    warnings.push(labels.amSpfWarning);
  }

  return {
    blockers,
    warnings,
    canSave: blockers.length === 0,
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
