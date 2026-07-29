import { ApiError, apiGet, apiPatch, apiPost } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth-token";
import type {
  AdminSkinReviewResponse,
  PatchAdminSkinReviewBody,
} from "@/lib/types/admin-skin-review";

/** AI vision can take a while — match onboarding analyze budget. */
const ANALYZE_TIMEOUT_MS = 120_000;

function mapAdminError(err: unknown): never {
  if (err instanceof ApiError) {
    if (err.kind === "unauthorized") throw new Error("auth");
    if (err.kind === "forbidden" || err.status === 403) throw new Error("forbidden");
    if (err.status === 404) throw new Error("not_found");
  }
  throw err;
}

/**
 * POST /api/v1/admin/skin-review — multipart images (1–3) + optional metadata.
 * Bypasses Free quota on the backend; requires is_admin.
 */
export async function createAdminSkinReview(input: {
  files: File[];
  locale: string;
  title?: string;
  notes?: string;
  status?: "draft" | "published";
}): Promise<AdminSkinReviewResponse> {
  if (!getAccessToken()) {
    throw new Error("auth");
  }
  const fd = new FormData();
  for (const f of input.files) {
    fd.append("images", f);
  }
  fd.append("locale", input.locale);
  if (input.title?.trim()) fd.append("title", input.title.trim());
  if (input.notes?.trim()) fd.append("notes", input.notes.trim());
  if (input.status) fd.append("status", input.status);

  try {
    return await apiPost<AdminSkinReviewResponse>("/api/v1/admin/skin-review", fd, {
      toastOnError: false,
      timeoutMs: ANALYZE_TIMEOUT_MS,
    });
  } catch (err) {
    mapAdminError(err);
  }
}

/** GET /api/v1/admin/skin-review/:id */
export async function fetchAdminSkinReview(
  id: string,
): Promise<AdminSkinReviewResponse> {
  if (!getAccessToken()) {
    throw new Error("auth");
  }
  try {
    return await apiGet<AdminSkinReviewResponse>(`/api/v1/admin/skin-review/${id}`, {
      toastOnError: false,
    });
  } catch (err) {
    mapAdminError(err);
  }
}

/** PATCH /api/v1/admin/skin-review/:id — title / notes / status */
export async function patchAdminSkinReview(
  id: string,
  body: PatchAdminSkinReviewBody,
): Promise<AdminSkinReviewResponse> {
  if (!getAccessToken()) {
    throw new Error("auth");
  }
  try {
    return await apiPatch<AdminSkinReviewResponse>(
      `/api/v1/admin/skin-review/${id}`,
      body,
      { toastOnError: false },
    );
  } catch (err) {
    mapAdminError(err);
  }
}
