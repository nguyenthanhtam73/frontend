export type AdminUpcomingExpiry = {
  user_id: string;
  email: string;
  plan: string;
  plan_expires_at: string;
};

export type AdminPaymentOrderRow = {
  id: string;
  user_id: string;
  invoice_number: string;
  plan: string;
  billing_interval: string;
  amount_vnd: number;
  status: string;
  provider: string;
  paid_at?: string;
  created_at: string;
};

export type AdminPaymentMetrics = {
  today_payments: number;
  success_rate: number;
  total_revenue: number;
  failed_count: number;
  webhook_errors_last_24h: number;
  active_premium_count: number;
  upcoming_expiries: AdminUpcomingExpiry[];
  recent_payments: AdminPaymentOrderRow[];
  recent_payments_total: number;
  as_of: string;
};

export type AdminPaymentStatusFilter =
  | ""
  | "pending"
  | "paid"
  | "failed"
  | "cancelled"
  | "expired";

export const ADMIN_PAYMENT_STATUSES: AdminPaymentStatusFilter[] = [
  "",
  "pending",
  "paid",
  "failed",
  "cancelled",
  "expired",
];
