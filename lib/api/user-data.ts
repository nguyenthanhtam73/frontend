import { apiBaseUrl } from "@/lib/api";
import { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-envelope";
import { authHeaders } from "@/lib/auth-token";

export type DeleteUserDataDTO = {
  deleted_at: string;
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
