import { ApiError, apiGet } from "@/lib/api-client";
import { parseMascot, type MascotSnapshot } from "@/lib/mascot/model";

export { mascotQueryKey } from "@/lib/mascot/query-key";

/**
 * GET /api/v1/me/mascot. A 404 means there is no mascot to show —
 * callers hide Bé Da. Other errors throw.
 */
export async function fetchMascot(): Promise<MascotSnapshot | null> {
  try {
    const data = await apiGet<unknown>("/api/v1/me/mascot", { toastOnError: false });
    return parseMascot(data);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}
