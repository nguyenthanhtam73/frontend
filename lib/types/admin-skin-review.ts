/** Admin Skin Review API response shapes (observations only — no routine). */

export type AdminSkinReviewStatus = "draft" | "published";

export type AdminSkinAttentionArea = {
  region: string;
  concern: string;
  severity: string;
  note: string;
};

export type AdminSkinReviewAnalysis = {
  overview: string;
  skin_type: string;
  attention_areas: AdminSkinAttentionArea[];
  overall_severity: string;
  extra_notes: string;
  non_diagnostic: string;
  photo_quality: string;
  detailed_findings: string;
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
  created_at: string;
  updated_at: string;
};

export type PatchAdminSkinReviewBody = {
  title?: string;
  notes?: string;
  status?: AdminSkinReviewStatus;
};
