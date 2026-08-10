/**
 * Split onboarding coaching_notes into scannable sections for the welcome UI.
 * Models are prompted for 4 paragraphs; markers help when blank lines are missing.
 */

export type CoachNoteSectionKind =
  | "observe"
  | "verdict"
  | "buddy"
  | "advice"
  | "other";

export type CoachNoteSection = {
  kind: CoachNoteSectionKind;
  text: string;
};

const SECTION_BREAK =
  /\n(?=(?:Tóm lại|Tóm tắt|Mày ơi|Hướng xử lý|Lời khuyên|In short|So[,:]|Next[,:]|Bottom line|Hey[,:]|Quick tip))/i;

function classifyParagraph(p: string, index: number): CoachNoteSectionKind {
  const t = p.trim();
  if (/^(Tóm lại|Tóm tắt|In short|Bottom line)\b/i.test(t)) return "verdict";
  if (/^(Hướng xử lý|Lời khuyên|Next[,:]|Quick tip)\b/i.test(t)) return "advice";
  if (/^(Mày ơi|Hey[,:])\b/i.test(t)) return "buddy";
  if (index === 0) return "observe";
  if (index === 1) return "verdict";
  if (index === 2) return "buddy";
  if (index === 3) return "advice";
  return "other";
}

function splitRaw(text: string): string[] {
  const byBlank = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (byBlank.length > 1) return byBlank;

  const byMarker = text
    .split(SECTION_BREAK)
    .map((p) => p.trim())
    .filter(Boolean);
  if (byMarker.length > 1) return byMarker;

  const byLine = text
    .split(/\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (byLine.length > 2) return byLine;

  return [text.trim()].filter(Boolean);
}

/** First ~sentence or two for collapsed preview (not a hard char cut mid-word when short). */
export function previewCoachText(text: string, maxChars = 160): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  const slice = trimmed.slice(0, maxChars);
  const sentenceEnd = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? "),
    slice.lastIndexOf("… "),
  );
  if (sentenceEnd > maxChars * 0.45) {
    return `${slice.slice(0, sentenceEnd + 1).trim()}…`;
  }
  return `${slice.replace(/\s+\S*$/, "").trim()}…`;
}

export function parseCoachNoteSections(text: string): CoachNoteSection[] {
  const paras = splitRaw(text);
  return paras.map((p, i) => ({
    kind: classifyParagraph(p, i),
    text: p,
  }));
}

/** Prefer explicit verdict paragraph; else first short summary-like line. */
export function pickCoachVerdict(sections: CoachNoteSection[]): string | null {
  const verdict = sections.find((s) => s.kind === "verdict");
  if (verdict?.text) return verdict.text;
  return null;
}
