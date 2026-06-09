import type { StarterRoutineDTO } from "@/lib/types/starter-routine";

export function routineFingerprint(r: StarterRoutineDTO): string {
  return JSON.stringify({
    morning: r.morning,
    evening: r.evening,
    week_notes: r.week_notes,
    encouragement: r.encouragement,
    rationale: r.rationale,
    skin_readback: r.skin_readback,
  });
}
