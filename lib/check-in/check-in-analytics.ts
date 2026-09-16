import { ApiError } from "@/lib/api-client";

/** Where the user switched into skip-photo (tag + notes) mode. */
export type CheckInSkipSource = "toggle" | "sticky" | "panel";

const SKIP_SOURCES = new Set<CheckInSkipSource>(["toggle", "sticky", "panel"]);

export function isCheckInSkipSource(value: string): value is CheckInSkipSource {
  return SKIP_SOURCES.has(value as CheckInSkipSource);
}

/**
 * Stable `checkin_submit_fail.reason` from a signed-in skin-check POST error.
 * Matches the form's existing error branches so analytics and UI stay aligned.
 */
export function checkInSubmitFailReason(err: unknown): string {
  if (!(err instanceof ApiError)) return "network";

  const errCode = err.code ?? "";
  const status = err.status ?? 0;

  if (err.kind === "unauthorized") return "unauthorized";
  if (status === 413 || errCode === "file_too_large") return "file_too_large";
  if (errCode === "invalid_image") return "invalid_image";
  if (errCode === "moderation_failed") return "moderation_failed";
  if (errCode === "missing_images") return "missing_images";
  if (err.kind === "rate_limited" || errCode === "rate_limited") return "rate_limited";
  if (
    err.kind === "forbidden" &&
    (errCode === "feature_denied" || errCode === "premium_required")
  ) {
    return errCode;
  }
  if (
    err.kind === "server" ||
    err.kind === "network" ||
    err.kind === "timeout" ||
    err.kind === "offline"
  ) {
    return err.kind;
  }
  if (err.kind === "parse") return "parse";
  if (errCode) return errCode;
  return err.kind || "unknown";
}
