import { ApiError, apiGet, apiPatch, apiPost } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth-token";
import type {
  AdminFeedbackListResponse,
  AdminFeedbackItem,
  CreateFeedbackPayload,
  FeedbackCreateResponse,
  FeedbackStatus,
  FeedbackType,
} from "@/lib/types/feedback";

export async function submitFeedback(
  payload: CreateFeedbackPayload,
): Promise<FeedbackCreateResponse> {
  if (!getAccessToken()) {
    throw new Error("auth");
  }
  try {
    return await apiPost<FeedbackCreateResponse>("/api/v1/feedbacks", payload, {
      toastOnError: false,
    });
  } catch (err) {
    if (err instanceof ApiError && (err.kind === "unauthorized" || err.kind === "forbidden")) {
      throw new Error("auth");
    }
    throw err;
  }
}

export type AdminFeedbackQuery = {
  type?: FeedbackType | "";
  status?: FeedbackStatus | "";
  page?: number;
  page_size?: number;
};

export async function fetchAdminFeedbacks(
  query: AdminFeedbackQuery = {},
): Promise<AdminFeedbackListResponse> {
  if (!getAccessToken()) {
    throw new Error("auth");
  }
  const params = new URLSearchParams();
  if (query.type) params.set("type", query.type);
  if (query.status) params.set("status", query.status);
  if (query.page) params.set("page", String(query.page));
  if (query.page_size) params.set("page_size", String(query.page_size));
  const qs = params.toString();
  const path = qs ? `/api/v1/admin/feedbacks?${qs}` : "/api/v1/admin/feedbacks";

  try {
    return await apiGet<AdminFeedbackListResponse>(path, { toastOnError: false });
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.kind === "unauthorized") throw new Error("auth");
      if (err.kind === "forbidden" || err.status === 403) throw new Error("forbidden");
    }
    throw err;
  }
}

export async function updateAdminFeedbackStatus(
  id: string,
  status: FeedbackStatus,
): Promise<AdminFeedbackItem> {
  if (!getAccessToken()) {
    throw new Error("auth");
  }
  try {
    return await apiPatch<AdminFeedbackItem>(
      `/api/v1/admin/feedbacks/${id}`,
      { status },
      { toastOnError: false },
    );
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.kind === "unauthorized") throw new Error("auth");
      if (err.kind === "forbidden" || err.status === 403) throw new Error("forbidden");
    }
    throw err;
  }
}

export const adminFeedbacksQueryKey = (query: AdminFeedbackQuery) =>
  ["admin", "feedbacks", query] as const;
