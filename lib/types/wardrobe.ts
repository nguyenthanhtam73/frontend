import type { WardrobeProductInsight } from "@/lib/cabinet/product-insight";

/** GET /api/v1/wardrobe — `data` envelope. */
export type WardrobeProductDTO = {
  id: string;
  user_id: string;
  name: string;
  brand?: string;
  category?: string;
  notes?: string;
  opened_at?: string;
  created_at: string;
  updated_at: string;
  /** Omitted until insight has been generated. Cleared when name, brand, category, or notes change. */
  insight?: WardrobeProductInsight;
  /** RFC3339. Present when `insight` is set. */
  insight_at?: string;
};

export type WardrobeListDTO = {
  products: WardrobeProductDTO[];
};

export type CreateWardrobeProductInput = {
  name: string;
  brand?: string;
  category?: string;
  notes?: string;
  opened_at?: string;
};

export type UpdateWardrobeProductInput = {
  name: string;
  brand?: string;
  category?: string;
  notes?: string;
  /** YYYY-MM-DD; empty string clears the opened date. */
  opened_at?: string;
};

/** Free shelf create cap — must match backend usage.FreeWardrobeProductLimit. */
export const FREE_WARDROBE_PRODUCT_LIMIT = 10;

/**
 * Shelf cap for copy. Prefer GET /me/usage `wardrobe.limit` when the API sent
 * a positive number; otherwise the Free catalog constant above.
 */
export function wardrobeProductLimit(limit: number | null | undefined): number {
  return typeof limit === "number" && Number.isFinite(limit) && limit > 0
    ? limit
    : FREE_WARDROBE_PRODUCT_LIMIT;
}

/** POST /api/v1/wardrobe/products/scan — AI suggestion only (not persisted). */
export type WardrobeLabelScanDTO = {
  name: string;
  brand: string;
  category: string;
  notes?: string;
  confidence?: number;
  /** YYYY-MM-DD when the label scan includes an opened date. Absent otherwise. */
  opened_at?: string;
};
