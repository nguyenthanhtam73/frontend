import type { PlanTier } from "@/lib/premium/features";

export type AdminUserListItem = {
  id: string;
  email: string;
  username: string;
  display_name?: string;
  plan_tier: PlanTier | string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminPlanChangeLog = {
  id: string;
  user_id: string;
  actor_user_id: string;
  actor_email: string;
  from_plan: string;
  to_plan: string;
  reason?: string;
  created_at: string;
};

export type AdminUserListResponse = {
  items: AdminUserListItem[];
  total: number;
  page: number;
  page_size: number;
  query?: string;
};

export type AdminUserDetailResponse = {
  user: AdminUserListItem;
  recent_changes: AdminPlanChangeLog[];
};

export type AdminUpdatePlanResponse = {
  user: AdminUserListItem;
  log: AdminPlanChangeLog;
};

export const ADMIN_PLAN_TIERS = ["free", "premium", "premium_plus"] as const;
export type AdminPlanTier = (typeof ADMIN_PLAN_TIERS)[number];
