import type { ProductGuidanceItemDTO } from "@/lib/types/product-guidance";
import type { ProductSuggestionDTO } from "@/lib/types/product-suggestion";

/** Structured vision cues from onboarding photo analysis. */
export type OnboardingSkinObservations = {
  overall_skin_type: string;
  t_zone: string;
  cheeks: string;
  pore_size: string;
  texture: string;
  redness: string;
  pigmentation: string;
  acne_status: string;
  oiliness_level: string;
};

export type OnboardingSeverityLevel = "mild" | "moderate" | "dense";
export type OnboardingCarePhase = "calm_first" | "can_add_active";

/** Mirrors backend dto.OnboardingSkinAnalyzeResponse */
export type OnboardingSkinAnalyzeDTO = {
  skin_type_guess: string;
  undertone_guess: string;
  concerns: string[];
  suggested_goal: string;
  barrier_signal: string;
  confidence: number;
  visual_observations?: string[];
  coaching_notes: string;
  non_diagnostic: string;
  photo_quality: {
    sufficient: boolean;
    tips: string[];
  };
  skin_observations?: OnboardingSkinObservations;
  detailed_observations?: string;
  /** Morphology group decided by the backend classifier (mụn ẩn / milia / texture / …). */
  morphology_group?: string;
  /** high | medium | low — how readable the photo actually was. */
  group_confidence?: string;
  /** True when the photo alone cannot separate look-alike groups. */
  needs_more_info?: boolean;
  /** Short questions / photo asks that would settle an ambiguous read. */
  clarify_questions?: string[];
  main_concerns?: string[];
  skin_tone?: string;
  model_used: string;
  /** mild | moderate | dense */
  severity_level?: OnboardingSeverityLevel | string;
  /** cheeks | t_zone | forehead | … */
  primary_regions?: string[];
  /** inflammatory_acne | comedones | pih | … */
  concern_types?: string[];
  /** calm_first | can_add_active */
  phase?: OnboardingCarePhase | string;
  /** Photo-specific summary (not timeline promises). */
  summary?: string;
  product_guidance?: ProductGuidanceItemDTO[];
  product_suggestions?: ProductSuggestionDTO[];
};
