import { apiBaseUrl } from "@/lib/api";
import { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-envelope";
import { authHeaders } from "@/lib/auth-token";
import type { SkinProfileResponse } from "@/lib/types/profile";

export type DeleteOnboardingDTO = {
  deleted_at: string;
};

export async function fetchSkinProfile(): Promise<SkinProfileResponse | null> {
  const res = await fetch(`${apiBaseUrl}/api/v1/profile/skin`, {
    headers: authHeaders(),
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error("auth");
  }
  const json = (await res.json().catch(() => ({}))) as ApiEnvelope<SkinProfileResponse>;
  if (!res.ok) {
    throw new Error(getApiErrorMessage(json, "fetch_failed"));
  }
  return json.data ?? null;
}

export async function deleteOnboarding(): Promise<DeleteOnboardingDTO> {
  const res = await fetch(`${apiBaseUrl}/api/v1/profile/onboarding`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  const json = (await res.json().catch(() => ({}))) as ApiEnvelope<DeleteOnboardingDTO>;
  if (res.status === 401 || res.status === 403) {
    throw new Error("auth");
  }
  if (!res.ok || !json.data) {
    throw new Error(getApiErrorMessage(json, "delete_failed"));
  }
  return json.data;
}
