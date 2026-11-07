import type { CreateSkinCheckResponseDTO } from "@/lib/types/skin-check";

export type AnalysisMaintenanceInput = {
  /**
   * `analysis_pending` from a skin-check response. Omitted (or false) on
   * servers that have not shipped the field yet — treat that as not pending.
   */
  analysisPending?: boolean | null;
  /** `analysis.status`. A healthy in-flight job stays `pending` / `processing`. */
  status?: string | null;
};

/**
 * Show the calm maintenance note only when the server set `analysis_pending`.
 * A failed analysis without that flag keeps the existing error card and retry.
 * A completed coach always wins, even if an older payload still carries the flag.
 * `pending` / `processing` without the flag is a normal wait, not this note.
 */
export function showsAnalysisMaintenance(input: AnalysisMaintenanceInput): boolean {
  if (input.status === "completed") return false;
  return input.analysisPending === true;
}

export type AnalysisPollOutcome = "completed" | "failed" | "continue";

/**
 * Whether check-in polling should stop.
 * `analysis_pending` does not stop the loop: a still-pending job keeps polling.
 * A coach error or a completed row with no coach is the existing terminal
 * failure (error card + retry). It is not the maintenance note — that UI
 * checks `analysis_pending` on its own.
 */
export function analysisPollOutcome(
  payload: Pick<CreateSkinCheckResponseDTO, "analysis">,
): AnalysisPollOutcome {
  const status = payload.analysis?.status;
  const coachErr = payload.analysis?.coach?.error_message;
  if (status === "completed" && payload.analysis?.coach) return "completed";
  if (status === "failed" || (!!coachErr && status !== "completed")) return "failed";
  if (status === "completed" || status === "failed") return "failed";
  return "continue";
}
