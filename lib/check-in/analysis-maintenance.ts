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
 * Show the calm maintenance note instead of an empty coach or a generic error.
 * A completed analysis always wins, even if an older client still sees the flag.
 * `pending` / `processing` without the flag is a normal wait, not this note.
 */
export function showsAnalysisMaintenance(input: AnalysisMaintenanceInput): boolean {
  if (input.status === "completed") return false;
  if (input.analysisPending === true) return true;
  return input.status === "failed";
}

export type AnalysisPollOutcome = "completed" | "failed" | "continue";

/**
 * Whether check-in polling should stop.
 * `analysis_pending` does not stop the loop: a still-pending job keeps polling
 * exactly as before. Failed and completed are terminal.
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
