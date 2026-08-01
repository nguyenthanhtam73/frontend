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
};

export type WardrobeListDTO = {
  products: WardrobeProductDTO[];
};

export type CreateWardrobeProductInput = {
  name: string;
  brand: string;
  category?: string;
  notes?: string;
  opened_at?: string;
};

export type UpdateWardrobeProductInput = {
  name: string;
  brand: string;
  category?: string;
  notes?: string;
  /** YYYY-MM-DD; empty string clears the opened date. */
  opened_at?: string;
};

/** Free shelf create cap — must match backend usage.FreeWardrobeProductLimit. */
export const FREE_WARDROBE_PRODUCT_LIMIT = 3;
