/** POST /api/v1/skin-checks → data envelope (typed subset for UI). */

import type { ProductGuidanceItemDTO } from "./product-guidance";
import type { ProductSuggestionDTO } from "./product-suggestion";

export type CoachImprovementDTO = { tip: string; why: string };

/** In-app detailed care step (NOT used on public /share/skin-review). */
export type CoachCareSuggestionDTO = {
  /** morning | evening | today */
  slot: string;
  step: string;
  why?: string;
  safety_note?: string;
};

export type SkinCoachScoreGaugesDTO = {
  overall?: number;
  hydration?: number;
  clarity?: number;
  barrier?: number;
};

/** One short "looks like" line for a zone the photo actually showed. */
export type CoachZoneNoteDTO = {
  zone: string;
  note: string;
  /** mild | moderate | pronounced — how visible the sign is. */
  severity?: string;
};

/** One short reason per soft gauge, including overall. Not a score. */
export type SkinCoachScoreNotesDTO = {
  overall?: string;
  hydration?: string;
  clarity?: string;
  barrier?: string;
};

export type SkinCoachDetailDTO = {
  summary_notes?: string;
  strengths?: string[];
  situation_summary?: string;
  concern_alignment?: string;
  skin_score_gauges?: SkinCoachScoreGaugesDTO;
  /** Per-zone look notes. Omitted on older checks. Max 5 from the API. */
  zone_notes?: CoachZoneNoteDTO[];
  /** Why each gauge sits where it does. Omitted on older checks. */
  skin_score_notes?: SkinCoachScoreNotesDTO;
  /** high | medium | low. Omitted on older checks. */
  confidence?: string;
  /** True when a follow-up would change the read. */
  needs_more_info?: boolean;
  /**
   * Follow-ups still worth asking (max 3). When the photo is limited these
   * are retake tips, not questions.
   */
  clarify_questions?: string[];
  improvements?: CoachImprovementDTO[];
  /** Detailed in-app care checklist (richer than public soothing_tips). */
  care_suggestions?: CoachCareSuggestionDTO[];
  routine_hints?: string[];
  avoid_or_patch?: string[];
  safety_reminders?: string[];
  medical_disclaimer?: string;
  product_suggestions?: ProductSuggestionDTO[];
  product_guidance?: ProductGuidanceItemDTO[];
  care_phase?: string;
  /** skip | limited | ok — from backend photo evidence; FE also infers skip from empty image_urls. */
  photo_evidence?: string;
  /** True when vision flagged blur / dark / crop. */
  photo_limited?: boolean;
  photo_limited_note?: string;
  error_message?: string;
};

export type SkinAnalysisDTO = {
  id: string;
  skin_check_id: string;
  status: string;
  model_version?: string;
  prompt_version?: number;
  coach?: SkinCoachDetailDTO;
};

export type CreateSkinCheckResponseDTO = {
  check: {
    id: string;
    user_id: string;
    title?: string;
    user_note?: string;
    environment_note?: string;
    conditions?: string[];
    symptoms?: string[];
    visibility: string;
    check_date: string;
    created_at: string;
  };
  analysis: SkinAnalysisDTO;
  image_urls: string[];
  /** Present on POST create when streak was updated (not on GET poll). */
  streak?: {
    /** True when the system spent one freeze for a single missed day. */
    auto_freeze_applied: boolean;
    /** True when a prior manual freeze bridge was honored (no extra spend). */
    catch_up_continued?: boolean;
    /** True when user checked in on a reserved freeze day (inventory kept spent). */
    unused_freeze_cleared?: boolean;
    current_streak: number;
    freezes_available: number;
    protected_until?: string | null;
  };
};
