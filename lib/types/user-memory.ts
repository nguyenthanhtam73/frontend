/** GET /api/v1/me/memory — `data` envelope. */
export type UserMemoryStatsDTO = {
  char_count: number;
  total_checks: number;
  total_feedback: number;
  cache_entries: number;
  cache_ttl_seconds: number;
  sections_present: string[];
  helpful_votes: number;
  not_helpful_votes: number;
  adherence_tier: string;
  has_monthly_digest: boolean;
  prompt_version: number;
};

export type UserMemoryDTO = {
  user_id: string;
  generated_at: string;
  cached: boolean;
  memory_text: string;
  stats: UserMemoryStatsDTO;
};
