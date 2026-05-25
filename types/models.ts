/**
 * Shared TypeScript types mirroring backend domain concepts (keep in sync over time).
 */

export type CheckVisibility = "private" | "public";

export type ReactionType = "like" | "dislike";

export type AnalysisStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  created_at: string;
}

/** Daily skin check-in (photo + self-reported conditions). */
export interface SkinCheck {
  id: string;
  user_id: string;
  title?: string;
  user_note?: string;
  environment_note?: string;
  /** Backend stores JSON array of condition strings, e.g. breakout, dry. */
  conditions?: string[];
  image_urls: string[];
  visibility: CheckVisibility;
  check_date: string;
  created_at: string;
}

/** Saved skin preferences from onboarding / profile. */
export interface SkinProfile {
  id: string;
  user_id: string;
  skin_type?: string;
  goal?: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface SkinAnalysis {
  id: string;
  skin_check_id: string;
  status: AnalysisStatus;
  model_version?: string;
  coach_notes?: string;
  created_at: string;
}
