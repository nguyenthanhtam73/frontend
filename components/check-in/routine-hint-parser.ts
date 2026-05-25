/**
 * Helpers that turn the AI coach's free-text "routine_hints" lines into
 * structured `RoutineStepDTO` items the Routine editor (and our quick panel)
 * can save directly.
 *
 * Why parse on the client:
 *   - The coach response is intentionally human-friendly (bullet text), not a
 *     structured routine — we don't want to constrain how the model writes.
 *   - Doing the conversion locally lets the user "Apply" without an extra
 *     server round-trip and means we can re-use the same routine endpoint as
 *     the manual editor (POST /api/v1/routines).
 */

import { localId } from "@/components/routine/routine-helpers";
import {
  ROUTINE_CATEGORIES,
  type RoutineCategory,
  type RoutineStepDTO,
} from "@/lib/types/routine";

/**
 * Soft keyword map (Vietnamese + English) used to guess a step's category.
 * Order is irrelevant — first match wins. "other" is the silent fallback.
 *
 * Keep entries lowercase. We compare against `line.toLowerCase()` and use
 * substring matching, so partial words ("rửa mặt" inside "Sữa rửa mặt dịu")
 * still resolve correctly.
 */
const CATEGORY_KEYWORDS: Record<Exclude<RoutineCategory, "other">, string[]> = {
  spf: ["spf", "sunscreen", "kem chống nắng", "chống nắng", "uv"],
  cleanser: [
    "cleanser",
    "rửa mặt",
    "sữa rửa",
    "tẩy trang",
    "làm sạch",
    "double cleanse",
    "micellar",
  ],
  toner: ["toner", "essence", "lotion cấp ẩm"],
  serum: ["serum", "ampoule"],
  treatment: [
    "bha",
    "aha",
    "pha",
    "retinol",
    "retinoid",
    "tretinoin",
    "vitamin c",
    "azelaic",
    "treatment",
    "spot",
    "kem trị mụn",
    "hoạt chất",
    "acid",
  ],
  moisturizer: [
    "moisturizer",
    "moisturiser",
    "kem dưỡng",
    "dưỡng ẩm",
    "cream",
    "lotion",
    "balm",
  ],
  eye: ["eye cream", "kem mắt", "vùng mắt"],
  mask: ["mask", "mặt nạ", "sleeping mask"],
};

/**
 * Strip common prefixes the coach uses (e.g. "Sáng:", "AM:", "1.", "•").
 * Leaves the descriptive part of the line so the routine title reads cleanly
 * in the editor.
 */
function stripPrefix(line: string): string {
  return line
    .trim()
    .replace(/^[\-\u2022\*]+\s*/, "")
    .replace(/^(?:bước\s*)?\d+\s*[\.\)\-–:]\s*/i, "")
    .replace(/^(?:sáng|sang|am|morning|tối|toi|pm|evening)\s*[:\-–]\s*/i, "")
    .trim();
}

/**
 * Very light-touch category inference. Returns `"other"` when nothing matches
 * so the user can pick a better category in the routine editor — we never
 * pretend to be smarter than the source text.
 */
export function inferCategory(line: string): RoutineCategory {
  const low = line.toLowerCase();
  for (const cat of ROUTINE_CATEGORIES) {
    if (cat === "other") continue;
    const kws = CATEGORY_KEYWORDS[cat];
    for (const kw of kws) {
      if (kw && low.includes(kw)) return cat;
    }
  }
  return "other";
}

/**
 * Convert a list of coach hint lines into routine steps. Empty lines are
 * dropped; whitespace is normalised; and each step gets a fresh local id so
 * the editor's React keys stay stable.
 */
export function buildStepsFromHints(lines: string[] | undefined): RoutineStepDTO[] {
  if (!lines?.length) return [];
  const seen = new Set<string>();
  const out: RoutineStepDTO[] = [];
  for (const raw of lines) {
    const title = stripPrefix(raw);
    if (!title) continue;
    // Avoid duplicate titles (the coach occasionally repeats AM/PM advice).
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: localId(),
      title,
      category: inferCategory(title),
      completed: false,
    });
  }
  return out;
}

/**
 * Stable token derived from a hint payload. Used by the bridge component to
 * detect when the coach has produced the same suggestion the user already
 * applied, so we can hide the "Apply" CTA after a successful apply.
 */
export function suggestionToken(morning: string[], evening: string[]): string {
  const norm = (xs: string[]) =>
    xs
      .map((s) => stripPrefix(s).toLowerCase())
      .filter(Boolean)
      .join("\n");
  return `am:${norm(morning)}|pm:${norm(evening)}`;
}
