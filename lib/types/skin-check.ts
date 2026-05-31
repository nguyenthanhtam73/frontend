/** POST /api/v1/skin-checks → data envelope (typed subset for UI). */

import type { ProductSuggestionDTO } from "./product-suggestion";

export type CoachImprovementDTO = { tip: string; why: string };

export type SkinCoachScoreGaugesDTO = {
  overall?: number;
  hydration?: number;
  clarity?: number;
  barrier?: number;
};

export type SkinCoachDetailDTO = {
  summary_notes?: string;
  strengths?: string[];
  situation_summary?: string;
  concern_alignment?: string;
  skin_score_gauges?: SkinCoachScoreGaugesDTO;
  improvements?: CoachImprovementDTO[];
  routine_hints?: string[];
  avoid_or_patch?: string[];
  safety_reminders?: string[];
  medical_disclaimer?: string;
  product_suggestions?: ProductSuggestionDTO[];
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
};
