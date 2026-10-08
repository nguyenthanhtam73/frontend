import type { CoachPhotoEvidenceKind } from "@/lib/check-in/coach-evidence";
import type { CoachZoneNoteDTO } from "@/lib/types/skin-check";

/** Zone ids the photo check-in coach actually emits (backend checkInZones). */
const ZONE_LABEL_KEY = {
  forehead: "zoneForehead",
  nose: "zoneNose",
  left_cheek: "zoneLeftCheek",
  right_cheek: "zoneRightCheek",
  chin: "zoneChin",
  around_mouth: "zoneAroundMouth",
  jawline: "zoneJawline",
  under_eyes: "zoneUnderEyes",
  neck: "zoneNeck",
  other: "zoneOther",
} as const;

export type CoachZoneLabelKey = (typeof ZONE_LABEL_KEY)[keyof typeof ZONE_LABEL_KEY];

const SEVERITY_LABEL_KEY = {
  mild: "severityMild",
  moderate: "severityModerate",
  pronounced: "severityPronounced",
} as const;

export type CoachSeverityLabelKey =
  (typeof SEVERITY_LABEL_KEY)[keyof typeof SEVERITY_LABEL_KEY];

export type ScoreNoteKey = "overall" | "hydration" | "clarity" | "barrier";

const MAX_ZONE_NOTES = 5;
const MAX_CLARIFY_ITEMS = 3;

export type VisibleZoneNote = {
  zone: string;
  note: string;
  labelKey: CoachZoneLabelKey | null;
  severityKey: CoachSeverityLabelKey | null;
};

export type ClarifyBox =
  | { kind: "retake"; items: string[] }
  | { kind: "questions"; items: string[] };

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text ? text : undefined;
}

/** Known zone → i18n key. Unknown, blank, or non-string zones hide the label. */
export function coachZoneLabelKey(zone: unknown): CoachZoneLabelKey | null {
  const key = asTrimmedString(zone)?.toLowerCase() ?? "";
  if (!key || !(key in ZONE_LABEL_KEY)) return null;
  return ZONE_LABEL_KEY[key as keyof typeof ZONE_LABEL_KEY];
}

/** Known severity → i18n key. Unknown or non-string values stay hidden. */
export function coachSeverityLabelKey(severity: unknown): CoachSeverityLabelKey | null {
  const key = asTrimmedString(severity)?.toLowerCase() ?? "";
  if (key === "mild" || key === "moderate" || key === "pronounced") {
    return SEVERITY_LABEL_KEY[key];
  }
  return null;
}

function lowerChar(ch: string): string {
  return ch.toLocaleLowerCase("vi");
}

function isSpace(ch: string): boolean {
  return /^\s$/u.test(ch);
}

function isLetter(ch: string): boolean {
  return /^\p{L}$/u.test(ch);
}

/** Comma, colon, or a dash. A following letter is never a boundary. */
function isSeparator(ch: string): boolean {
  return ch === "," || ch === ":" || ch === "-" || ch === "–" || ch === "—";
}

function capitalizeFirst(value: string): string {
  const chars = Array.from(value);
  const first = chars[0];
  if (!first) return value;
  return first.toLocaleUpperCase("vi") + chars.slice(1).join("");
}

/**
 * Drop a leading zone label from a note, then capitalize what's left.
 * Match is NFC + lowercase and keeps diacritics. The label must be the whole
 * prefix and be followed by whitespace or , : - – —. A glued letter stays put.
 * The label alone, or nothing left after the separator, keeps the original note.
 */
export function stripLeadingZoneLabel(note: string, label: string): string {
  const noteChars = Array.from(note.normalize("NFC"));
  const labelChars = Array.from(label.normalize("NFC").trim());
  if (labelChars.length === 0 || noteChars.length <= labelChars.length) return note;
  for (let i = 0; i < labelChars.length; i++) {
    if (lowerChar(noteChars[i]!) !== lowerChar(labelChars[i]!)) return note;
  }

  let j = labelChars.length;
  const boundary = noteChars[j]!;
  if (isLetter(boundary) || (!isSpace(boundary) && !isSeparator(boundary))) return note;
  if (isSpace(boundary)) {
    while (j < noteChars.length && isSpace(noteChars[j]!)) j++;
    if (j < noteChars.length && isSeparator(noteChars[j]!)) {
      j++;
      while (j < noteChars.length && isSpace(noteChars[j]!)) j++;
    }
  } else {
    j++;
    while (j < noteChars.length && isSpace(noteChars[j]!)) j++;
  }

  const rest = noteChars.slice(j).join("");
  if (!/[\p{L}\p{N}]/u.test(rest)) return note;
  return capitalizeFirst(rest);
}

/** Drop blank notes, keep API order, cap at 5. Missing or non-array → nothing. */
export function visibleZoneNotes(
  notes: unknown,
  labels?: Partial<Record<CoachZoneLabelKey, string>>,
): VisibleZoneNote[] {
  if (!Array.isArray(notes)) return [];
  const out: VisibleZoneNote[] = [];
  for (const raw of notes) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Partial<CoachZoneNoteDTO>;
    const note = asTrimmedString(item.note);
    if (!note) continue;
    const zone = asTrimmedString(item.zone) ?? "";
    const labelKey = coachZoneLabelKey(zone);
    const label = labelKey ? asTrimmedString(labels?.[labelKey]) : undefined;
    const shown = label ? stripLeadingZoneLabel(note, label) : note;
    if (!shown) continue;
    out.push({
      zone,
      note: shown,
      labelKey,
      severityKey: coachSeverityLabelKey(item.severity),
    });
    if (out.length >= MAX_ZONE_NOTES) break;
  }
  return out;
}

/** Sentence under one gauge. Blank, missing, or non-string → omit the line. */
export function scoreNoteText(notes: unknown, key: ScoreNoteKey): string | undefined {
  if (!notes || typeof notes !== "object" || Array.isArray(notes)) return undefined;
  return asTrimmedString((notes as Partial<Record<ScoreNoteKey, unknown>>)[key]);
}

/**
 * Soft follow-up box. Shown only when there is at least one question or tip.
 * A limited or skipped photo frames the list as retake tips. A clear photo
 * keeps the "understand your skin" title even when confidence is low.
 */
export function clarifyBox(input: {
  photoKind?: CoachPhotoEvidenceKind | string;
  clarify_questions?: unknown;
  /** Ignored for the title. Accepted so a non-string value cannot throw. */
  confidence?: unknown;
} | null | undefined): ClarifyBox | null {
  if (!input || typeof input !== "object") return null;
  if (!Array.isArray(input.clarify_questions)) return null;
  const items: string[] = [];
  for (const raw of input.clarify_questions) {
    const text = asTrimmedString(raw);
    if (!text) continue;
    items.push(text);
    if (items.length >= MAX_CLARIFY_ITEMS) break;
  }
  if (items.length === 0) return null;
  const retake = input.photoKind === "limited" || input.photoKind === "skip";
  return retake ? { kind: "retake", items } : { kind: "questions", items };
}

/** Locale labels for known zones, used to trim a repeated name from the note. */
export function zoneLabelMap(
  translate: (key: CoachZoneLabelKey) => string,
): Partial<Record<CoachZoneLabelKey, string>> {
  const out: Partial<Record<CoachZoneLabelKey, string>> = {};
  for (const key of Object.values(ZONE_LABEL_KEY)) {
    const text = asTrimmedString(translate(key));
    if (text) out[key] = text;
  }
  return out;
}
