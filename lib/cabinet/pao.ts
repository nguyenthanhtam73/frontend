import { isWardrobeCategoryId, type WardrobeCategoryId } from "@/lib/cabinet/categories";
import { vietnamDateKey } from "@/lib/cabinet/local-date";

export type { WardrobeCategoryId };

/**
 * Suggested period-after-opening (months) by category — soft guidance only.
 */
export const PAO_MONTHS_BY_CATEGORY: Record<WardrobeCategoryId, { min: number; max: number }> = {
  cleanser: { min: 12, max: 12 },
  toner: { min: 6, max: 12 },
  serum: { min: 6, max: 12 },
  moisturizer: { min: 6, max: 12 },
  spf: { min: 12, max: 12 },
  treatment: { min: 6, max: 12 },
  mask: { min: 6, max: 12 },
  other: { min: 6, max: 12 },
};

export type PaoHint = {
  /** Whole calendar months since opened, on the Vietnam calendar. */
  monthsOpen: number;
  suggestedMin: number;
  suggestedMax: number;
  category: WardrobeCategoryId | "unknown";
};

type CivilDate = { year: number; month: number; day: number };

function parseCivilDate(raw: string): CivilDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return null;
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function compareCivil(a: CivilDate, b: CivilDate): number {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

function asCategory(raw: string | undefined): WardrobeCategoryId | "unknown" {
  if (!raw) return "unknown";
  if (isWardrobeCategoryId(raw)) return raw;
  return "unknown";
}

/**
 * Whole calendar months from an opened `YYYY-MM-DD` to `now` in Vietnam
 * (Asia/Ho_Chi_Minh). Not UTC midnight and not days ÷ 30.4375.
 * A shorter month still counts on its last day (31 Jan → 28 Feb).
 * A future opened date counts as just opened (0). Invalid dates return null.
 */
export function monthsSinceOpened(openedAt: string, now = new Date()): number | null {
  const opened = parseCivilDate(openedAt);
  if (!opened) return null;
  const today = parseCivilDate(vietnamDateKey(now));
  if (!today) return null;
  if (compareCivil(opened, today) > 0) return 0;

  let months = (today.year - opened.year) * 12 + (today.month - opened.month);
  const anniversaryDay = Math.min(opened.day, daysInMonth(today.year, today.month));
  if (today.day < anniversaryDay) months -= 1;
  return Math.max(0, months);
}

export function getPaoHint(
  openedAt: string | undefined,
  categoryRaw: string | undefined,
  now = new Date(),
): PaoHint | null {
  if (!openedAt?.trim()) return null;
  const monthsOpen = monthsSinceOpened(openedAt, now);
  if (monthsOpen == null) return null;
  const category = asCategory(categoryRaw);
  const range =
    category === "unknown"
      ? { min: 6, max: 12 }
      : PAO_MONTHS_BY_CATEGORY[category];
  return {
    monthsOpen,
    suggestedMin: range.min,
    suggestedMax: range.max,
    category,
  };
}

export type PaoHintCopy =
  | { key: "paoHintFreshFixed"; values: { months: number } }
  | { key: "paoHintFreshRange"; values: { min: number; max: number } }
  | { key: "paoHintFixed"; values: { monthsOpen: number; months: number } }
  | { key: "paoHintRange"; values: { monthsOpen: number; min: number; max: number } }
  | { key: "paoHintOverWindow" };

/**
 * Hint key for the opened date. When months opened is past the category's
 * upper bound (12 for cleanser and sunscreen, 12 for the 6 đến 12 ranges),
 * the over-window line replaces the normal one.
 */
export function paoHintCopy(pao: PaoHint): PaoHintCopy {
  if (pao.monthsOpen > pao.suggestedMax) {
    return { key: "paoHintOverWindow" };
  }
  if (pao.monthsOpen < 1) {
    if (pao.suggestedMin === pao.suggestedMax) {
      return { key: "paoHintFreshFixed", values: { months: pao.suggestedMax } };
    }
    return {
      key: "paoHintFreshRange",
      values: { min: pao.suggestedMin, max: pao.suggestedMax },
    };
  }
  if (pao.suggestedMin === pao.suggestedMax) {
    return {
      key: "paoHintFixed",
      values: { monthsOpen: pao.monthsOpen, months: pao.suggestedMax },
    };
  }
  return {
    key: "paoHintRange",
    values: { monthsOpen: pao.monthsOpen, min: pao.suggestedMin, max: pao.suggestedMax },
  };
}
