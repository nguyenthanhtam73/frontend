/**
 * Defense in depth for coach copy that still arrives with leaked internals.
 * Strips gauge decimals and snake_case field names. Does not rewrite voice.
 */

const SNAKE_CASE =
  /(?<![\p{L}\p{N}_])[A-Za-z]+_[A-Za-z_]+(?![\p{L}\p{N}_])/gu;

/**
 * "score" only when a 0–1 gauge number follows, so English like
 * "your skin score looks steady" stays intact.
 * Gauge forms: 0.xx / 0,xx, 1.0 / 1,00, or a bare 1 after the word score.
 */
const SCORE_WITH_GAUGE =
  /(?<![\p{L}\p{N}_])score(?![\p{L}\p{N}_])\s*[:：]?\s*(?:0[.,]\d+(?![\p{L}\p{N}%])|1[.,]0{1,2}(?![\p{L}\p{N}%.,])|1(?![\p{L}\p{N}%.,]))\s*(?:vì(?![\p{L}\p{N}_])\s*|,\s*|:\s*)?/giu;

/** Standalone gauge decimals. Bare integers, SPF50, dates, and 78% stay. */
const GAUGE_DECIMAL =
  /(?<![\p{L}\p{N}_])(?:0[.,]\d+(?![\p{L}\p{N}%])|1[.,]0{1,2}(?![\p{L}\p{N}%.,]))\s*(?:vì(?![\p{L}\p{N}_])\s*|,\s*|:\s*)?/gu;

const LEADING_LEAK =
  /^\s*(?:[A-Za-z]+_[A-Za-z_]+|score(?![\p{L}\p{N}_])\s*[:：]?\s*(?:0[.,]\d+|1[.,]0{1,2}|1(?![\p{L}\p{N}]))|0[.,]\d+|1[.,]0{1,2})/iu;

function tidy(value: string): string {
  let s = value.replace(/[ \t]{2,}/g, " ");
  s = s.replace(/[ \t]+([,.;:!?…])/g, "$1");
  s = s.replace(/\(\s*\)/g, "");
  s = s.replace(/\[\s*\]/g, "");
  s = s.replace(/^[ \t]*[,;:!?]+[ \t]*/, "");
  s = s.replace(/[ \t]*[,:;]+$/, "");
  s = s.replace(/[ \t]{2,}/g, " ");
  s = s.replace(/[ \t]*\n[ \t]*/g, "\n");
  s = s.replace(/\n{3,}/g, "\n\n");
  s = s.trim();
  if (!/[\p{L}\p{N}]/u.test(s)) return "";
  return s;
}

function shouldCapitalizeReason(before: string): boolean {
  const trimmed = before.trim();
  if (!trimmed) return true;
  if (/^(?:sáng|sang|tối|toi|am|pm|morning|evening)\s*[:：]?$/i.test(trimmed)) return true;
  return /[.!?…:]$/.test(trimmed);
}

function replaceLeak(pattern: RegExp, value: string): string {
  return value.replace(pattern, (match: string, offset: number, whole: string) => {
    return shouldCapitalizeReason(whole.slice(0, offset)) ? "\u0000" : " ";
  });
}

function capitalizeFirst(value: string): string {
  const chars = Array.from(value);
  const first = chars[0];
  if (!first || !/^\p{L}$/u.test(first)) return value;
  chars[0] = first.toLocaleUpperCase("vi");
  return chars.join("");
}

/**
 * Clean one coach string for display.
 * «score 0.78 vì da vẫn khỏe mạnh» → «Da vẫn khỏe mạnh».
 * Field names like situation_analysis are removed. Counts, SPF50, dates,
 * «ngày 7», and percentages stay.
 */
export function toPublicCopy(text: string): string {
  if (!text) return "";
  const input = text.normalize("NFC");
  const lead = LEADING_LEAK.test(input);
  let s = input.replace(SNAKE_CASE, " ");
  s = replaceLeak(SCORE_WITH_GAUGE, s);
  s = replaceLeak(GAUGE_DECIMAL, s);
  s = s.replace(/\u0000\s*(\p{L})/gu, (_, ch: string) => ch.toLocaleUpperCase("vi"));
  s = s.replace(/\u0000/g, "");
  s = tidy(s);
  if (!s) return "";
  return lead ? capitalizeFirst(s) : s;
}
