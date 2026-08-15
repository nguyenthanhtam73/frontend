/** Marketing “start” CTAs: photo onboarding before signup. */
export const LANDING_START_HREF = "/onboarding" as const;

export function landingStartHref(): typeof LANDING_START_HREF {
  return LANDING_START_HREF;
}
