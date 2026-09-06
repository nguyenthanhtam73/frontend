/** Skip-mode is ready when the user left any tag or note for the coach. */
export function isSkipModeReady(input: {
  conditions: readonly string[];
  symptoms: readonly string[];
  userNote: string;
}): boolean {
  return (
    input.conditions.length > 0 ||
    input.symptoms.length > 0 ||
    input.userNote.trim().length > 0
  );
}

/**
 * Photo mode needs at least one staged photo. Skip mode needs a tag or note.
 * Does not invent a third path (implicit skip while still in photo mode).
 */
export function canSubmitCheckIn(input: {
  skipMode: boolean;
  photoCount: number;
  skipModeReady: boolean;
}): boolean {
  return input.skipMode ? input.skipModeReady : input.photoCount > 0;
}
