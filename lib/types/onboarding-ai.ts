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
  main_concerns?: string[];
  skin_tone?: string;
  model_used: string;
};
