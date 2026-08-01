import type { WardrobeCategoryId } from "@/lib/cabinet/categories";

type Rule = { category: WardrobeCategoryId; patterns: RegExp[] };

/** Keyword heuristics (EN + VI) — fallback is `other`. */
const RULES: Rule[] = [
  {
    category: "spf",
    patterns: [
      /\bspf\b/i,
      /\bsunscreen\b/i,
      /\bsun cream\b/i,
      /kem chống nắng/i,
      /chong nang/i,
    ],
  },
  {
    category: "cleanser",
    patterns: [/\bcleanser\b/i, /\bcleansing\b/i, /sữa rửa mặt/i, /rua mat/i, /làm sạch/i],
  },
  {
    category: "toner",
    patterns: [/\btoner\b/i, /\bessence\b/i, /nước hoa hồng/i],
  },
  {
    category: "serum",
    patterns: [/\bserum\b/i, /\bampoule\b/i, /\bniacinamide\b/i, /\bretinol\b/i, /\bvitamin c\b/i],
  },
  {
    category: "moisturizer",
    patterns: [
      /\bmoisturizer\b/i,
      /\bmoisturiser\b/i,
      /\bcream\b/i,
      /\blotion\b/i,
      /kem dưỡng/i,
      /duong am/i,
      /hydration/i,
    ],
  },
  {
    category: "treatment",
    patterns: [/\btreatment\b/i, /\bbha\b/i, /\baha\b/i, /\bpha\b/i, /\bactives?\b/i, /điều trị/i],
  },
  {
    category: "mask",
    patterns: [/\bmask\b/i, /mặt nạ/i, /mat na/i],
  },
];

export function guessWardrobeCategory(text: string): WardrobeCategoryId {
  const raw = text.trim();
  if (!raw) return "other";
  for (const rule of RULES) {
    if (rule.patterns.some((re) => re.test(raw))) {
      return rule.category;
    }
  }
  return "other";
}
