import { apiGet } from "@/lib/api-client";
import { fetchSkinCheckResult } from "@/lib/api/skin-check";
import type { CreateSkinCheckResponseDTO } from "@/lib/types/skin-check";

export const latestSkinCheckQueryKey = ["skin-check", "latest"] as const;

/**
 * Newest saved check: the same progress list coach-welcome already uses,
 * then GET /api/v1/skin-checks/:id for the coach text.
 * Returns null when the person has no check yet.
 */
export async function fetchLatestSkinCheck(): Promise<CreateSkinCheckResponseDTO | null> {
  const timeline = await apiGet<{ entries?: { id?: string }[] }>(
    "/api/v1/progress?range=30&limit=1",
    { toastOnError: false },
  );
  const id = timeline?.entries?.[0]?.id?.trim();
  if (!id) return null;
  const result = await fetchSkinCheckResult(id);
  if (!result.ok) return null;
  return result.data;
}
