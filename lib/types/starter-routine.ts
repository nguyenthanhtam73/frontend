/** Matches backend `StarterRoutineResponse` / persisted `starter_routine` in onboarding snapshot. */

import type { ProductSuggestionDTO } from "./product-suggestion";
import type { OnboardingSkinAnalyzeDTO } from "./onboarding-ai";
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

/** Dispatched when onboarding-flow patches coach-welcome session after a late API response. */
export const COACH_WELCOME_SESSION_EVENT = "dadiary:coach-welcome-session";

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
  /** Vision + coach output — used when guest preview job retries in background. */
  skin_analysis?: OnboardingSkinAnalyzeDTO;
};

export type CoachWelcomePayload = {
  /** Real profile id when saved; `guest-preview` for local guest trial. */
  profileId?: string;
  starterRoutine: StarterRoutineDTO;
  /** True when API returned a quick scaffold and AI is still generating. */
  starterRoutinePending?: boolean;
  /** From onboarding vision step (optional). */
  coachingNotes?: string;
  /** Cached answers for review mode (guest / session reload). */
  reviewSummary?: OnboardingReviewSummary;
  /** UI locale when onboarding finished (guest preview API). */
  locale?: string;
  /** True when user explicitly chose the offline default on summary step. */
  usedDefaultRoutine?: boolean;
  /** Guest background AI job id for polling preview-routine. */
  previewJobId?: string;
  /** True for local guest trial (never call /profile/skin). */
  guestPreview?: boolean;
};
