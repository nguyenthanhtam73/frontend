import type {
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

/** Quick-info step: 4 main skin goals (skill is 3 choices in UI). */
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

/** Session flag: coach-welcome plays a short entrance animation. */
export const ONBOARDING_EXIT_ANIM_KEY = "dadiary_onboarding_exit_anim";

/** Set when user taps Finish — reload /onboarding should go to coach-welcome, not review. */
export const JUST_COMPLETED_ONBOARDING_KEY = "dadiary_just_completed_onboarding";

/** Guest (no login) may complete onboarding once; value `"true"` when used. */
export const ONBOARDING_GUEST_TRIAL_KEY = "hasCompletedOnboardingTrial";

/** Cookie twin of ONBOARDING_GUEST_TRIAL_KEY (survives some localStorage clears). */
export const ONBOARDING_GUEST_TRIAL_COOKIE = "dadiary_guest_onboarding_trial";

/** Tracks last onboarding reset to enforce one reset per calendar day. */
export const ONBOARDING_RESET_KEY = "dadiary_onboarding_reset_at";

/**
 * Per-user flag: auth user skipped onboarding (enter app without completing).
 * Value is `"1"`; key suffix is the user id.
 */
export const ONBOARDING_SKIPPED_KEY_PREFIX = "dadiary_onboarding_skipped:";

/** Step 1 — main concerns (user picks up to ONBOARDING_MAX_CONCERNS). */
export const STEP1_CONCERNS = [
  "acne",
  "dryness",
  "redness",
  "hyperpigmentation",
  "dullness",
  "large_pores",
] as const;

export const ONBOARDING_MAX_CONCERNS = 3;

/** Onboarding photo AI: at least 2 angles, up to 3. */
export const ONBOARDING_MIN_PHOTOS = 2;
export const ONBOARDING_MAX_PHOTOS = 3;

/**
 * Vision analyze-skin — abort request after this (ms).
 * Two sequential model calls (vision → coach) plus upload regularly run past a
 * minute on mobile data; the loading UI offers the goal-based routine from 15s,
 * so a long ceiling costs nothing and stops us failing runs that would land.
 */
export const ONBOARDING_ANALYZE_TIMEOUT_MS = 120_000;

/** During analyze loading — show “taking longer than usual” copy (ms). */
export const ONBOARDING_ANALYZE_SLOW_HINT_MS = 45_000;

/**
 * Finish / preview-complete — wait before offering default routine (ms).
 * The loading copy already has a 35s tier, so 45s left almost no headroom and
 * discarded routines that were about to land.
 */
export const ONBOARDING_FINISH_TIMEOUT_MS = 90_000;

/** Background attach of guest claim photos after fast JSON complete (ms). */
export const ONBOARDING_PHOTO_ATTACH_TIMEOUT_MS = 90_000;
