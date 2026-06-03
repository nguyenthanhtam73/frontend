import type {
  LifeContext,
  SkinGoal,
  SkinTypeCard,
  SkinUndertone,
} from "@/lib/stores/onboarding-store";

/** Fast manual path after skipping photos — 5 skin types + 4 concerns. */
export const MANUAL_QUICK_SKIN_TYPES: SkinTypeCard[] = [
  "oily",
  "dry",
  "combo",
  "sensitive",
  "normal",
];

export const MANUAL_QUICK_CONCERNS = [
  "acne",
  "dryness",
  "redness",
  "hyperpigmentation",
] as const;

/** After photo AI — slightly wider than manual-only skip path. */
export const PHOTO_QUICK_CONCERNS = [
  ...MANUAL_QUICK_CONCERNS,
  "large_pores",
  "weak_barrier",
] as const;

export type ManualQuickConcern = (typeof MANUAL_QUICK_CONCERNS)[number];

/** Quick-info: 4 main goals (skill 3 + goals 4 + optional context). */
export const QUICK_GOALS: SkinGoal[] = [
  "glow",
  "clear_acne",
  "barrier",
  "anti_aging",
];

/** Sent to API when user no longer picks budget in onboarding UI. */
export const ONBOARDING_DEFAULT_BUDGET = "mid" as const;

/** Compact undertone row after photo AI (4 picks). */
export const QUICK_UNDERTONES: SkinUndertone[] = [
  "cool",
  "warm",
  "neutral",
  "prefer_not",
];

/** Optional life context chips on quick-info (0–3). */
export const QUICK_LIFE_CONTEXTS: LifeContext[] = ["outdoor", "work", "gym"];

/** Session flag: coach-welcome plays a short entrance animation. */
export const ONBOARDING_EXIT_ANIM_KEY = "dadiary_onboarding_exit_anim";
