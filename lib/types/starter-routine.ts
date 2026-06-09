/** Matches backend `StarterRoutineResponse` / persisted `starter_routine` in onboarding snapshot. */

import type { ProductSuggestionDTO } from "./product-suggestion";
export type StarterRoutineDTO = {
  morning: string[];
  evening: string[];
  week_notes: string;
  safety_notes: string;
  encouragement: string;
  skin_readback: string;
  rationale: string;
  closing_reminder: string;
  product_suggestions?: ProductSuggestionDTO[];
};

export const COACH_WELCOME_STORAGE_KEY = "dadiary_coach_welcome_v1";

/** Session-only id when guest finishes onboarding without saving a profile. */
export const GUEST_COACH_PROFILE_ID = "guest-preview";

export type OnboardingReviewSummary = {
  skin_type?: string;
  undertone?: string;
  goal?: string;
  skill_level?: string;
  body_concerns?: string[];
  completed_at?: string;
  photo_urls?: string[];
  photos_skipped?: boolean;
};

export type CoachWelcomePayload = {
  /** Real profile id when saved; `guest-preview` for local guest trial. */
  profileId?: string;
  starterRoutine: StarterRoutineDTO;
  /** From onboarding vision step (optional). */
  coachingNotes?: string;
  /** Cached answers for review mode (guest / session reload). */
  reviewSummary?: OnboardingReviewSummary;
};
