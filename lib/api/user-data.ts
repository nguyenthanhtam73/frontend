import { apiBaseUrl } from "@/lib/api";
import { apiGet, ApiError } from "@/lib/api-client";
import { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-envelope";
import { authHeaders } from "@/lib/auth-token";

export type DeleteUserDataDTO = {
  deleted_at: string;
};

/** Portable diary dump from GET /api/v1/me/export (Premium: export_data). */
export type ExportUserDataDTO = {
  exported_at: string;
  plan_tier: string;
  user_id: string;
  profile?: unknown;
  streak?: unknown;
  skin_checks: unknown[];
  routines: unknown[];
  wardrobe: unknown[];
};

export async function deleteAllUserData(): Promise<DeleteUserDataDTO> {
  const res = await fetch(`${apiBaseUrl}/api/v1/me/data`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  const json = (await res.json().catch(() => ({}))) as ApiEnvelope<DeleteUserDataDTO>;
  if (res.status === 401 || res.status === 403) {
    throw new Error("auth");
  }
  if (!res.ok || !json.data) {
    throw new Error(getApiErrorMessage(json, "delete_failed"));
  }
  return json.data;
}

/** Fetch Premium data export. Throws {@link ApiError} on failure (incl. feature gate). */
export async function fetchUserDataExport(): Promise<ExportUserDataDTO> {
  return apiGet<ExportUserDataDTO>("/api/v1/me/export", {
    toastOnError: false,
    fallbackMessage: "export_failed",
  });
}

/** Download export JSON to the device. Returns filename used. */
export async function downloadUserDataExport(): Promise<string> {
  const data = await fetchUserDataExport();
  const stamp = (data.exported_at || new Date().toISOString()).slice(0, 10);
  const filename = `dadiary-export-${stamp}.json`;
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
  return filename;
}

export function isExportFeatureDenied(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  if (err.status === 403) return true;
  const code = (err.code || "").toLowerCase();
  return (
    code === "feature_denied" ||
    code === "premium_required" ||
    code === "quota_exceeded" ||
    code.includes("export")
  );
}
