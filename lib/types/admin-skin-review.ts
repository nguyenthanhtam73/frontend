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
  /** 1–2 soft non-certain causes for public share. */
  possible_causes?: string[];
  /** 2–3 gentle avoid/do tips for public share (no brands/meds). */
  soothing_tips?: string[];
  non_diagnostic: string;
};

export type AdminSkinReviewResponse = {
  id: string;
  title: string;
  notes: string;
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
};

/** Unauthenticated share payload — no admin notes, blurred images only. */
export type PublicSkinReviewResponse = {
  slug: string;
  title: string;
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
  status?: AdminSkinReviewStatus;
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
