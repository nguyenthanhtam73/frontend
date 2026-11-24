import { guessWardrobeCategory } from "@/lib/cabinet/guess-category";
import { parseOnboardingSnapshot } from "@/lib/onboarding/snapshot";
import type { OnboardingSkinAnalyzeDTO } from "@/lib/types/onboarding-ai";
import type { SkinProfileResponse } from "@/lib/types/profile";
import type { CoachZoneNoteDTO, SkinCoachDetailDTO } from "@/lib/types/skin-check";

import type {
  AffiliateConcern,
  AffiliateMatchInput,
  AffiliateSkinType,
  AffiliateStep,
} from "./types";

const SKIN_TYPES: Record<string, AffiliateSkinType> = {
  dry: "dry",
  oily: "oily",
  combo: "combination",
  combination: "combination",
  normal: "normal",
  sensitive: "sensitive",
  "da khô": "dry",
  "da kho": "dry",
  "da dầu": "oily",
  "da dau": "oily",
  "da thường": "normal",
  "da thuong": "normal",
  "da hỗn hợp": "combination",
  "da hon hop": "combination",
  "da nhạy cảm": "sensitive",
  "da nhay cam": "sensitive",
};

/**
 * Direct “go see a dermatologist” wording, including the backend phrase
 * “đến gặp bác sĩ da liễu”. `\b` is ASCII-only, so these patterns do not use it.
 */
const DIRECT_VISIT: RegExp[] = [
  /(đến|đi)\s*(gặp|khám)\s*(bác sĩ|da liễu)/iu,
  /khám\s+da\s+liễu/iu,
  /khám\s+bác\s+sĩ(?:\s+da\s+liễu)?/iu,
  /nên\s+(?:đến\s+)?gặp\s+bác\s+sĩ/iu,
  /cần\s+(?:đến\s+)?gặp\s+bác\s+sĩ/iu,
  /hãy\s+(?:đến\s+)?gặp\s+(?:bác sĩ|chuyên gia)/iu,
  /nhờ\s+bác\s+sĩ\s+da/iu,
];

/** Whitespace or start/end. “khi” must not match inside “khiến”. */
const CONDITIONAL_WORD = /(?:^|\s)(?:if|khi|nếu)(?:\s|$)/iu;

const CLINICAL_SYMPTOM = /sưng|sung|mủ|sốt|sot|chảy\s*dịch|chay\s*dich/iu;
const CLINICAL_ZONE = /mụn|mun|mủ|sưng|sung/iu;

export type AffiliateCheckSignals = {
  conditions?: string[];
  symptoms?: string[];
  coach?: Pick<
    SkinCoachDetailDTO,
    "medical_disclaimer" | "safety_reminders" | "situation_summary" | "zone_notes" | "care_phase"
  > | null;
};

export type AffiliateShelfProduct = {
  name?: string;
  brand?: string;
  category?: string;
};

function fold(value: string): string {
  return value.normalize("NFC").trim().toLocaleLowerCase("vi");
}

/** Legacy dense/severe tokens. The live coach only sends mild | moderate | pronounced. */
export function isSevereLevel(value: string | null | undefined): boolean {
  const key = fold(value ?? "");
  return key === "dense" || key === "severe" || key === "nặng" || key === "nang";
}

function symptomNeedsClinician(raw: string | null | undefined): boolean {
  return CLINICAL_SYMPTOM.test(raw ?? "");
}

/**
 * Pronounced (“Khá rõ”) is only a referral when the note itself mentions
 * acne, pus, or swelling. A plain “Khá rõ.” is not.
 */
export function zoneNoteNeedsClinician(note: Pick<CoachZoneNoteDTO, "severity" | "note">): boolean {
  if (isSevereLevel(note.severity)) return true;
  if (fold(note.severity ?? "") !== "pronounced") return false;
  return CLINICAL_ZONE.test(note.note ?? "");
}

/**
 * True when this text tells the person to see a dermatologist for the current result.
 * The standing "does not replace a doctor" line, and "see a doctor if it burns", are not referrals.
 */
export function textAdvisesDermatologist(text: string | null | undefined): boolean {
  const value = text?.normalize("NFC").trim() ?? "";
  if (!value) return false;
  const direct = DIRECT_VISIT.some((pattern) => pattern.test(value));
  const generic =
    /không thay thế|không thay cho|not a substitute|does not replace|reference only|chỉ là gợi ý/iu.test(
      value,
    );
  if (generic && !direct) return false;
  if (CONDITIONAL_WORD.test(value) && !direct) return false;
  if (direct) return true;
  if (/see\s+a\s+(doctor|dermatologist|clinician)/iu.test(value)) return true;
  return /seek\s+medical\s+(care|advice|attention)/iu.test(value);
}

