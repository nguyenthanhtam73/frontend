/** True only when GET /me sent `features.mascot: true`. Missing or false stays off. */
export function mascotFeatureEnabled(
  user: { features?: { mascot?: boolean } | null } | null | undefined,
): boolean {
  return user?.features?.mascot === true;
}

/** Hide Bé Da while the mascot request is unfinished, failed, or 404 (`data === null`). */
export function mascotQueryHidesUI(result: { isSuccess: boolean; data: unknown }): boolean {
  return !result.isSuccess || result.data == null;
}
