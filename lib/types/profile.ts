/** GET /api/v1/profile/skin — `data` envelope. */
export type SkinProfileResponse = {
  id: string;
  user_id: string;
  skin_type?: string;
  skill_level: string;
  concerns?: string[];
  notes?: string;
  photo_urls?: string[];
  onboarding_snapshot?: Record<string, unknown> | string | null;
  version: number;
  created_at: string;
  updated_at: string;
};
