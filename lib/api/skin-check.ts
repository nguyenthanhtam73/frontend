import { apiBaseUrl } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-token";
import type { CreateSkinCheckResponseDTO } from "@/lib/types/skin-check";

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
};

export type FetchSkinCheckResult =
  | { ok: true; data: CreateSkinCheckResponseDTO }
  | { ok: false; kind: "network" }
  | { ok: false; kind: "not_found" }
  | { ok: false; kind: "unauthorized" }
  | { ok: false; kind: "api"; message?: string };

/** GET /api/v1/skin-checks/:id — same shape as POST create response. */
export async function fetchSkinCheckResult(
  id: string,
): Promise<FetchSkinCheckResult> {
  const headers: Record<string, string> = {};
  const auth = getAccessToken();
  if (auth) headers.Authorization = `Bearer ${auth}`;

  try {
    const res = await fetch(
      `${apiBaseUrl}/api/v1/skin-checks/${encodeURIComponent(id)}`,
      { headers },
    );
    const raw = (await res.json().catch(() => ({}))) as ApiEnvelope<CreateSkinCheckResponseDTO>;

    if (res.status === 404) {
      return { ok: false, kind: "not_found" };
    }
    if (res.status === 401) {
      return { ok: false, kind: "unauthorized" };
    }
    if (res.ok && raw?.success && raw.data) {
      return { ok: true, data: raw.data };
    }
    return {
      ok: false,
      kind: "api",
      message:
        typeof raw === "object" && raw !== null && "error" in raw
          ? (raw as { error?: { message?: string } }).error?.message
          : undefined,
    };
  } catch {
    return { ok: false, kind: "network" };
  }
}

/** Convenience wrapper — returns null on any non-success response. */
export async function fetchSkinCheck(
  id: string,
): Promise<CreateSkinCheckResponseDTO | null> {
  const result = await fetchSkinCheckResult(id);
  return result.ok ? result.data : null;
}

export function isAnalysisSettled(status: string | undefined): boolean {
  return status === "completed" || status === "failed";
}
