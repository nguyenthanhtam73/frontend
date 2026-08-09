/** Matches backend `dto.ProductSuggestion`. */
export type ProductSuggestionDTO = {
  product_name: string;
  brand: string;
  reason: string;
  affiliate_link: string;
  price_range: string;
  /** high | medium */
  priority: string;
  product_id?: string;
  step?: string;
  phase?: string;
  benefits?: string[];
  how_to_use?: string;
  caution?: string;
};