export function isCurrentCheckSevere(
  check: Pick<AffiliateCheckSignals, "coach" | "symptoms"> | null | undefined,
): boolean {
  if ((check?.symptoms ?? []).some((symptom) => symptomNeedsClinician(symptom))) return true;
  const coach = check?.coach;
  if (!coach) return false;
  if ((coach.zone_notes ?? []).some((note) => zoneNoteNeedsClinician(note))) return true;
  if (textAdvisesDermatologist(coach.medical_disclaimer)) return true;
  if (textAdvisesDermatologist(coach.situation_summary)) return true;
  return (coach.safety_reminders ?? []).some((line) => textAdvisesDermatologist(line));
}

function analysisOf(profile: SkinProfileResponse | null | undefined): OnboardingSkinAnalyzeDTO | null {
  const snap = parseOnboardingSnapshot(profile?.onboarding_snapshot);
  const analysis = snap?.skin_analysis;
  if (!analysis || typeof analysis !== "object") return null;
  return analysis as OnboardingSkinAnalyzeDTO;
}

/** Onboarding severity when the cabinet has no fresh skin-check in hand. */
export function isOnboardingSevere(profile: SkinProfileResponse | null | undefined): boolean {
  const analysis = analysisOf(profile);
  if (!analysis) return false;
  if (isSevereLevel(typeof analysis.severity_level === "string" ? analysis.severity_level : null)) {
    return true;
  }
  if (textAdvisesDermatologist(analysis.coaching_notes)) return true;
  if (textAdvisesDermatologist(analysis.summary)) return true;
  return false;
}

function absorbSkinText(target: Set<AffiliateSkinType>, raw: string | null | undefined) {
  const text = fold(raw ?? "");
  if (!text || text === "prefer_not" || text === "unclear") return;
  const exact = SKIN_TYPES[text];
  if (exact) {
    target.add(exact);
    return;
  }
  if (/hỗn hợp|hon hop|combination|\bcombo\b/iu.test(text)) target.add("combination");
  if (/da dầu|da dau|\boily\b|oiliness/iu.test(text)) target.add("oily");
  if (/da khô|da kho|\bdry\b/iu.test(text)) target.add("dry");
  if (/da thường|da thuong|\bnormal\b/iu.test(text)) target.add("normal");
  if (/nhạy cảm|nhay cam|\bsensitive\b/iu.test(text)) target.add("sensitive");
}

function absorbConcern(target: Set<AffiliateConcern>, raw: string | null | undefined) {
  const text = fold(raw ?? "");
  if (!text) return;
  if (/^(none|no|không|khong|clear|not visible|absent)\b/iu.test(text)) return;
  if (/\bno acne\b|không có mụn|không mụn|khong mun/iu.test(text)) return;
  if (/post_acne|pih|thâm|tham|pigment|hyperpigmentation|nám|\bnam\b|dull|dark spot|dark_spot/iu.test(text)) {
    target.add("dark_spots");
  }
  if (/pore|lỗ chân lông|lo chan long|clogged_pores|large_pores/iu.test(text)) target.add("pores");
  if (
    /acne|mụn|mun|breakout|comedone|blemish/iu.test(text) &&
    !/post_acne|pih|thâm|tham|mark/iu.test(text)
  ) {
    target.add("acne");
  }
  if (/dry|khô|dehydr|thiếu ẩm|thieu am|dryness/iu.test(text)) {
    target.add("dryness");
    target.add("hydration");
  }
  if (/oily|oiliness|\boil\b|da dầu|đổ dầu/iu.test(text)) target.add("oil");
  if (/redness|inflammation|\bred\b|đỏ|kích ứng|kich ung|sensitive|nhạy|itch|sting/iu.test(text)) {
    target.add("redness");
  }
  if (/barrier|hàng rào|hang rao|weak_barrier|phục hồi|phuc hoi/iu.test(text)) target.add("barrier");
}

