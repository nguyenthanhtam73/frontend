import { ApiError, apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api-client";
import { getAccessToken, getRefreshToken } from "@/lib/auth-token";
import type {
  CreateWardrobeProductInput,
  UpdateWardrobeProductInput,
  WardrobeLabelScanDTO,
  WardrobeListDTO,
  WardrobeProductDTO,
} from "@/lib/types/wardrobe";

/** Vision OCR can take a while — align with onboarding analyze budget. */
const SCAN_TIMEOUT_MS = 120_000;

function requireSession(): void {
  if (!getAccessToken() && !getRefreshToken()) {
    throw new Error("auth");
  }
}

function throwWardrobeApiError(err: unknown, fallback: string): never {
  if (err instanceof ApiError) {
    if (err.kind === "unauthorized" || err.status === 401) throw new Error("auth");
    if (err.code === "premium_required") throw new Error("premium_required");
    if (err.code === "quota_exceeded") throw new Error("quota_exceeded");
    if (err.status === 404 || err.code === "not_found") throw new Error("not_found");
    throw new Error(err.serverMessage || fallback);
  }
  throw err instanceof Error ? err : new Error(fallback);
}

export async function fetchWardrobe(): Promise<WardrobeListDTO> {
  requireSession();
  try {
    return await apiGet<WardrobeListDTO>("/api/v1/wardrobe", { toastOnError: false });
  } catch (err) {
    throwWardrobeApiError(err, "wardrobe_fetch_failed");
  }
}

export async function createWardrobeProduct(
  input: CreateWardrobeProductInput,
): Promise<WardrobeProductDTO> {
  requireSession();
  try {
    return await apiPost<WardrobeProductDTO>("/api/v1/wardrobe/products", input, {
      toastOnError: false,
    });
  } catch (err) {
    throwWardrobeApiError(err, "wardrobe_create_failed");
  }
}

export async function updateWardrobeProduct(
  id: string,
  input: UpdateWardrobeProductInput,
): Promise<WardrobeProductDTO> {
  requireSession();
  try {
    return await apiPatch<WardrobeProductDTO>(
      `/api/v1/wardrobe/products/${encodeURIComponent(id)}`,
      input,
      { toastOnError: false },
    );
  } catch (err) {
    throwWardrobeApiError(err, "wardrobe_update_failed");
  }
}

export async function deleteWardrobeProduct(id: string): Promise<void> {
  requireSession();
  try {
    await apiDelete(`/api/v1/wardrobe/products/${encodeURIComponent(id)}`, {
      toastOnError: false,
    });
  } catch (err) {
    throwWardrobeApiError(err, "wardrobe_delete_failed");
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
  requireSession();
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
