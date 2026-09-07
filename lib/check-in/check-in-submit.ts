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

export type SkinCheckFormFields = {
  skipMode: boolean;
  files: readonly File[];
  title: string;
  userNote: string;
  environmentNote: string;
  conditions: readonly string[];
  symptoms: readonly string[];
  skillMode: string | null;
  locale: string;
};

/** Shared POST body for signed-in submit and guest local claim. */
export function buildSkinCheckFormData(input: SkinCheckFormFields): FormData {
  const fd = new FormData();
  if (input.skipMode) {
    fd.append("skip_mode", "true");
  } else {
    for (const file of input.files) {
      fd.append("images", file);
    }
  }
  fd.append("title", input.title);
  fd.append("user_note", input.userNote);
  fd.append("environment_note", input.environmentNote);
  fd.append("conditions", JSON.stringify(input.conditions));
  fd.append("symptoms", JSON.stringify(input.symptoms));
  fd.append("visibility", "private");
  fd.append(
    "climate_context",
    JSON.stringify({
      coach_skill_level: input.skillMode ?? "beginner",
      client: "dadiary-web",
      ui_locale: input.locale,
    }),
  );
  return fd;
}
