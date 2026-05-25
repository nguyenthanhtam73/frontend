/** Mirrors backend dto.OnboardingSkinAnalyzeResponse */
export type OnboardingSkinAnalyzeDTO = {
  skin_type_guess: string;
  undertone_guess: string;
  concerns: string[];
  suggested_goal: string;
  barrier_signal: string;
  confidence: number;
  coaching_notes: string;
  non_diagnostic: string;
  photo_quality: {
    sufficient: boolean;
    tips: string[];
  };
  model_used: string;
};
