/**
 * Pure clipboard builders for /share/skin-review/[slug].
 * Frame templates live in messages/{vi,en}.json; overview body stays as AI returned.
 */

import en from "../messages/en.json";
import vi from "../messages/vi.json";

export type SkinReviewShareLocale = "vi" | "en";
/** @deprecated Prefer SkinReviewShareVariant */
export type SkinReviewShareCopyMode = SkinReviewShareVariant;
export type SkinReviewShareVariant = "short" | "full" | "link";

export const DEFAULT_SHARE_VARIANT: SkinReviewShareVariant = "short";
export const SHORT_OVERVIEW_MAX = 100;
export const FULL_OVERVIEW_MAX = 160;

const SKIN_TYPE_KEYS = [
  "oily",
  "dry",
  "combination",
  "normal",
  "sensitive",
  "unclear",
] as const;

const SEVERITY_KEYS = ["mild", "moderate", "pronounced"] as const;

export type BuildSkinReviewShareClipboardInput = {
  overview: string;
  link: string;
  /**
   * Skin type enum key (oily|dry|combination|…).
   * Used only for full variant soft hint — never in short.
   */
  skinType?: string;
  /** Severity enum key (mild|moderate|pronounced) — softens the full hint. */
  skinTypeSeverity?: string;
  locale: SkinReviewShareLocale;
  /** Default: short */
  variant?: SkinReviewShareVariant;
  /** @deprecated Use `variant` */
  mode?: SkinReviewShareVariant;
  /** Override overview max (defaults: short 100, full 160). */
  overviewMax?: number;
};

type ShareTemplates = {
  commentTemplateFull: string;
  commentTemplateShort: string;
  commentTemplateWithSkinType: string;
  skinTypeHint: string;
  skinTypeHintLabels: Record<string, string>;
  skinTypeHintSeverities: Record<string, string>;
};

const TEMPLATES: Record<SkinReviewShareLocale, ShareTemplates> = {
  vi: vi.skinReviewShare as ShareTemplates,
  en: en.skinReviewShare as ShareTemplates,
};

/**
 * Collapse overview for FB comment.
 * When truncated, result length including "…" is ≤ max.
 */
export function truncateOverview(raw: string, max = SHORT_OVERVIEW_MAX): string {
  const text = raw.trim().replace(/\s+/g, " ");
  if (!text) return "";
  if (text.length <= max) return text;
  const budget = Math.max(1, max - 1); // room for …
  const slice = text.slice(0, budget);
  const breakAt = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? "),
    slice.lastIndexOf("…"),
    slice.lastIndexOf(" "),
  );
  const cut = breakAt > 32 ? slice.slice(0, breakAt) : slice;
  return `${cut.trimEnd().replace(/[,;:\-–—]$/, "")}…`;
}

function fillTemplate(
  template: string,
  vars: { overview: string; link: string; skinTypeHint: string },
): string {
  return template
    .replaceAll("{overview}", vars.overview)
    .replaceAll("{link}", vars.link)
    .replaceAll("{skinTypeHint}", vars.skinTypeHint)
    .replaceAll("{skinType}", vars.skinTypeHint);
}

/** Soft line e.g. VI: "Trông nghi da hỗn hợp nhẹ." — empty if no usable type. */
export function buildSoftSkinTypeHint(
  locale: SkinReviewShareLocale,
  skinTypeKey?: string,
  severityKey?: string,
): string {
  const key = skinTypeKey?.trim().toLowerCase() ?? "";
  if (!key || !(SKIN_TYPE_KEYS as readonly string[]).includes(key)) return "";

  const templates = TEMPLATES[locale === "en" ? "en" : "vi"];
  const label = templates.skinTypeHintLabels[key];
  if (!label) return "";

  const sev = severityKey?.trim().toLowerCase() ?? "";
  const sevLabel =
    sev && (SEVERITY_KEYS as readonly string[]).includes(sev)
      ? templates.skinTypeHintSeverities[sev]
      : "";

  const skinType =
    locale === "en"
      ? [sevLabel, label].filter(Boolean).join(" ")
      : [label, sevLabel].filter(Boolean).join(" ");

  return templates.skinTypeHint.replaceAll("{skinType}", skinType);
}

/**
 * Build the exact string written to the clipboard / passed to navigator.share.
 * Default variant is short.
 */
export function buildSkinReviewShareClipboard(
  input: BuildSkinReviewShareClipboardInput,
): string {
  const variant = input.variant ?? input.mode ?? DEFAULT_SHARE_VARIANT;
  const link = input.link.trim();
  if (variant === "link") return link;

  const locale: SkinReviewShareLocale =
    input.locale === "en" ? "en" : "vi";
  const templates = TEMPLATES[locale];
  const defaultMax =
    variant === "short" ? SHORT_OVERVIEW_MAX : FULL_OVERVIEW_MAX;
  const overview = truncateOverview(
    input.overview,
    input.overviewMax ?? defaultMax,
  );

  if (variant === "short") {
    return fillTemplate(templates.commentTemplateShort, {
      overview,
      link,
      skinTypeHint: "",
    });
  }

  // full — optional soft skin-type line; overview stays AI original language
  const skinTypeHint = buildSoftSkinTypeHint(
    locale,
    input.skinType,
    input.skinTypeSeverity,
  );
  const vars = { overview, link, skinTypeHint };

  if (skinTypeHint) {
    return fillTemplate(templates.commentTemplateWithSkinType, vars);
  }
  return fillTemplate(templates.commentTemplateFull, vars);
}
