import type { RoutineDTO, RoutineStepDTO } from "@/lib/types/routine";

/** Shared with /routine and the in-game care list. */
export const routineTodayQueryKey = ["routines", "today"] as const;

function strip(step: RoutineStepDTO) {
  const howTo = (step.how_to ?? "").trim();
  const dose = (step.dose ?? "").trim();
  const why = (step.why ?? "").trim();
  return {
    id: step.id,
    title: step.title.trim(),
    category: (step.category ?? "other").trim(),
    notes: (step.notes ?? "").trim(),
    completed: !!step.completed,
    ...(howTo ? { how_to: howTo } : {}),
    ...(dose ? { dose } : {}),
    ...(why ? { why } : {}),
  };
}

/** Same POST body the routine page sends for a completion tick. */
export function routineTickBody(routine: RoutineDTO) {
  return {
    morning: routine.morning.map(strip),
    evening: routine.evening.map(strip),
    notes: routine.notes ?? "",
    source: routine.source === "ai_suggested" ? "ai_suggested" : "manual",
    skill_mode: routine.skill_mode ?? "",
    save_kind: "tick_only" as const,
    ...(routine.routine_date ? { routine_date: routine.routine_date } : {}),
  };
}
