/** Mirrors backend dto.ProductGuidanceItem */
export type ProductGuidanceItemDTO = {
  step: string;
  phase: string;
  category: string;
  name_or_category: string;
  why: string;
  benefits: string[];
  how_to_use: string;
  caution?: string;
  affiliate_product_id?: string;
  product_name?: string;
  brand?: string;
  affiliate_link?: string;
  price_range?: string;
};
