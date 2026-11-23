/**
 * Speech lines for Bé Da. Text is copied from lib/mascot/loi_noi.json and is not rewritten.
 * Room lines for Bạn AI stay unused: rooms have sample friends, not AI members.
 */

import raw from "@/lib/mascot/loi_noi.json";
import { hourInTimeZone } from "@/lib/mascot/game/sky";
import { improvedConcerns, type MascotSnapshot } from "@/lib/mascot/model";

export type LoiSpeaker = "be_da" | "ban_ai";

export type LoiLine = {
  id: string;
  speaker: LoiSpeaker;
  personality: string;
  trigger: string;
  text: string;
  moc?: number;
};

export type LoiTrigger = {
  trigger: string;
  moc?: number;
};

type LoiFile = {
  loi: LoiLine[];
};

const file = raw as LoiFile;

export const LOI_LINES: readonly LoiLine[] = file.loi;

const RECENT_KEEP = 8;
const SHOW_MS = 6000;
const RANDOM_GAP_MS = 8 * 60 * 60 * 1000;

export function pickLoiLine(
  lines: readonly LoiLine[],
  query: { speaker: LoiSpeaker; personality: string; trigger: string; moc?: number },
  recentIds: readonly string[],
): LoiLine | null {
  const pool = lines.filter((line) => {
    if (line.speaker !== query.speaker || line.personality !== query.personality || line.trigger !== query.trigger) {
      return false;
    }
    if (query.trigger === "streak_moc") return line.moc === query.moc;
    return true;
  });
  if (pool.length === 0) return null;
  const last = recentIds[recentIds.length - 1];
  const notLast = pool.filter((line) => line.id !== last);
  const choices = notLast.length > 0 ? notLast : pool;
  const unused = choices.filter((line) => !recentIds.includes(line.id));
  return (unused[0] ?? choices[0]) ?? null;
}

export function nextRecentIds(recentIds: readonly string[], id: string): string[] {
  return [...recentIds.filter((item) => item !== id), id].slice(-RECENT_KEEP);
}

export function chooseBeDaTrigger(input: {
  hour: number;
  missedDays: number | null;
  streak: number | null;
  randomDue: boolean;
}): LoiTrigger | null {
  if (input.hour >= 23) return { trigger: "thuc_khuya" };
  if (input.streak === 7) return { trigger: "streak_moc", moc: 7 };
  if (input.streak === 30) return { trigger: "streak_moc", moc: 30 };
  if (input.missedDays != null && input.missedDays >= 3) return { trigger: "bo_3_ngay_tro_len" };
  if (input.missedDays === 1) return { trigger: "bo_1_ngay" };
  if (input.hour >= 5 && input.hour < 12) return { trigger: "mo_app_sang" };
  if (input.hour >= 16 && input.hour < 23) return { trigger: "mo_app_toi" };
  if (input.randomDue) return { trigger: "ngau_nhien" };
  return null;
}

export function giftLoiTrigger(rarity: string, coins: boolean): string | null {
  if (coins) return null;
  if (rarity === "rare" || rarity === "hiem") return "mo_hop_hiem";
  if (rarity === "legendary" || rarity === "sieu" || rarity === "super") return "mo_hop_sieu_hiem";
  if (rarity === "common" || rarity === "thuong" || rarity === "") return "mo_hop_thuong";
  return null;
}

function recentKey(query: { speaker: string; personality: string; trigger: string; moc?: number }): string {
  return `beda-loi:${query.speaker}:${query.personality}:${query.trigger}:${query.moc ?? ""}`;
}

function readRecent(storage: Pick<Storage, "getItem">, key: string): string[] {
  try {
    const parsed = JSON.parse(storage.getItem(key) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function rememberLoiLine(
  storage: Pick<Storage, "getItem" | "setItem">,
  query: { speaker: LoiSpeaker; personality: string; trigger: string; moc?: number },
): LoiLine | null {
  const key = recentKey(query);
  const recent = readRecent(storage, key);
  const line = pickLoiLine(LOI_LINES, query, recent);
  if (!line) return null;
  storage.setItem(key, JSON.stringify(nextRecentIds(recent, line.id)));
  return line;
}

export function vietnamDayKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

type Shown = { text: string; until: number };

let shown: Shown | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();
let openDone = false;

function emit() {
  listeners.forEach((listener) => listener());
}

export function shownLoiText(now = Date.now()): string | null {
  if (!shown || now >= shown.until) return null;
  return shown.text;
}

export function presentLoiLine(line: LoiLine, now = Date.now()): void {
  shown = { text: line.text, until: now + SHOW_MS };
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    shown = null;
    emit();
  }, SHOW_MS);
  emit();
}

export function subscribeLoi(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function noteCheckInLoi(snapshot: MascotSnapshot | null, hadPhoto: boolean): void {
  if (snapshot && snapshot.missedDays != null && snapshot.missedDays >= 1) {
    pushLoiEvent("quay_lai_sau_nghi");
    return;
  }
  if (!hadPhoto) return;
  const improved = snapshot ? improvedConcerns(snapshot.skinMarks, snapshot.skinMarksPrev).length > 0 : false;
  pushLoiEvent(improved ? "chup_da_tien_bo" : "chup_da_xong");
}

export function pushLoiEvent(trigger: string, moc?: number): void {
  if (typeof window === "undefined") return;
  const line = rememberLoiLine(window.localStorage, {
    speaker: "be_da",
    personality: "be_da",
    trigger,
    moc,
  });
  if (line) presentLoiLine(line);
}

export function randomLoiDue(storage: Pick<Storage, "getItem">, now = Date.now()): boolean {
  const raw = storage.getItem("beda-loi-random-at");
  const at = raw ? Number(raw) : 0;
  return !Number.isFinite(at) || now - at >= RANDOM_GAP_MS;
}

export function maybeShowOpenLine(
  input: { missedDays: number | null; streak: number | null },
  now = new Date(),
): void {
  if (typeof window === "undefined" || openDone) return;
  if (shownLoiText(now.getTime())) return;
  openDone = true;
  const hour = hourInTimeZone(now);
  const choice = chooseBeDaTrigger({
    hour,
    missedDays: input.missedDays,
    streak: input.streak,
    randomDue: randomLoiDue(window.localStorage, now.getTime()),
  });
  if (!choice) return;
  const seen = `beda-loi-seen:${vietnamDayKey(now)}:${choice.trigger}:${choice.moc ?? ""}`;
  if (window.localStorage.getItem(seen)) return;
  const line = rememberLoiLine(window.localStorage, {
    speaker: "be_da",
    personality: "be_da",
    trigger: choice.trigger,
    moc: choice.moc,
  });
  if (!line) return;
  window.localStorage.setItem(seen, "1");
  if (choice.trigger === "ngau_nhien") {
    window.localStorage.setItem("beda-loi-random-at", String(now.getTime()));
  }
  presentLoiLine(line, now.getTime());
}

/** Test helper. */
export function resetLoiSession(): void {
  shown = null;
  openDone = false;
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = null;
}
