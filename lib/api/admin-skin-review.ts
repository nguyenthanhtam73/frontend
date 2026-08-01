import { ApiError, apiGet, apiPatch, apiPost } from "@/lib/api-client";
import { apiBaseUrl } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-token";
import type {
  AdminSkinReviewListQuery,
  AdminSkinReviewListResponse,
  AdminSkinReviewResponse,
  PatchAdminSkinReviewBody,
  PublicSkinReviewResponse,
} from "@/lib/types/admin-skin-review";

/** AI vision can take a while — match onboarding analyze budget. */
const ANALYZE_TIMEOUT_MS = 120_000;
/** Blur generation on publish can take a few seconds. */
const PUBLISH_TIMEOUT_MS = 60_000;

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
 * Bypasses Free quota on the backend; requires can_skin_review (or is_admin).
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

/** PATCH /api/v1/admin/skin-review/:id/publish — slug + blur + is_public */
export async function publishAdminSkinReview(
  id: string,
): Promise<AdminSkinReviewResponse> {
  if (!getAccessToken()) {
    throw new Error("auth");
  }
  try {
    return await apiPatch<AdminSkinReviewResponse>(
      `/api/v1/admin/skin-review/${id}/publish`,
      {},
      { toastOnError: false, timeoutMs: PUBLISH_TIMEOUT_MS },
    );
  } catch (err) {
    mapAdminError(err);
  }
}

/** PATCH /api/v1/admin/skin-review/:id/unpublish */
export async function unpublishAdminSkinReview(
  id: string,
): Promise<AdminSkinReviewResponse> {
  if (!getAccessToken()) {
    throw new Error("auth");
  }
  try {
    return await apiPatch<AdminSkinReviewResponse>(
      `/api/v1/admin/skin-review/${id}/unpublish`,
      {},
      { toastOnError: false },
    );
  } catch (err) {
    mapAdminError(err);
  }
}

export function adminSkinReviewsQueryKey(query: AdminSkinReviewListQuery) {
  return ["admin", "skin-reviews", query] as const;
}

/** GET /api/v1/admin/skin-reviews */
export async function fetchAdminSkinReviews(
  query: AdminSkinReviewListQuery = {},
): Promise<AdminSkinReviewListResponse> {
  if (!getAccessToken()) {
    throw new Error("auth");
  }
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.page) params.set("page", String(query.page));
  if (query.page_size) params.set("page_size", String(query.page_size));
  const qs = params.toString();
  const path = qs
    ? `/api/v1/admin/skin-reviews?${qs}`
    : "/api/v1/admin/skin-reviews";
  try {
    return await apiGet<AdminSkinReviewListResponse>(path, { toastOnError: false });
  } catch (err) {
    mapAdminError(err);
  }
}

/**
 * GET /api/v1/public/skin-review/:slug — no auth.
 * Uses raw fetch so it is safe in RSC / generateMetadata (no localStorage / toasts).
 */
export async function fetchPublicSkinReview(
  slug: string,
): Promise<PublicSkinReviewResponse> {
  const path = `/api/v1/public/skin-review/${encodeURIComponent(slug)}`;
  const res = await fetch(`${apiBaseUrl}${path}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 },
  });
  if (res.status === 404) {
    throw new Error("not_found");
  }
  if (!res.ok) {
    throw new Error(`public_skin_review_${res.status}`);
  }
  const json = (await res.json()) as { data?: PublicSkinReviewResponse };
  if (!json?.data?.slug) {
    throw new Error("not_found");
  }
  return json.data;
}

/** Client-side helper (admin console) — same public endpoint via api client. */
export async function fetchPublicSkinReviewClient(
  slug: string,
): Promise<PublicSkinReviewResponse> {
  try {
    return await apiGet<PublicSkinReviewResponse>(
      `/api/v1/public/skin-review/${encodeURIComponent(slug)}`,
      { auth: false, toastOnError: false },
    );
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      throw new Error("not_found");
    }
    throw err;
  }
}

/** Absolute upload URL for OG / Facebook preview. */
export function absoluteUploadUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/")) return `${apiBaseUrl}${path}`;
  return `${apiBaseUrl}/${path}`;
}

const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://dadiary.vn";

/** Locale-aware share URL for Facebook / clipboard. */
export function skinReviewShareUrl(slug: string, locale = "vi"): string {
  if (locale === "en") {
    return `${SITE_ORIGIN}/en/share/skin-review/${slug}`;
  }
  return `${SITE_ORIGIN}/share/skin-review/${slug}`;
}
