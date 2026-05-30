import { apiBaseUrl } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-token";
import type { CreateSkinCheckResponseDTO } from "@/lib/types/skin-check";

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
};

/** GET /api/v1/skin-checks/:id — same shape as POST create response. */
export async function fetchSkinCheck(
  id: string,
): Promise<CreateSkinCheckResponseDTO | null> {
  const headers: Record<string, string> = {};
  const auth = getAccessToken();
  if (auth) headers.Authorization = `Bearer ${auth}`;

  const res = await fetch(`${apiBaseUrl}/api/v1/skin-checks/${encodeURIComponent(id)}`, {
    headers,
  });
  const raw = (await res.json().catch(() => ({}))) as ApiEnvelope<CreateSkinCheckResponseDTO>;
  if (res.ok && raw?.success && raw.data) {
    return raw.data;
  }
  return null;
}

export function isAnalysisSettled(status: string | undefined): boolean {
  return status === "completed" || status === "failed";
}
