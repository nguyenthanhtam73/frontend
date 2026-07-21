/**
 * Pure helpers for advanced skin (2nd check-in photo) gating.
 * Extracted so loading / lock behavior can be unit-tested without React.
 */

export type AdvancedSkinGateInput = {
  isLoading: boolean;
  locked: boolean;
};

/** True while /me/usage is hydrating — disable multi-photo, do not clear photos. */
export function isAdvancedSkinHydrating(g: AdvancedSkinGateInput): boolean {
  return g.isLoading;
}

/**
 * True when the angle slot should reject new files.
 * Locked OR still hydrating (never unlock briefly before plan is known).
 */
export function isMultiPhotoDisabled(g: AdvancedSkinGateInput): boolean {
  return g.isLoading || g.locked;
}

/**
 * True when we may drop an existing angle photo (plan confirmed locked).
 * Never true while hydrating.
 */
export function shouldClearAnglePhoto(g: AdvancedSkinGateInput): boolean {
  return !g.isLoading && g.locked;
}
