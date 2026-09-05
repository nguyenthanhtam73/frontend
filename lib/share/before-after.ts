/** Pure helpers for before/after photo cards (progress + check-in share). */

import type { ProgressEntryDTO } from "@/lib/types/progress";

/** One user-owned skin-check photo that can appear on a share card. */
export type SharePhotoRef = {
  entryId: string;
  imageIndex: number;
  url: string;
  /** YYYY-MM-DD (Vietnam calendar), same as progress entries. */
  date: string;
};

export const BEFORE_AFTER_CARD_WIDTH = 1080;
export const BEFORE_AFTER_CARD_HEIGHT = 1350;

export type ShareRect = { x: number; y: number; w: number; h: number };

/**
 * Geometry for the 4:5 before/after PNG. Kept free of Canvas so layout can be
 * unit-tested (no overlap, photos stay inside the card).
 */
export function beforeAfterCardLayout(
  width = BEFORE_AFTER_CARD_WIDTH,
  height = BEFORE_AFTER_CARD_HEIGHT,
) {
  const pad = Math.round(width * 0.044);
  const headerH = Math.round(width * 0.125);
  const footerH = Math.round(width * 0.15);
  const gap = Math.round(width * 0.026);
  const labelH = Math.round(width * 0.07);
  const availableW = width - pad * 2;
  const contentTop = pad + headerH;
  const contentBottom = height - pad - footerH;
  const photoW = (availableW - gap) / 2;
  const maxPhotoH = contentBottom - contentTop - labelH;
  const photoH = Math.min(photoW * 1.08, maxPhotoH);
  const before: ShareRect = { x: pad, y: contentTop, w: photoW, h: photoH };
  const after: ShareRect = { x: pad + photoW + gap, y: contentTop, w: photoW, h: photoH };

  return {
    width,
    height,
    pad,
    gap,
    radius: Math.round(width * 0.028),
    header: { x: pad, y: pad, w: availableW, h: headerH } satisfies ShareRect,
    before,
    after,
    beforeLabel: {
      x: before.x,
      y: before.y + before.h + 10,
      w: before.w,
      h: labelH,
    } satisfies ShareRect,
    afterLabel: {
      x: after.x,
      y: after.y + after.h + 10,
      w: after.w,
      h: labelH,
    } satisfies ShareRect,
    footer: {
      x: pad,
      y: height - pad - footerH,
      w: availableW,
      h: footerH,
    } satisfies ShareRect,
  };
}

export function flattenProgressPhotos(entries: ProgressEntryDTO[]): SharePhotoRef[] {
  const out: SharePhotoRef[] = [];
  for (const e of entries) {
    const urls = e.image_urls ?? [];
    urls.forEach((url, imageIndex) => {
      if (typeof url !== "string" || !url.trim()) return;
      out.push({
        entryId: e.id,
        imageIndex,
        url,
        date: e.check_date,
      });
    });
  }
  return out;
}

/** Prepend this check-in's photos when the timeline hasn't caught up yet. */
export function mergeCheckInIntoEntries(
  entries: ProgressEntryDTO[],
  checkIn: {
    id: string;
    check_date: string;
    created_at?: string;
    image_urls?: string[];
    title?: string;
  },
): ProgressEntryDTO[] {
  if (entries.some((e) => e.id === checkIn.id)) return entries;
  const urls = (checkIn.image_urls ?? []).filter((u) => typeof u === "string" && u.trim());
  if (urls.length === 0) return entries;
  const extra: ProgressEntryDTO = {
    id: checkIn.id,
    check_date: checkIn.check_date,
    created_at: checkIn.created_at || new Date(0).toISOString(),
    title: checkIn.title,
    image_urls: urls,
    status: "completed",
  };
  return [extra, ...entries];
}

export function sharePhotoKey(photo: Pick<SharePhotoRef, "entryId" | "imageIndex">): string {
  return `${photo.entryId}#${photo.imageIndex}`;
}

export function isSameSharePhoto(a: SharePhotoRef, b: SharePhotoRef): boolean {
  if (a.entryId === b.entryId && a.imageIndex === b.imageIndex) return true;
  return Boolean(a.url) && a.url === b.url;
}

