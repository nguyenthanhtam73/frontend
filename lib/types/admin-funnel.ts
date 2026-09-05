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
  /** Always null — paywall is client-only and is not persisted. */
  paywall_views: number | null;
  notes?: {
    paywall?: string;
    calendar?: string;
  };
  as_of: string;
};
