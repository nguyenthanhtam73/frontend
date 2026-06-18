/** Matches backend `dto.RoutineStep`. */

import type { ProductSuggestionDTO } from "./product-suggestion";
export type RoutineStepDTO = {
  /** Stable id — frontend generates one for new steps (uuid v4) so React keys
   *  don't churn while editing. */
  id: string;
  title: string;
  /** Open string — frontend treats unknown values as "other". */
  category?: string;
  notes?: string;
  completed?: boolean;
};

/** Matches backend `dto.RoutineResponse`. */
export type RoutineDTO = {
  id?: string;
  user_id: string;
  routine_date: string;
  morning: RoutineStepDTO[];
  evening: RoutineStepDTO[];
  notes?: string;
  /** "manual" | "ai_suggested" | "carried_over" | "onboarding_starter" */
  source?: string;
  skill_mode?: string;
  /** Original date when today's routine is carried forward from a prior save. */
  carried_from_date?: string;
  /** True once today's row exists in the DB (vs carried-over preview). */
  saved: boolean;
  updated_at?: string;
};

/** Matches backend `dto.SuggestRoutineResponse`. */
export type SuggestRoutineDTO = {
  morning: RoutineStepDTO[];
  evening: RoutineStepDTO[];
  encouragement?: string;
  rationale?: string;
  week_notes?: string;
  safety_notes?: string;
  closing_reminder?: string;
  skill_mode?: string;
  locale?: string;
  source: string;
  /** Server-issued UUID for this transient suggestion. The frontend uses it
   *  as `target_id` when posting thumbs-up/down feedback. */
  feedback_target_id?: string;
  product_suggestions?: ProductSuggestionDTO[];
};

/** POST /routines/suggest — async job created. */
export type SuggestJobCreatedDTO = {
  job_id: string;
  status: "processing";
};

/** GET /routines/suggest/status — poll result. */
export type SuggestJobStatusDTO = {
  job_id: string;
  status: "processing" | "completed" | "failed" | "cancelled";
  error?: string;
  suggestion?: SuggestRoutineDTO;
};

/** Matches backend `dto.RoutineHistoryResponse`. */
export type RoutineHistoryDTO = {
  range_days: number;
  from?: string;
  to?: string;
  entries: RoutineDTO[];
  streak_days: number;
  completion_avg: number;
};

/** Stable category list used for the inline picker. The backend accepts any
 *  string — this is just the curated set the UI offers. */
export const ROUTINE_CATEGORIES = [
  "cleanser",
  "toner",
  "serum",
  "treatment",
  "moisturizer",
  "spf",
  "eye",
  "mask",
  "other",
] as const;

export type RoutineCategory = (typeof ROUTINE_CATEGORIES)[number];

export function normalizeCategory(raw: string | undefined): RoutineCategory {
  const v = (raw ?? "").toLowerCase().trim();
  return (ROUTINE_CATEGORIES as readonly string[]).includes(v)
    ? (v as RoutineCategory)
    : "other";
}
