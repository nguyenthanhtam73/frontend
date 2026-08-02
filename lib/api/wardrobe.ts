import { apiBaseUrl } from "@/lib/api";
import { ApiError, apiPost } from "@/lib/api-client";
import { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-envelope";
import { authHeaders, getAccessToken } from "@/lib/auth-token";
import type {
  CreateWardrobeProductInput,
  UpdateWardrobeProductInput,
  WardrobeLabelScanDTO,
  WardrobeListDTO,
  WardrobeProductDTO,
} from "@/lib/types/wardrobe";

/** Vision OCR can take a while — align with onboarding analyze budget. */
const SCAN_TIMEOUT_MS = 120_000;

function throwWardrobeWriteError(res: Response, json: ApiEnvelope<unknown>, fallback: string): never {
  if (res.status === 401) {
    throw new Error("auth");
  }
  const code = json.error?.code;
  if (code === "premium_required") {
    throw new Error("premium_required");
  }
  if (code === "quota_exceeded") {
    throw new Error("quota_exceeded");
  }
  if (res.status === 404 || code === "not_found") {
    throw new Error("not_found");
  }
  throw new Error(getApiErrorMessage(json, fallback));
}

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
  if (!res.ok || !json.data) {
    throwWardrobeWriteError(res, json, "wardrobe_create_failed");
  }
  return json.data;
}

export async function updateWardrobeProduct(
  id: string,
  input: UpdateWardrobeProductInput,
): Promise<WardrobeProductDTO> {
  if (!getAccessToken()) {
    throw new Error("auth");
  }
  const res = await fetch(`${apiBaseUrl}/api/v1/wardrobe/products/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      ...authHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const json = (await res.json().catch(() => ({}))) as ApiEnvelope<WardrobeProductDTO>;
  if (!res.ok || !json.data) {
    throwWardrobeWriteError(res, json, "wardrobe_update_failed");
  }
  return json.data;
}

export async function deleteWardrobeProduct(id: string): Promise<void> {
  if (!getAccessToken()) {
    throw new Error("auth");
  }
  const res = await fetch(`${apiBaseUrl}/api/v1/wardrobe/products/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  const json = (await res.json().catch(() => ({}))) as ApiEnvelope<{ ok?: boolean }>;
  if (!res.ok) {
    throwWardrobeWriteError(res, json, "wardrobe_delete_failed");
  }
}

/**
 * POST /api/v1/wardrobe/products/scan — multipart field `image`.
 * Suggests name/brand/category; does not create a shelf item.
 */
export async function scanWardrobeProductLabel(input: {
  file: File;
  locale: string;
}): Promise<WardrobeLabelScanDTO> {
  if (!getAccessToken()) {
    throw new Error("auth");
  }
  const fd = new FormData();
  fd.append("image", input.file);
  fd.append("locale", input.locale);
  try {
    return await apiPost<WardrobeLabelScanDTO>("/api/v1/wardrobe/products/scan", fd, {
      toastOnError: false,
      timeoutMs: SCAN_TIMEOUT_MS,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.kind === "unauthorized" || err.status === 401) throw new Error("auth");
      if (err.code === "premium_required") throw new Error("premium_required");
      if (err.code === "quota_exceeded") throw new Error("quota_exceeded");
      if (err.status === 429) throw new Error("rate_limited");
    }
    throw err instanceof Error ? err : new Error("scan_failed");
  }
}

export const wardrobeQueryKey = ["wardrobe"] as const;
