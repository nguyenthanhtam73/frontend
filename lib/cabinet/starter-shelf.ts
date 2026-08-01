import { guessWardrobeCategory } from "@/lib/cabinet/guess-category";
import { normalizeProductName } from "@/lib/cabinet/normalize-product-name";
import type { WardrobeCategoryId } from "@/lib/cabinet/categories";
import { buildLocalizedStarterLines } from "@/lib/i18n/starter-pack-lines";
import type { OnboardingState } from "@/lib/stores/onboarding-store";

/** Placeholder brand when adding from starter tips (BE requires non-empty brand). */
export const STARTER_SHELF_BRAND = "—";

export type StarterShelfCandidate = {
  /** Stable key for React + pending state. */
  id: string;
  name: string;
  brand: string;
  category: WardrobeCategoryId;
  /** Original bullet / step text for context. */
  source: string;
};

const MAX_NAME = 120;

function truncateName(raw: string): string {
  const t = raw.replace(/\s+/g, " ").trim();
  if (t.length <= MAX_NAME) return t;
  return `${t.slice(0, MAX_NAME - 1)}…`;
}

function pushUnique(out: StarterShelfCandidate[], name: string, source: string) {
  const trimmed = truncateName(name);
  if (!trimmed || trimmed.length < 2) return;
  const key = normalizeProductName(trimmed);
  if (!key) return;
  if (out.some((c) => normalizeProductName(c.name) === key)) return;
  out.push({
    id: `starter-${key.slice(0, 48)}-${out.length}`,
    name: trimmed,
    brand: STARTER_SHELF_BRAND,
    category: guessWardrobeCategory(`${trimmed} ${source}`),
    source,
  });
}

/**
 * Expand a tip that lists several product types (“cleanser + moisturizer + sunscreen”)
 * into separate shelf candidates when possible; otherwise one candidate for the whole line.
 */
function expandBullet(out: StarterShelfCandidate[], bullet: string) {
  const parts = bullet
    .split(/\s*(?:\+|\/|,|;| và | and )\s*/i)
    .map((p) => p.replace(/^[-•\s]+/, "").trim())
    .filter((p) => p.length >= 3 && p.length <= 80);

  const productLike = parts.filter((p) => guessWardrobeCategory(p) !== "other" || /\b(spf|serum|toner|mask|cream|kem)\b/i.test(p));

  if (productLike.length >= 2) {
    for (const p of productLike) {
      pushUnique(out, p, bullet);
    }
    return;
  }

  // Single product-ish fragment inside a longer tip.
  const hit = parts.find((p) => guessWardrobeCategory(p) !== "other");
  if (hit && hit.length < bullet.length * 0.7) {
    pushUnique(out, hit, bullet);
    return;
  }

  pushUnique(out, bullet, bullet);
}

/**
 * Build addable shelf candidates from onboarding starter routine steps,
 * falling back to localized coach bullets.
 */
export function buildStarterShelfCandidates(
  s: OnboardingState,
  tOnboarding: (key: string, values?: Record<string, string | number | Date>) => string,
): StarterShelfCandidate[] {
  const out: StarterShelfCandidate[] = [];

  const routine = s.starterRoutine;
  if (routine) {
    for (const step of [...routine.morning, ...routine.evening]) {
      const text = step?.trim();
      if (!text) continue;
      pushUnique(out, text, text);
    }
  }

  if (out.length === 0) {
    const bullets = buildLocalizedStarterLines(s, tOnboarding);
    for (const b of bullets) {
      expandBullet(out, b);
    }
  }

  return out.slice(0, 12);
}