/** Two distinct user photos — same shot cannot be both before and after. */
export function canSharePhotoPair(
  before: SharePhotoRef | null | undefined,
  after: SharePhotoRef | null | undefined,
): boolean {
  if (!before || !after) return false;
  if (!before.url.trim() || !after.url.trim()) return false;
  return !isSameSharePhoto(before, after);
}

/** Format YYYY-MM-DD as DD/MM/YYYY for the card (locale-neutral, honest date). */
export function formatShareDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function calendarDaysBetween(from: string, to: string): number | null {
  const a = parseDay(from);
  const b = parseDay(to);
  if (!a || !b) return null;
  return Math.round((b.utc - a.utc) / 86_400_000);
}

function parseDay(iso: string): { utc: number } | null {
  const [y, m, d] = iso.split("-").map((n) => Number(n));
  if (!y || !m || !d) return null;
  const utc = Date.UTC(y, m - 1, d);
  if (!Number.isFinite(utc)) return null;
  return { utc };
}

export function safeShareFilename(stem: string): string {
  const safe = stem
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
  return `${safe || "dadiary-share"}.png`;
}

export function beforeAfterShareFilename(beforeDate: string, afterDate: string): string {
  const a = beforeDate.replace(/[^0-9-]/g, "") || "before";
  const b = afterDate.replace(/[^0-9-]/g, "") || "after";
  return safeShareFilename(`dadiary-before-after-${a}-to-${b}`);
}

/**
 * Source crop for object-fit: cover. Used by canvas drawImage.
 */
export function coverSourceRect(
  srcW: number,
  srcH: number,
  destW: number,
  destH: number,
): { sx: number; sy: number; sw: number; sh: number } {
  if (srcW <= 0 || srcH <= 0 || destW <= 0 || destH <= 0) {
    return { sx: 0, sy: 0, sw: Math.max(0, srcW), sh: Math.max(0, srcH) };
  }
  const srcRatio = srcW / srcH;
  const destRatio = destW / destH;
  if (srcRatio > destRatio) {
    const sw = srcH * destRatio;
    return { sx: (srcW - sw) / 2, sy: 0, sw, sh: srcH };
  }
  const sh = srcW / destRatio;
  return { sx: 0, sy: (srcH - sh) / 2, sw: srcW, sh };
}

/** Word-wrap for canvas (measure is injected so tests don't need Canvas). */
export function wrapLines(
  text: string,
  maxWidth: number,
  measure: (s: string) => number,
  maxLines = 3,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0 || maxLines <= 0 || maxWidth <= 0) return [];

  const lines: string[] = [];
  let current = "";

  const flush = (line: string, ellipsis: boolean) => {
    if (!line) return;
    if (!ellipsis) {
      lines.push(line);
      return;
    }
    let cut = line;
    while (cut.length > 1 && measure(`${cut}…`) > maxWidth) {
      cut = cut.slice(0, -1);
    }
    lines.push(`${cut}…`);
  };

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (measure(next) <= maxWidth) {
      current = next;
      continue;
    }
    if (lines.length >= maxLines - 1) {
      flush(current ? `${current} ${word}` : word, true);
      return lines;
    }
    if (current) flush(current, false);
    current = word;
  }

  if (current && lines.length < maxLines) {
    flush(current, measure(current) > maxWidth);
  }
  return lines;
}

export function rectsOverlap(a: ShareRect, b: ShareRect, slack = 0.5): boolean {
  return !(
    a.x + a.w <= b.x + slack ||
    b.x + b.w <= a.x + slack ||
    a.y + a.h <= b.y + slack ||
    b.y + b.h <= a.y + slack
  );
}

export function rectInside(
  inner: ShareRect,
  outer: { x: number; y: number; w: number; h: number },
  slack = 0.5,
): boolean {
  return (
    inner.x >= outer.x - slack &&
    inner.y >= outer.y - slack &&
    inner.x + inner.w <= outer.x + outer.w + slack &&
    inner.y + inner.h <= outer.y + outer.h + slack
  );
}
