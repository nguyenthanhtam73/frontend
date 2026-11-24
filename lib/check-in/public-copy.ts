/**
 * Defense in depth for coach copy that still arrives with leaked internals.
 * Strips a gauge decimal only when it sits next to "score", a snake_case
 * field name, or a "label:" prefix. Dose lines, strengths, and URLs stay.
 */

/** http(s) URLs and emails — snake_case inside them is not a field name. */
const PROTECTED =
  /(?:https?:\/\/[^\s<>"')\]]+|www\.[^\s<>"')\]]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/gi;

/**
 * A leaked 0–1 gauge: 0.xx / 0,xx or 1.0 / 1,00.
 * Not a dose (ml, g, …), a percent, or one side of a range.
 */
const BARE_GAUGE =
  /(?:0[.,]\d+|1[.,]0{1,2})(?![\p{L}\p{N}%])(?!\s*(?:ml|mg|mm|cm|lít|giọt|g|%)(?![\p{L}\p{N}]))(?!\s*(?:[–\-~]|đến\b))/iu;

const GAUGE_TAIL = String.raw`\s*(?:vì(?![\p{L}\p{N}_])\s*|,\s*|:\s*)?`;

const SCORE_WITH_GAUGE = new RegExp(
  String.raw`(?<![\p{L}\p{N}_])score(?![\p{L}\p{N}_])\s*[:：]?\s*${BARE_GAUGE.source}${GAUGE_TAIL}`,
  "giu",
);

/** Field name, and a gauge sitting on that same label. */
const SNAKE_CASE = new RegExp(
  String.raw`(?<![\p{L}\p{N}_])[A-Za-z]+_[A-Za-z_]+(?![\p{L}\p{N}_])(?:\s*[:：]\s*${BARE_GAUGE.source}${GAUGE_TAIL})?`,
  "gu",
);

/** "Sáng:" / "hydration:" then a bare gauge — the label itself stays. */
const LABEL_GAUGE = new RegExp(
  String.raw`(?<=[\p{L}\p{N}_][:：]\s*)${BARE_GAUGE.source}${GAUGE_TAIL}`,
  "gu",
);

const LEADING_LEAK =
  /^\s*(?:[A-Za-z]+_[A-Za-z_]+|score(?![\p{L}\p{N}_])\s*[:：]?\s*(?:0[.,]\d+|1[.,]0{1,2}))/iu;

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

function maskProtected(input: string): { text: string; slots: string[] } {
  const slots: string[] = [];
  const text = input.replace(PROTECTED, (found) => {
    const token = `\uE000${slots.length}\uE001`;
    slots.push(found);
    return token;
  });
  return { text, slots };
}

function unmask(text: string, slots: string[]): string {
  return text.replace(/\uE000(\d+)\uE001/g, (_, index: string) => slots[Number(index)] ?? "");
}

/**
 * Clean one coach string for display.
 * «score 0.78 vì da vẫn khỏe mạnh» → «Da vẫn khỏe mạnh».
 * «Lấy 0,5 ml serum» and «https://dadiary.vn/a_b_c» stay intact.
 */
export function toPublicCopy(text: string): string {
  if (!text) return "";
  const input = text.normalize("NFC");
  const { text: masked, slots } = maskProtected(input);
  const lead = LEADING_LEAK.test(masked);
  let s = masked.replace(SNAKE_CASE, " ");
  s = replaceLeak(SCORE_WITH_GAUGE, s);
  s = replaceLeak(LABEL_GAUGE, s);
  s = s.replace(/\u0000\s*(\p{L})/gu, (_, ch: string) => ch.toLocaleUpperCase("vi"));
  s = s.replace(/\u0000/g, "");
  s = unmask(s, slots);
  s = tidy(s);
  if (!s) return "";
  return lead ? capitalizeFirst(s) : s;
}