export function ownedAffiliateSteps(products: readonly AffiliateShelfProduct[]): AffiliateStep[] {
  const out = new Set<AffiliateStep>();
  for (const product of products) {
    const category = (product.category ?? "").trim().toLowerCase();
    const blob = `${product.name ?? ""} ${product.brand ?? ""}`;
    const guessed = guessWardrobeCategory(`${category} ${blob}`);
    if (category === "cleanser" || guessed === "cleanser") out.add("cleanser");
    if (category === "serum" || guessed === "serum") out.add("serum");
    if (category === "moisturizer" || guessed === "moisturizer") out.add("moisturizer");
    if (category === "spf" || category === "sunscreen" || guessed === "spf") out.add("sunscreen");
    if (category === "makeup_remover" || /tẩy trang|tay trang|micellar|makeup remover/iu.test(blob)) {
      out.add("makeup_remover");
    }
    if (/khăn mặt|khan mat|cotton pad|khăn khô|khan kho/iu.test(blob)) out.add("support");
  }
  return [...out];
}

/** YYYY-MM-DD in Vietnam, so the same person sees the same picks all day. */
export function vietnamDayKey(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function stringsOf(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

/**
 * Latest skin-check wins for skin type and for the severe flag when a check is in hand.
 * Concerns fall back to the onboarding analysis and profile when the check did not name any.
 * Cabinet categories are skipped only after the wardrobe request has succeeded.
 */
export function buildAffiliateMatchInput(opts: {
  userId?: string | null;
  dayKey?: string;
  check?: AffiliateCheckSignals | null;
  profile?: SkinProfileResponse | null;
  products?: readonly AffiliateShelfProduct[];
  cabinetKnown: boolean;
}): AffiliateMatchInput {
  const analysis = analysisOf(opts.profile);
  const snap = parseOnboardingSnapshot(opts.profile?.onboarding_snapshot);
  const fromCheck = new Set<AffiliateSkinType>();
  for (const condition of opts.check?.conditions ?? []) absorbSkinText(fromCheck, condition);
  const fromProfile = new Set<AffiliateSkinType>();
  absorbSkinText(fromProfile, opts.profile?.skin_type);
  absorbSkinText(fromProfile, snap?.skin_type);
  absorbSkinText(fromProfile, analysis?.skin_type_guess);
  absorbSkinText(fromProfile, analysis?.skin_observations?.overall_skin_type);

  const checkConcerns = new Set<AffiliateConcern>();
  for (const condition of opts.check?.conditions ?? []) absorbConcern(checkConcerns, condition);
  for (const symptom of opts.check?.symptoms ?? []) absorbConcern(checkConcerns, symptom);

  const profileConcerns = new Set<AffiliateConcern>();
  for (const concern of opts.profile?.concerns ?? []) absorbConcern(profileConcerns, concern);
  for (const concern of snap?.body_concerns ?? []) absorbConcern(profileConcerns, concern);
  for (const concern of stringsOf(analysis?.concerns)) absorbConcern(profileConcerns, concern);
  for (const concern of stringsOf(analysis?.main_concerns)) absorbConcern(profileConcerns, concern);
  for (const concern of stringsOf(analysis?.concern_types)) absorbConcern(profileConcerns, concern);
  const observations = analysis?.skin_observations;
  if (observations) {
    absorbConcern(profileConcerns, observations.acne_status);
    absorbConcern(profileConcerns, observations.oiliness_level);
    absorbConcern(profileConcerns, observations.pigmentation);
    absorbConcern(profileConcerns, observations.redness);
    absorbConcern(profileConcerns, observations.pore_size);
  }

  const concerns = checkConcerns.size > 0 ? checkConcerns : profileConcerns;
  const skinTypes = fromCheck.size > 0 ? fromCheck : fromProfile;
  const carePhase = opts.check
    ? opts.check.coach?.care_phase
    : typeof analysis?.phase === "string"
      ? analysis.phase
      : undefined;
  const avoidAcid =
    fold(carePhase ?? "") === "calm_first" ||
    skinTypes.has("sensitive") ||
    concerns.has("redness");

  return {
    userId: opts.userId?.trim() || "guest",
    dayKey: opts.dayKey ?? vietnamDayKey(),
    skinTypes: [...skinTypes],
    concerns: [...concerns],
    ownedSteps: opts.cabinetKnown ? ownedAffiliateSteps(opts.products ?? []) : [],
    severe: opts.check ? isCurrentCheckSevere(opts.check) : isOnboardingSevere(opts.profile),
    avoidAcid,
    cabinetKnown: opts.cabinetKnown,
  };
}
