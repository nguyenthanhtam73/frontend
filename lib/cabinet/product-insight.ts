/** Locked card from POST /api/v1/wardrobe/products/:id/insight and GET /api/v1/wardrobe. */
export type WardrobeInsightFitVerdict = "yes" | "maybe" | "no";
/** Machine tokens. "chưa biết" matches backend WardrobeBuyUnknown. */
export type WardrobeInsightBuyAdvice = "nên mua" | "chưa nên" | "chưa biết";

/**
 * How to talk about a product that is already in the cabinet.
 * "nên mua" → keep using, "chưa nên" → pause, "chưa biết" → not enough skin info.
 */
export type OwnedInsightUse = "keep" | "pause" | "unknown";

/**
 * Prod cards saved before the explicit unknown token. Backend sets
 * advice "chưa nên" and this exact why when the profile has no skin info.
 */
export const LEGACY_UNKNOWN_BUY_WHY = "Chưa đủ thông tin da để biết có nên dùng tiếp.";

export type WardrobeInsightActive = {
  name: string;
  gloss: string;
};

export type WardrobeProductInsight = {
  what_it_does: string;
  fit: { verdict: WardrobeInsightFitVerdict; reason: string };
  buy: { advice: string; why: string };
  actives?: WardrobeInsightActive[];
  disclaimer: string;
};

/** Server-set line. Shown when a stored card omits `disclaimer`. */
export const WARDROBE_INSIGHT_DISCLAIMER = "không thay bác sĩ da liễu";

const MAX_ACTIVES = 5;

/**
 * Cabinet rows are products the user already owns. Never surface the raw
 * purchase verdict — map it to keep, pause, or not-enough-info.
 * An empty or unrecognized token does not throw; it stays unknown.
 */
export function ownedInsightUse(advice: string, why = ""): OwnedInsightUse {
  const token = advice.trim();
  if (token === "nên mua") return "keep";
  if (token === "chưa biết") return "unknown";
  if (token === "chưa nên") {
    return why.trim() === LEGACY_UNKNOWN_BUY_WHY ? "unknown" : "pause";
  }
  return "unknown";
}

function asRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

function asText(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

/** A name that already closes with punctuation should not gain another mark. */
const ACTIVE_NAME_ENDS_WITH_PUNCTUATION = /[.,:;!?…。：；！？、]$/u;

/** Name stays in the bold span; `mark` is the colon, `gloss` includes its leading space. */
export function activeLineParts(
  name: string,
  gloss?: string | null,
): { name: string; mark: ":" | ""; gloss: string } {
  const ingredient = name.trim();
  const explanation = (gloss ?? "").trim();
  if (!ingredient) return { name: "", mark: "", gloss: explanation };
  if (!explanation) return { name: ingredient, mark: "", gloss: "" };
  if (ACTIVE_NAME_ENDS_WITH_PUNCTUATION.test(ingredient)) {
    return { name: ingredient, mark: "", gloss: ` ${explanation}` };
  }
  return { name: ingredient, mark: ":", gloss: ` ${explanation}` };
}

export function formatActiveLine(name: string, gloss?: string | null): string {
  const parts = activeLineParts(name, gloss);
  return `${parts.name}${parts.mark}${parts.gloss}`;
}

function readActives(raw: unknown): { name: string; gloss: string }[] {
  if (!Array.isArray(raw)) return [];
  const out: { name: string; gloss: string }[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const row = asRecord(item);
    if (!row) continue;
    const name = asText(row.name);
    const gloss = asText(row.gloss);
    if (!name || !gloss) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, gloss });
    if (out.length === MAX_ACTIVES) break;
  }
  return out;
}

/**
 * Read `WardrobeProduct.insight` from GET /api/v1/wardrobe.
 * Returns null unless the locked fields are present. Does not coerce the
 * retired client shape (`fit_for_you`, `buy`/`wait`, `{label, plain}`).
 */
export function parseWardrobeProductInsight(raw: unknown): WardrobeProductInsight | null {
  const row = asRecord(raw);
  if (!row) return null;

  const what_it_does = asText(row.what_it_does);
  const fit = asRecord(row.fit);
  const buy = asRecord(row.buy);
  const reason = asText(fit?.reason);
  const why = asText(buy?.why);
  const verdict = fit?.verdict;
  const advice = asText(buy?.advice);
  if (!what_it_does || !reason || !why || !advice) return null;
  if (verdict !== "yes" && verdict !== "maybe" && verdict !== "no") return null;

  const actives = readActives(row.actives);
  const disclaimer = asText(row.disclaimer) || WARDROBE_INSIGHT_DISCLAIMER;
  const card: WardrobeProductInsight = {
    what_it_does,
    fit: { verdict, reason },
    buy: { advice, why },
    disclaimer,
  };
  if (actives.length > 0) card.actives = actives;
  return card;
}
