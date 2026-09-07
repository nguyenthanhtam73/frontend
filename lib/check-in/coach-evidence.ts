/** Photo-evidence state for daily coach UI — skip / weak photo must not sound certain. */

export type CoachPhotoEvidenceKind = "ok" | "skip" | "limited";

export type CoachEvidenceChip =
  | "skip"
  | "limited"
  | "tags_only"
  | "retake"
  | "not_certain";

export type CoachPhotoEvidence = {
  kind: CoachPhotoEvidenceKind;
  chips: CoachEvidenceChip[];
};

const SKIP_CHIPS: CoachEvidenceChip[] = ["skip", "tags_only", "not_certain"];
const LIMITED_CHIPS: CoachEvidenceChip[] = ["limited", "retake", "not_certain"];

function normalizeEvidence(raw: string | null | undefined): CoachPhotoEvidenceKind | null {
  const s = (raw ?? "").trim().toLowerCase();
  if (s === "skip" || s === "skipped" || s === "no_photo" || s === "skipped_no_photo") {
    return "skip";
  }
  if (s === "limited" || s === "weak" || s === "poor") {
    return "limited";
  }
  if (s === "ok" || s === "good" || s === "clear") {
    return "ok";
  }
  return null;
}

/**
 * Resolve skip vs limited vs ok.
 *
 * Backend `photo_evidence` wins when present. Empty `image_urls` is the
 * skip-mode fallback so the banner still shows before that field ships.
 */
export function resolveCoachPhotoEvidence(input: {
  imageUrls?: string[] | null;
  photoEvidence?: string | null;
  photoLimited?: boolean | null;
}): CoachPhotoEvidence {
  const fromField = normalizeEvidence(input.photoEvidence);
  const noPhotos = !input.imageUrls?.some((u) => u.trim().length > 0);

  if (fromField === "skip" || (fromField == null && noPhotos)) {
    return { kind: "skip", chips: SKIP_CHIPS };
  }
  if (fromField === "limited" || input.photoLimited === true) {
    return { kind: "limited", chips: LIMITED_CHIPS };
  }
  return { kind: "ok", chips: [] };
}

export function isUncertainPhotoEvidence(kind: CoachPhotoEvidenceKind): boolean {
  return kind === "skip" || kind === "limited";
}
