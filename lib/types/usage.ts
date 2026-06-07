export type UsageCounterDTO = {
  used: number;
  limit: number;
  remaining: number;
  unlimited?: boolean;
};

export type UsageQuotaDTO = {
  plan_tier: "free" | "premium" | string;
  is_premium: boolean;
  period: string;
  wardrobe: { can_write: boolean };
  routine_suggest: UsageCounterDTO;
  routine_manual_edit: UsageCounterDTO;
};
