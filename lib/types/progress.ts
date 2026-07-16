/** Progress Timeline DTOs — mirror backend `dto.ProgressTimelineResponse` shape.
 *  Keep this hand-typed (not auto-generated) so the UI can iterate independently
 *  while we lock in the contract during dev. */

import type { SkinCoachScoreGaugesDTO } from "./skin-check";

export type ProgressEntryDTO = {
  id: string;
  check_date: string; // YYYY-MM-DD (Vietnam calendar)
  created_at: string; // RFC3339
  title?: string;
  user_note?: string;
  tags?: string[];
  symptoms?: string[];
  image_urls: string[]; // public "/uploads/..." paths
  status: "pending" | "processing" | "completed" | "failed";
  gauges?: SkinCoachScoreGaugesDTO;
  /** One-line coach summary for compact timeline cards (already truncated server-side). */
  snippet?: string;
};

export type MonthlyBucketDTO = {
  month: string; // "2026-05"
  checks_count: number;
  overall_avg?: number;
  hydration_avg?: number;
  clarity_avg?: number;
  barrier_avg?: number;
};

export type MonthlyComparisonDTO = {
  overall_delta?: number;
  hydration_delta?: number;
  clarity_delta?: number;
  barrier_delta?: number;
  trend: "up" | "flat" | "down";
  headline_pct?: number;
};

export type TagCountDTO = { tag: string; count: number };

export type ProgressSummaryDataDTO = {
  buckets?: MonthlyBucketDTO[];
  current_month?: MonthlyBucketDTO;
  previous_month?: MonthlyBucketDTO;
  comparison?: MonthlyComparisonDTO;
  total_checks: number;
  streak_days: number;
  top_tags?: TagCountDTO[];
  /** Server-issued UUID for this rendered summary card. Used as
   *  `target_id` when posting thumbs-up/down feedback (target_type =
   *  "progress_summary"). */
  feedback_target_id?: string;
};

export type ProgressTimelineDTO = {
  range_days: number; // 0 = "all"
  from?: string;
  to: string;
  total: number;
  entries: ProgressEntryDTO[];
  summary: ProgressSummaryDataDTO;
};

/** UI-facing time-range option type. Keep in sync with `parseProgressRange` on the backend. */
export type ProgressRangeKey = "30" | "90" | "180" | "all";
