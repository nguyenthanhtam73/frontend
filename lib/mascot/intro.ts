import { parseSkinMark, type BeDaGender, type SkinMark } from "@/lib/mascot/model";

/** Unprefixed Vietnamese URL. English is `/en/goc-binh-yen/gioi-thieu`. */
export const BEDA_INTRO_PATH = "/goc-binh-yen/gioi-thieu";
/** Same full-screen game the Android WebView already opens. */
export const BEDA_GAME_PATH = "/goc-binh-yen/game";

export const INTRO_LINE_VI = "Bé Da này sẽ đi cùng bạn, nhớ chăm sóc bé thật tốt nhé";

export type IntroPageId = "hello" | "care" | "wardrobe" | "quests" | "lobby";

export const INTRO_PAGES: readonly IntroPageId[] = ["hello", "care", "wardrobe", "quests", "lobby"];

/** Cute sample of a first skin read: a few cheek spots and a little shine. */
export const SAMPLE_FIRST_MARKS: readonly SkinMark[] = [
  { concern: "acne", level: "light" },
  { concern: "oily", level: "light" },
];

const DRAWABLE = new Set(["acne", "oily", "dry", "red", "dark_spot"]);

export function introPageIndex(id: string | null | undefined): number {
  const index = INTRO_PAGES.indexOf((id ?? "") as IntroPageId);
  return index >= 0 ? index : 0;
}

/** Admins can open the page again with `?again=1`. */
export function introReplay(search: string): boolean {
  return new URLSearchParams(search).get("again") === "1";
}

/**
 * Dev-only stills. Production ignores the param so a public URL cannot skip the gate.
 */
export function introShot(search: string): IntroPageId | "male" | "female" | null {
  if (process.env.NODE_ENV === "production") return null;
  const shot = new URLSearchParams(search).get("shot");
  if (shot === "male" || shot === "female") return shot;
  if (shot && INTRO_PAGES.includes(shot as IntroPageId)) return shot as IntroPageId;
  return null;
}

export function introDoneMessage(gender: BeDaGender): string {
  return JSON.stringify({ type: "intro_done", gender });
}

export type NativeSessionBridge = {
  postMessage?: (message: string) => void;
};

/**
 * The Android game shell injects `DaDiarySession` on dadiary.vn pages.
 * Web has no bridge. The message is `{"type":"intro_done","gender":"female"|"male"}`.
 */
export function readIntroBridge(scope: object | null | undefined): NativeSessionBridge | null {
  const bridge = (scope as { DaDiarySession?: NativeSessionBridge } | null | undefined)?.DaDiarySession;
  if (!bridge || typeof bridge.postMessage !== "function") return null;
  return bridge;
}

export function postIntroDone(bridge: NativeSessionBridge | null, gender: BeDaGender): boolean {
  if (!bridge?.postMessage) return false;
  bridge.postMessage(introDoneMessage(gender));
  return true;
}

/** First analysis wins on the intro. A later check-in is used only when that read is empty. */
export function introFaceMarks(first: readonly SkinMark[], latest: readonly SkinMark[]): SkinMark[] {
  return first.length > 0 ? [...first] : [...latest];
}

/**
 * Maps the onboarding photo read onto the five gentle face marks.
 * Heavy stays medium so the face does not look scary.
 */
export function marksFromFirstSkin(input: {
  concerns?: unknown;
  analysis?: unknown;
} | null | undefined): SkinMark[] {
  if (!input) return [];
  const analysis = asRecord(input.analysis);
  const level = gentleLevel(asString(analysis?.severity_level));
  const tags = [
    ...stringList(input.concerns),
    ...stringList(analysis?.concerns),
    ...stringList(analysis?.main_concerns),
    ...stringList(analysis?.concern_types),
    asString(analysis?.morphology_group),
    ...observationTags(asRecord(analysis?.skin_observations)),
  ];
  const seen = new Set<string>();
  const out: SkinMark[] = [];
  for (const tag of tags) {
    const mark = parseSkinMark(tag);
    if (!mark || !DRAWABLE.has(mark.concern) || seen.has(mark.concern)) continue;
    seen.add(mark.concern);
    out.push({ concern: mark.concern, level });
  }
  const order = ["acne", "red", "dark_spot", "oily", "dry"];
  out.sort((a, b) => order.indexOf(a.concern) - order.indexOf(b.concern));
  return out;
}

function gentleLevel(raw: string): SkinMark["level"] {
  const key = raw.trim().toLowerCase();
  if (key === "moderate" || key === "medium" || key === "dense" || key === "heavy" || key === "pronounced" || key === "severe") {
    return "medium";
  }
  return "light";
}

function observationTags(obs: Record<string, unknown> | null): string[] {
  if (!obs) return [];
  const tags: string[] = [];
  if (observationHit(asString(obs.acne_status), ["acne", "mun", "mụn", "comedone", "bump", "pimple", "inflammatory", "active"])) {
    tags.push("acne");
  }
  const oil = asString(obs.oiliness_level).toLowerCase();
  if (!skipped(oil)) {
    if (oil.includes("dry") || oil.includes("khô") || oil.includes("kho")) tags.push("dry");
    else if (oil.includes("oil") || oil.includes("dầu") || oil.includes("dau") || oil.includes("bóng") || oil.includes("moderate") || oil.includes("high")) {
      tags.push("oily");
    }
  }
  if (observationHit(asString(obs.redness), ["red", "đỏ", "high", "mild", "moderate"])) tags.push("red");
  if (observationHit(asString(obs.pigmentation), ["pigment", "thâm", "tham", "spot", "mild", "moderate", "high"])) tags.push("dark_spot");
  return tags;
}

function observationHit(raw: string, hints: string[]): boolean {
  const low = raw.toLowerCase();
  if (skipped(low)) return false;
  return hints.some((hint) => low.includes(hint));
}

function skipped(low: string): boolean {
  if (!low) return true;
  return low === "none" || low === "no" || low === "clear" || low === "normal" || low === "không" || low === "khong" || low.startsWith("none") || low.startsWith("no ");
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
