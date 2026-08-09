export type AdminAffiliateSKURow = {
  product_id?: string;
  product_name: string;
  brand?: string;
  affiliate_link?: string;
  clicks_7d: number;
  clicks_30d: number;
  clicks_total: number;
  last_click_at?: string;
};

export type AdminAffiliateMetrics = {
  clicks_7d: number;
  clicks_30d: number;
  clicks_total: number;
  top_skus: AdminAffiliateSKURow[];
  as_of: string;
};
