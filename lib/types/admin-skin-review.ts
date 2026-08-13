/** Admin Skin Review API response shapes (observations only — no routine). */

export type AdminSkinReviewStatus = "draft" | "published";

export type AdminSkinAttentionArea = {
  region: string;
  concern: string;
  severity: string;
  note: string;
};

/** Canonical analysis from Premium vision (+ public causes/tips). */
export type AdminSkinReviewAnalysis = {
  overview: string;
  skin_type: string;
  skin_type_severity: string;
  /** One short sentence explaining why the skin_type was chosen (visual cues). */
  skin_type_note?: string;
  attention_areas: AdminSkinAttentionArea[];
  additional_observations: string;
  photo_notes: string;
  /** 1–2 direct public causes (no hedge closers). */
  possible_causes?: string[];
  /** 2–3 gentle avoid/do tips for public share (no brands/meds). */
  soothing_tips?: string[];
  non_diagnostic: string;
  /** Morphology group from the backend Go classifier (mụn ẩn / milia / texture / …). */
  morphology_group?: string;
  /** high | medium | low — how readable the photo actually was. */
  confidence?: string;
  /** True when the photo alone cannot separate look-alike groups. */
  needs_more_info?: boolean;
  /** Short questions/photo asks that would settle an ambiguous read. */
  clarify_questions?: string[];
  /** Touch / pain / duration answers this analysis was produced with. */
  skin_context?: string;
};

export type AdminSkinReviewResponse = {
  id: string;
  title: string;
  notes: string;
  /** FB/group question the admin is answering (public when set). */
  user_question?: string;
  /** Admin/AI reply shown on share + PNG (public when set). */
  answer?: string;
  status: AdminSkinReviewStatus | string;
  image_urls: string[];
  analysis: AdminSkinReviewAnalysis;
  locale: string;
  model_used: string;
  is_public?: boolean;
  public_slug?: string;
  published_at?: string;
  share_path?: string;
  created_at: string;
  updated_at: string;
  /** Touch / pain / duration answers captured at upload. */
  skin_context?: string;
  /** True once an operator corrected the AI read (labeled data exists). */
  analysis_corrected?: boolean;
  analysis_corrected_at?: string;
  /** The model's first answer, kept for accuracy comparison. */
  analysis_original?: AdminSkinReviewAnalysis;
};

/** Unauthenticated share payload — no admin notes, blurred images only. */
export type PublicSkinReviewResponse = {
  slug: string;
  title: string;
  user_question?: string;
  answer?: string;
  analysis: AdminSkinReviewAnalysis;
  image_urls: string[];
  images_blurred: boolean;
  locale: string;
  published_at?: string;
  share_path: string;
};

export type PatchAdminSkinReviewBody = {
  title?: string;
  notes?: string;
  user_question?: string;
  answer?: string;
  status?: AdminSkinReviewStatus;
  /** Operator-corrected analysis; the AI's original read is preserved server-side. */
  analysis?: AdminSkinReviewAnalysis;
};

export type SuggestAdminSkinReviewAnswerBody = {
  user_question?: string;
  /** Re-run vision with the question before drafting the answer. */
  refresh_analysis?: boolean;
};

export type SuggestAdminSkinReviewAnswerResponse = {
  answer: string;
  /** Present when tips/laterality were aligned or vision was refreshed. */
  analysis?: AdminSkinReviewAnalysis;
};

export type ReanalyzeAdminSkinReviewBody = {
  user_question?: string;
  /** Answers to the clarify questions — re-reads the same photos with that evidence. */
  skin_context?: string;
};

export type AdminSkinReviewListItem = {
  id: string;
  title: string;
  status: string;
  is_public: boolean;
  public_slug?: string;
  share_path?: string;
  published_at?: string;
  locale: string;
  created_at: string;
  updated_at: string;
};

export type AdminSkinReviewListResponse = {
  items: AdminSkinReviewListItem[];
  total: number;
  page: number;
  page_size: number;
};

export type AdminSkinReviewListQuery = {
  status?: "" | "draft" | "published";
  page?: number;
  page_size?: number;
};
