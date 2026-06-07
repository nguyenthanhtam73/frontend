import { apiBaseUrl } from "@/lib/api";
import { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-envelope";
import { authHeaders, getAccessToken } from "@/lib/auth-token";
import type {
  CreateWardrobeProductInput,
  WardrobeListDTO,
  WardrobeProductDTO,
} from "@/lib/types/wardrobe";

export async function fetchWardrobe(): Promise<WardrobeListDTO> {
  if (!getAccessToken()) {
    throw new Error("auth");
  }
  const res = await fetch(`${apiBaseUrl}/api/v1/wardrobe`, { headers: authHeaders() });
  const json = (await res.json().catch(() => ({}))) as ApiEnvelope<WardrobeListDTO>;
  if (res.status === 401) {
    throw new Error("auth");
  }
  if (!res.ok || !json.data) {
    throw new Error(getApiErrorMessage(json, "wardrobe_fetch_failed"));
  }
  return json.data;
}

export async function createWardrobeProduct(
  input: CreateWardrobeProductInput,
): Promise<WardrobeProductDTO> {
  if (!getAccessToken()) {
    throw new Error("auth");
  }
  const res = await fetch(`${apiBaseUrl}/api/v1/wardrobe/products`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const json = (await res.json().catch(() => ({}))) as ApiEnvelope<WardrobeProductDTO>;
  if (res.status === 401) {
    throw new Error("auth");
  }
  if (!res.ok || !json.data) {
    if (json.error?.code === "premium_required") {
      throw new Error("premium_required");
    }
    throw new Error(getApiErrorMessage(json, "wardrobe_create_failed"));
  }
  return json.data;
}

export const wardrobeQueryKey = ["wardrobe"] as const;
