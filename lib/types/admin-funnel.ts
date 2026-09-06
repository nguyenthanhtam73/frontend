/** GET /api/v1/admin/funnel-stats — founder retention health counts. */
export type AdminFunnelStats = {
  signed_up_1d: number;
  signed_up_7d: number;
  skin_check_users_ever: number;
  skin_check_users_1d: number;
  skin_check_users_7d: number;
  d0_checkin_users: number;
  d0_checkin_users_7d: number;
  d1_checkin_users: number;
  d1_eligible_users: number;
  d1_checkin_users_7d: number;
  d1_eligible_users_7d: number;
  paid_orders_7d: number;
  /** Rolling 24h impressions. Absent/null on the pre-ingest API. */
  paywall_views_1d?: number | null;
  /** Rolling 7d impressions. Absent/null on the pre-ingest API. */
  paywall_views_7d?: number | null;
  /** Same as paywall_views_7d on the new API; null on the pre-ingest API. */
  paywall_views: number | null;
  notes?: {
    paywall?: string;
    calendar?: string;
  };
  as_of: string;
};
