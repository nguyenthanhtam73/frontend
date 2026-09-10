import { ApiError, apiGet, apiPost } from "@/lib/api-client";
import type { CreateSkinCheckResponseDTO } from "@/lib/types/skin-check";

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
  try {
    const data = await apiGet<CreateSkinCheckResponseDTO>(
      `/api/v1/skin-checks/${encodeURIComponent(id)}`,
      { toastOnError: false },
    );
    if (!data) {
      return { ok: false, kind: "api" };
    }
    return { ok: true, data };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 404) return { ok: false, kind: "not_found" };
      if (err.kind === "unauthorized") return { ok: false, kind: "unauthorized" };
      if (
        err.kind === "network" ||
        err.kind === "timeout" ||
        err.kind === "offline"
      ) {
        return { ok: false, kind: "network" };
      }
      return { ok: false, kind: "api", message: err.serverMessage };
    }
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

/** POST /api/v1/skin-checks/:id/reanalyze — owner-only; poll GET until settled. */
export async function reanalyzeSkinCheck(
  id: string,
): Promise<CreateSkinCheckResponseDTO> {
  return apiPost<CreateSkinCheckResponseDTO>(
    `/api/v1/skin-checks/${encodeURIComponent(id)}/reanalyze`,
    undefined,
    { toastOnError: false },
  );
}
