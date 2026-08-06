/**
 * Clipboard builders for /share/skin-review/[slug].
 * Frame strings live in messages/{vi,en}.json; body is generated from analysis.
 */

import en from "../messages/en.json";
import vi from "../messages/vi.json";
import type { AdminSkinReviewAnalysis } from "./types/admin-skin-review";

export type SkinReviewShareLocale = "vi" | "en";
/** @deprecated Prefer SkinReviewShareVariant */
export type SkinReviewShareCopyMode = SkinReviewShareVariant;
/**
 * Clipboard variants for FB-friendly share.
 * Default is short_no_link (many groups block URLs in comments).
 */
export type SkinReviewShareVariant =
  | "short_no_link"
  | "short_with_link"
  | "full_no_link"
  | "full_with_link"
  | "link"
  /** @deprecated → short_no_link */
  | "short"
  /** @deprecated → full_with_link */
  | "full";

export type ResolvedShareVariant =
  | "short_no_link"
  | "short_with_link"
  | "full_no_link"
  | "full_with_link"
  | "link";

export const DEFAULT_SHARE_VARIANT: ResolvedShareVariant = "short_no_link";
/** Soft caps for generated body (not opener/link/cta). */
export const SHORT_BODY_MAX = 180;
export const FULL_BODY_MAX = 280;
/** @deprecated use SHORT_BODY_MAX — kept for older print scripts */
export const SHORT_OVERVIEW_MAX = SHORT_BODY_MAX;
/** @deprecated use FULL_OVERVIEW_MAX */
export const FULL_OVERVIEW_MAX = FULL_BODY_MAX;

/** Normalize legacy short/full aliases. */
export function normalizeShareVariant(
  variant?: SkinReviewShareVariant | null,
): ResolvedShareVariant {
  if (!variant || variant === "short") return "short_no_link";
  if (variant === "full") return "full_with_link";
  return variant;
}

export function shareVariantIncludesLink(
  variant: ResolvedShareVariant,
): boolean {
  return variant === "short_with_link" || variant === "full_with_link";
}

export function shareVariantIsFull(variant: ResolvedShareVariant): boolean {
  return variant === "full_no_link" || variant === "full_with_link";
}

const SKIN_TYPE_KEYS = [
  "oily",
  "dry",
  "combination",
  "normal",
  "sensitive",
  "unclear",
] as const;

const SEVERITY_KEYS = ["mild", "moderate", "pronounced"] as const;

const SEVERITY_RANK: Record<string, number> = {
  pronounced: 3,
  moderate: 2,
  mild: 1,
};

export type BuildSkinReviewShareClipboardInput = {
  link: string;
  locale: SkinReviewShareLocale;
  /** Full analysis — preferred source for body. */
  analysis?: Partial<AdminSkinReviewAnalysis> | null;
  /**
   * @deprecated Fallback when analysis is missing — treated as overview-only body.
   */
  overview?: string;
  /** Public FB question (optional). */
  userQuestion?: string;
  /** Public admin/AI answer (optional) — emphasized in clipboard. */
  answer?: string;
  /** Skin type enum — full variant soft hint only. */
  skinType?: string;
  skinTypeSeverity?: string;
  /** Default: short_no_link (no URL — FB group friendly). */
  variant?: SkinReviewShareVariant;
  /** @deprecated Use `variant` */
  mode?: SkinReviewShareVariant;
  bodyMax?: number;
};

type ShareTemplates = {
  opener: string;
  linkLine: string;
  /** Shared CTA for all comment variants (no URL). */
  cta: string;
  /** @deprecated Aliases of `cta` — kept for older JSON / callers */
  ctaCheckin?: string;
  ctaStreak?: string;
  ctaCoach?: string;
  ctaDefault?: string;
  fieldUserQuestion?: string;
  fieldAnswer?: string;
  skinTypeHint: string;
  /** Used when type is unclear / unknown — no severity. */
  skinTypeHintUnclear: string;
  skinTypeHintLabels: Record<string, string>;
  skinTypeHintSeverities: Record<string, string>;
  regionWords: Record<string, string>;
  concernWords: Record<string, string>;
  missingRegionsHint: string;
  /** Legacy keys kept so old JSON still type-checks during migrate */
  commentTemplateShort?: string;
  commentTemplateFull?: string;
  commentTemplateWithSkinType?: string;
};

const TEMPLATES: Record<SkinReviewShareLocale, ShareTemplates> = {
  vi: vi.skinReviewShare as ShareTemplates,
  en: en.skinReviewShare as ShareTemplates,
};

