/**
 * Cabinet empty-state next step.
 *
 * Activation comes first: if they have no diary yet, do not push
 * “create a routine in ~2 minutes”. Logged-out users get one sign-in
 * CTA (not a repeated “sign in to save”).
 */

export type CabinetEmptyIntent =
  | "guest"
  | "pending"
  | "checkInFirst"
  | "setupStarter"
  | "addProduct";

export function resolveCabinetEmptyIntent(input: {
  hasAuth: boolean;
  /** True once streak is known (success, cached data, or error). */
  streakSettled: boolean;
  neverCheckedIn: boolean;
  onboardingComplete: boolean;
}): CabinetEmptyIntent {
  if (!input.hasAuth) return "guest";
  if (!input.streakSettled) return "pending";
  if (input.neverCheckedIn) return "checkInFirst";
  if (!input.onboardingComplete) return "setupStarter";
  return "addProduct";
}

/** “Create starter in ~2 min” only after they already have a diary. */
export function shouldShowCabinetSetupStarter(
  intent: CabinetEmptyIntent,
): boolean {
  return intent === "setupStarter";
}
