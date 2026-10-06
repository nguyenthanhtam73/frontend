import type {
  CoachZoneNoteDTO,
  SkinCoachScoreNotesDTO,
} from "@/lib/types/skin-check";

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

/** Known zone → i18n key. Unknown or blank zones hide the label. */
export function coachZoneLabelKey(zone: string | undefined): CoachZoneLabelKey | null {
  const key = zone?.trim().toLowerCase() ?? "";
  if (!key || !(key in ZONE_LABEL_KEY)) return null;
  return ZONE_LABEL_KEY[key as keyof typeof ZONE_LABEL_KEY];
}

/** Known severity → i18n key. Unknown values stay hidden (no raw English). */
export function coachSeverityLabelKey(
  severity: string | undefined,
): CoachSeverityLabelKey | null {
  const key = severity?.trim().toLowerCase() ?? "";
  if (key === "mild" || key === "moderate" || key === "pronounced") {
    return SEVERITY_LABEL_KEY[key];
  }
  return null;
}

/** Drop blank notes, keep API order, cap at 5. Missing field → nothing to render. */
export function visibleZoneNotes(
  notes: CoachZoneNoteDTO[] | undefined,
): VisibleZoneNote[] {
  const out: VisibleZoneNote[] = [];
  for (const raw of notes ?? []) {
    const note = raw?.note?.trim() ?? "";
    if (!note) continue;
    const zone = raw.zone?.trim() ?? "";
    out.push({
      zone,
      note,
      labelKey: coachZoneLabelKey(zone),
      severityKey: coachSeverityLabelKey(raw.severity),
    });
    if (out.length >= MAX_ZONE_NOTES) break;
  }
  return out;
}

/** Sentence under one gauge. Blank or missing → omit the line. */
export function scoreNoteText(
  notes: SkinCoachScoreNotesDTO | undefined,
  key: ScoreNoteKey,
): string | undefined {
  const text = notes?.[key]?.trim();
  return text ? text : undefined;
}

/**
 * Soft follow-up box. Shown when the coach asked for more, or listed tips.
 * Low confidence frames the list as retake tips; anything else as questions.
 */
export function clarifyBox(input: {
  confidence?: string;
  needs_more_info?: boolean;
  clarify_questions?: string[];
} | null | undefined): ClarifyBox | null {
  if (!input) return null;
  const items: string[] = [];
  for (const raw of input.clarify_questions ?? []) {
    const text = raw?.trim() ?? "";
    if (!text) continue;
    items.push(text);
    if (items.length >= MAX_CLARIFY_ITEMS) break;
  }
  if (input.needs_more_info !== true && items.length === 0) return null;
  const low = input.confidence?.trim().toLowerCase() === "low";
  return low ? { kind: "retake", items } : { kind: "questions", items };
}
