/** Matches backend `StarterRoutineResponse` / persisted `starter_routine` in onboarding snapshot. */
export type StarterRoutineDTO = {
  morning: string[];
  evening: string[];
  week_notes: string;
  safety_notes: string;
  encouragement: string;
  skin_readback: string;
  rationale: string;
  closing_reminder: string;
};

export const COACH_WELCOME_STORAGE_KEY = "dadiary_coach_welcome_v1";

export type CoachWelcomePayload = {
  profileId: string;
  starterRoutine: StarterRoutineDTO;
  /** From onboarding vision step (optional). */
  coachingNotes?: string;
};
