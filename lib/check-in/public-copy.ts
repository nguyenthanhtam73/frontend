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

/**
 * A word label, then a bare gauge. Gauge keys lose the label too.
 * Ingredient strengths ("Retinol: 0.025") are not a match we rewrite.
 */
const LABELLED_GAUGE = new RegExp(
  String.raw`(?<![\p{L}\p{N}_])([\p{L}][\p{L}\p{N}]*(?:\s+[\p{L}][\p{L}\p{N}]*)?)\s*([:：])\s*${BARE_GAUGE.source}(\s*,\s*|\s*:\s*|\s+vì(?![\p{L}\p{N}_])(?:\s+|$))?`,
  "giu",
);

const GAUGE_KEYS = new Set(["overall", "hydration", "clarity", "barrier", "score", "scores"]);

const INGREDIENT_WORDS = new Set([
  "retinol",
  "retinoid",
  "retinoids",
  "tretinoin",
  "adapalene",
  "bha",
  "aha",
  "pha",
  "niacinamide",
  "ceramide",
  "ceramides",
  "azelaic",
  "benzoyl",
  "salicylic",
  "vitamin",
]);

function isGaugeKey(label: string): boolean {
  return GAUGE_KEYS.has(label.trim().toLowerCase());
}

function isIngredientLabel(label: string): boolean {
  const words = label.trim().toLowerCase().split(/\s+/);
  if (words.length === 2 && words[0] === "vitamin" && words[1] === "c") return true;
  return words.some((word) => INGREDIENT_WORDS.has(word));
}

/**
 * Gauge keys ("hydration: 0.78 vì …") drop the label, colon, and number.
 * A following «vì» drops only when that leaves the start of a sentence.
 * Other labels keep their name. Ingredient labels keep the strength.
 */
function stripLabelledGauges(value: string): string {
  return value.replace(
    LABELLED_GAUGE,
    (match: string, label: string, colon: string, tail: string | undefined, offset: number, whole: string) => {
      if (isIngredientLabel(label)) return match;
      if (isGaugeKey(label)) {
        const atSentenceStart = shouldCapitalizeReason(whole.slice(0, offset));
        if (atSentenceStart) return "\u0000";
        if (tail && /vì/i.test(tail)) return tail;
        return " ";
      }
      const kept = `${label}${colon} `;
      return shouldCapitalizeReason(whole.slice(0, offset) + kept) ? `${kept}\u0000` : kept;
    },
  );
}

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
  s = stripLabelledGauges(s);
  s = s.replace(/\u0000\s*(\p{L})/gu, (_, ch: string) => ch.toLocaleUpperCase("vi"));
  s = s.replace(/\u0000/g, "");
  s = unmask(s, slots);
  s = tidy(s);
  if (!s) return "";
  return lead ? capitalizeFirst(s) : s;
}