/**
 * Collapse text for FB comment length.
 * When truncated, result length including "…" is ≤ max.
 */
export function truncateOverview(raw: string, max = SHORT_BODY_MAX): string {
  const text = raw.trim().replace(/\s+/g, " ");
  if (!text) return "";
  if ([...text].length <= max) return text;
  const chars = [...text];
  const budget = Math.max(1, max - 1);
  const slice = chars.slice(0, budget).join("");
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

const UNCLEAR_SKIN_TYPES = new Set(["unclear", "unknown"]);

/** Soft line e.g. VI: "Trông nghi da hỗn hợp nhẹ." — empty if no usable type. */
export function buildSoftSkinTypeHint(
  locale: SkinReviewShareLocale,
  skinTypeKey?: string,
  severityKey?: string,
): string {
  const key = skinTypeKey?.trim().toLowerCase() ?? "";
  if (!key) return "";

  const templates = TEMPLATES[locale === "en" ? "en" : "vi"];

  // Unclear / unknown: fixed line, never compose with severity
  // ("chưa rõ loại nhẹ" / "mild unclear skin type").
  if (UNCLEAR_SKIN_TYPES.has(key)) {
    return templates.skinTypeHintUnclear.trim();
  }

  if (!(SKIN_TYPE_KEYS as readonly string[]).includes(key)) return "";

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

function word(
  map: Record<string, string>,
  key: string,
  fallback?: string,
): string {
  const k = key.trim().toLowerCase();
  return map[k] || fallback || k;
}

function isProblemConcern(concern: string): boolean {
  const c = concern.trim().toLowerCase();
  return !!c && c !== "none" && c !== "not_visible" && c !== "clear";
}

function isNotVisible(concern: string): boolean {
  return concern.trim().toLowerCase() === "not_visible";
}

/** Pull light cues from a note without pasting the whole AI paragraph. */
function extractCues(
  note: string,
  concernKey: string,
  locale: SkinReviewShareLocale,
): string[] {
  const n = note.toLowerCase();
  const concern = concernKey.toLowerCase();
  const cues: string[] = [];
  if (locale === "vi") {
    const count = note.match(/khoảng\s+(\d+\s*[-–]\s*\d+|\d+)/i);
    if (count) cues.push(`khoảng ${count[1].replace(/\s+/g, "")}`);
    else if (/cụm/.test(n)) cues.push("thành cụm");
    else if (/rải/.test(n)) cues.push("rải");
    if (/đầu trắng|có mũ/.test(n)) cues.push("có chỗ đầu trắng");
    // Avoid repeating shine when concern is already oiliness
    if (/bóng/.test(n) && concern !== "oiliness") cues.push("hơi bóng");
    if (/thâm|đốm nâu/.test(n) && !["pigmentation", "dark_spots"].includes(concern))
      cues.push("có thâm");
  } else {
    const count = note.match(/(?:about|around)?\s*(\d+\s*[-–]\s*\d+|\d+)/i);
    if (count) cues.push(`about ${count[1].replace(/\s+/g, "")}`);
    else if (/cluster/.test(n)) cues.push("in a cluster");
    else if (/scatter/.test(n)) cues.push("scattered");
    if (/whitehead|white head/.test(n)) cues.push("some whiteheads");
    if (/shin|oil/.test(n) && concern !== "oiliness") cues.push("a bit shiny");
  }
  return cues.slice(0, 2);
}

function buildRegionClause(
  regionKey: string,
  concernKey: string,
  note: string,
  locale: SkinReviewShareLocale,
  templates: ShareTemplates,
): string {
  const region = word(templates.regionWords, regionKey, regionKey);
  const concern = word(templates.concernWords, concernKey, concernKey);
  const cues = extractCues(note, concernKey, locale);
  const noteLow = note.toLowerCase();
  const c = concernKey.toLowerCase();
  if (locale === "vi") {
    if (c === "oiliness") {
      return `${region} hơi bóng`;
    }
    const intens =
      /nhiều|dày|cụm|rải/.test(noteLow) || /\d/.test(noteLow)
        ? "đang nổi khá nhiều"
        : "đang có";
    const cueBit = cues.length ? `, ${cues.join(", ")}` : "";
    return `${region} ${intens} ${concern}${cueBit}`;
  }
  if (c === "oiliness") {
    return `${region} looks a bit shiny`;
  }
  const verb = /many|cluster|scattered|dense|\d/.test(noteLow)
    ? regionKey.toLowerCase() === "cheeks"
      ? "have quite a few"
      : "has quite a few"
    : "shows";
  const cueBit = cues.length ? ` (${cues.join(", ")})` : "";
  return `${region} ${verb} ${concern}${cueBit}`;
}

/**
 * Generate 1–3 human body sentences from analysis (or overview fallback).
 */
export function buildShareBodyFromAnalysis(
  analysis: Partial<AdminSkinReviewAnalysis> | null | undefined,
  locale: SkinReviewShareLocale,
  variant: "short" | "full",
  overviewFallback = "",
): string {
  const templates = TEMPLATES[locale === "en" ? "en" : "vi"];
  const areas = analysis?.attention_areas ?? [];

  const problems = areas
    .filter((a) => isProblemConcern(a.concern ?? ""))
    .sort(
      (a, b) =>
        (SEVERITY_RANK[b.severity?.toLowerCase() ?? ""] ?? 0) -
        (SEVERITY_RANK[a.severity?.toLowerCase() ?? ""] ?? 0),
    );

  const missing = areas
    .filter((a) => isNotVisible(a.concern ?? ""))
    .map((a) => word(templates.regionWords, a.region, a.region))
    .filter(Boolean);

  const parts: string[] = [];

  if (problems.length > 0) {
    const take = variant === "short" ? Math.min(2, problems.length) : Math.min(3, problems.length);
    const clauses = problems
      .slice(0, take)
      .map((a) =>
        buildRegionClause(a.region, a.concern, a.note ?? "", locale, templates),
      );
    const joined =
      clauses.length === 1
        ? `${clauses[0]}.`
        : clauses.length === 2
          ? `${clauses[0]}; ${clauses[1]}.`
          : `${clauses[0]}; ${clauses[1]}; ${clauses[2]}.`;
    parts.push(capitalize(joined));
  } else if (overviewFallback.trim()) {
    // Soft paraphrase: first 1–2 sentences of overview
    const sentences = overviewFallback
      .trim()
      .split(/(?<=[.!?…])\s+/)
      .filter(Boolean);
    parts.push(sentences.slice(0, variant === "short" ? 1 : 2).join(" "));
  } else if (analysis?.overview?.trim()) {
    const sentences = analysis.overview
      .trim()
      .split(/(?<=[.!?…])\s+/)
      .filter(Boolean);
    parts.push(sentences.slice(0, variant === "short" ? 1 : 2).join(" "));
  }

  // Optional short missing-regions hint (only when photo is clearly partial)
  if (
    missing.length >= 2 &&
    problems.length > 0 &&
    problems.length <= 2 &&
    missing.length >= areas.length - problems.length
  ) {
    const list =
      locale === "vi"
        ? missing.slice(0, 3).join("/")
        : missing
            .slice(0, 3)
            .map((r) => r.replace(/^the\s+/i, ""))
            .join("/");
    parts.push(
      capitalize(templates.missingRegionsHint.replaceAll("{regions}", list)),
    );
  }

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Build the exact string written to the clipboard / passed to navigator.share.
 * Default variant is short_no_link (opener + body + CTA, no URL).
 */
export function buildSkinReviewShareClipboard(
  input: BuildSkinReviewShareClipboardInput,
): string {
  const variant = normalizeShareVariant(
    input.variant ?? input.mode ?? DEFAULT_SHARE_VARIANT,
  );
  const link = input.link.trim();
  if (variant === "link") return link;

  const locale: SkinReviewShareLocale =
    input.locale === "en" ? "en" : "vi";
  const templates = TEMPLATES[locale];

  const analysis = input.analysis ?? null;
  const skinType = input.skinType ?? analysis?.skin_type;
  const skinTypeSeverity =
    input.skinTypeSeverity ?? analysis?.skin_type_severity;

  const bodyKind = shareVariantIsFull(variant) ? "full" : "short";
  const bodyRaw = buildShareBodyFromAnalysis(
    analysis,
    locale,
    bodyKind,
    input.overview ?? "",
  );
  const defaultMax =
    bodyKind === "short" ? SHORT_BODY_MAX : FULL_BODY_MAX;
  // When a reply is present, shrink analysis body so the answer stays the hero.
  const hasQa = Boolean(input.answer?.trim());
  const bodyMax = input.bodyMax ?? (hasQa ? Math.min(defaultMax, 120) : defaultMax);
  const body = truncateOverview(bodyRaw, bodyMax);

  const cta =
    templates.cta ||
    templates.ctaCheckin ||
    templates.ctaDefault ||
    "";

  const lines: string[] = [templates.opener];
  const qaLines = formatShareQaBlock(
    templates,
    input.userQuestion,
    input.answer,
    bodyKind,
  );
  if (qaLines) lines.push(qaLines);
  if (body) lines.push(body);

  if (shareVariantIsFull(variant)) {
    const hint = buildSoftSkinTypeHint(locale, skinType, skinTypeSeverity);
    if (hint) lines.push(hint);
    const causeLine = formatShareCauses(analysis?.possible_causes, locale, 2);
    if (causeLine) lines.push(causeLine);
  }

  const linkLine =
    shareVariantIncludesLink(variant) && link
      ? templates.linkLine.replaceAll("{link}", link)
      : "";

  // Tips after observations / before CTA. Short variants: 1–2 very short tips if room.
  // Budget includes linkLine for short_with_link so URL doesn't push past soft cap.
  const tipBudget =
    bodyKind === "short" ? Math.min(2, SHORT_TIP_BUDGET) : FULL_TIP_BUDGET;
  const tipsLine = formatShareTips(analysis?.soothing_tips, locale, tipBudget);
  if (tipsLine) {
    const used = [...lines, tipsLine, linkLine, cta].filter(Boolean).join("\n");
    if (bodyKind === "full" || [...used].length <= SHORT_CLIP_SOFT_MAX) {
      lines.push(tipsLine);
    }
  }

  if (linkLine) lines.push(linkLine);
  if (cta) lines.push(cta);

  return lines.join("\n");
}

const SHORT_TIP_BUDGET = 2;
const FULL_TIP_BUDGET = 3;
/** Soft cap for short clipboard total (opener+body+tips+cta+linkLine when present). */
export const SHORT_CLIP_SOFT_MAX = 420;

/** Q&A block for FB clipboard — answer truncated longer than question. */
function formatShareQaBlock(
  templates: ShareTemplates,
  userQuestion: string | undefined,
  answer: string | undefined,
  bodyKind: "short" | "full",
): string {
  const q = userQuestion?.trim().replace(/\s+/g, " ") ?? "";
  const a = answer?.trim().replace(/\s+/g, " ") ?? "";
  // Clipboard only ships Q&A when a reply exists (orphan question is incomplete).
  if (!a) return "";

  const qLabel = templates.fieldUserQuestion?.trim() || "Question";
  const aLabel = templates.fieldAnswer?.trim() || "Answer";
  const qMax = bodyKind === "full" ? 160 : 100;
  const aMax = bodyKind === "full" ? 280 : 200;
  const parts: string[] = [];
  if (q) {
    parts.push(`${qLabel}: ${truncateOverview(q, qMax)}`);
  }
  parts.push(`${aLabel}: ${truncateOverview(a, aMax)}`);
  return parts.join("\n");
}

function formatShareCauses(
  causes: string[] | undefined,
  locale: SkinReviewShareLocale,
  max: number,
): string {
  const items = (causes ?? [])
    .map((s) => s.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .slice(0, max)
    .map((s) => truncateOverview(s, 90));
  if (!items.length) return "";
  if (locale === "en") {
    return items.length === 1
      ? `Often linked to: ${uncapitalize(items[0])}`
      : `Often linked to: ${uncapitalize(items[0])}; ${uncapitalize(items[1])}`;
  }
  return items.length === 1
    ? `Hay gặp khi: ${uncapitalize(items[0])}`
    : `Hay gặp khi: ${uncapitalize(items[0])}; ${uncapitalize(items[1])}`;
}

function formatShareTips(
  tips: string[] | undefined,
  locale: SkinReviewShareLocale,
  max: number,
): string {
  const items = (tips ?? [])
    .map((s) => s.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .slice(0, max)
    .map((s) => truncateOverview(s, locale === "en" ? 70 : 64));
  if (!items.length) return "";
  const joined = items.join(locale === "en" ? " · " : " · ");
  return locale === "en" ? `Gentle tip: ${joined}` : `Gợi ý nhẹ: ${joined}`;
}

function uncapitalize(s: string): string {
  if (!s) return s;
  // Strip leading soft hedges so the joined line reads cleanly.
  const stripped = s
    .replace(/^(thường gặp khi|đôi khi liên quan|often shows up when|sometimes linked to)\s+/i, "")
    .replace(/^[:\-\s]+/, "");
  if (!stripped) return s;
  return stripped.charAt(0).toLowerCase() + stripped.slice(1);
}
