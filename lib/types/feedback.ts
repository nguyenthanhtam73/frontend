export type FeedbackType =
  | "ai_feedback"
  | "bug_report"
  | "feature_request"
  | "general";

export type FeedbackStatus = "new" | "read" | "resolved";

export type CreateFeedbackPayload = {
  type: FeedbackType;
  comment: string;
};

export type FeedbackCreateResponse = {
  id: string;
  message: string;
};

export type AdminFeedbackItem = {
  id: string;
  type: FeedbackType;
  comment: string;
  status: FeedbackStatus;
  user_email: string;
  user_username: string;
  created_at: string;
  updated_at: string;
};

export type AdminFeedbackListResponse = {
  items: AdminFeedbackItem[];
  total: number;
  page: number;
  page_size: number;
};

export const FEEDBACK_TYPES: FeedbackType[] = [
  "ai_feedback",
  "bug_report",
  "feature_request",
  "general",
];

export const FEEDBACK_STATUSES: FeedbackStatus[] = ["new", "read", "resolved"];
