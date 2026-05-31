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
  brand?: string;
  category?: string;
  notes?: string;
  opened_at?: string;
};
