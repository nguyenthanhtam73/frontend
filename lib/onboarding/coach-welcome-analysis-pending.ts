import { apiGet } from "@/lib/api-client";
import {
  fetchSkinCheckResult,
  type FetchSkinCheckResult,
} from "@/lib/api/skin-check";
import { readPersistedCheckInPending } from "@/lib/check-in/pending-feedback-session";

/** True only when the skin-check response sets `analysis_pending`. Omitted means false. */
export function analysisPendingFromSkinCheck(
  data: { analysis_pending?: boolean } | null | undefined,
): boolean {
  return data?.analysis_pending === true;
}

type LatestCheckId = () => Promise<string | null>;

async function latestCheckIdFromProgress(): Promise<string | null> {
  try {
    const data = await apiGet<{ entries?: { id?: string }[] }>(
      "/api/v1/progress?range=30&limit=1",
      { toastOnError: false },
    );
    const id = data?.entries?.[0]?.id?.trim();
    return id || null;
  } catch {
    return null;
  }
}

/** Newest saved check, then an in-flight check-in that progress has not listed yet. */
export async function resolveCoachWelcomeCheckId(
  latestCheckId: LatestCheckId = latestCheckIdFromProgress,
): Promise<string | null> {
  const fromProgress = await latestCheckId();
  if (fromProgress) return fromProgress;
  return readPersistedCheckInPending()?.checkId ?? null;
}

/**
 * Read `analysis_pending` for coach-welcome from GET /api/v1/skin-checks/:id.
 * A missing check or a response that omits the field stays false.
 */
export async function fetchCoachWelcomeAnalysisPending(opts?: {
  latestCheckId?: LatestCheckId;
  fetchCheck?: (id: string) => Promise<FetchSkinCheckResult>;
}): Promise<boolean> {
  const id = await resolveCoachWelcomeCheckId(opts?.latestCheckId);
  if (!id) return false;
  const fetchCheck = opts?.fetchCheck ?? fetchSkinCheckResult;
  const result = await fetchCheck(id);
  if (!result.ok) return false;
  return analysisPendingFromSkinCheck(result.data);
}
