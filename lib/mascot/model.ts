/**
 * Bé Da — pure view model. SVG layers stay in the client components;
 * this file only decides which layer ids to draw.
 *
 * Missed-day moods (unknown ids fall back to `normal`):
 *   1 normal · 2–3 sleepy · 4–5 sad_pillow · 6–8 pouty_arms_crossed
 *   9–11 back_turned · 12–14 note_on_mirror · 15–17 pot_on_head_corner
 *   18 suitcase_leaving · 19–20 waiting_door_sign
 *   21+ waiting_door_sign (abandoned sign, crying, flies, disheveled L4)
 *
 * Disheveled overlay is independent of the mood layer (shop hair stays put):
 *   L1 day 6 frizz · L2 day 12 + dark circles · L3 day 15 nest + twig + haggard
 *   L4 day 21 hair up + panda eyes + tears
 *   Day 18 (suitcase) stays at L2. hug_return clears the overlay.
 */

import { DEFAULT_ACCESSORY_IDS, DEFAULT_MASCOT_IDS } from "@/lib/mascot/catalog";

export const SKIN_CONCERNS = ["acne", "oily", "dark_spot", "dry", "red"] as const;
export type SkinConcern = (typeof SKIN_CONCERNS)[number];
export type SkinLevel = "light" | "medium" | "heavy";
export type DisheveledLevel = 0 | 1 | 2 | 3 | 4;

export type SkinMark = {
  concern: SkinConcern;
  level: SkinLevel;
};

/** Equipped shop item. `expiresAt` null means it does not expire. */
export type WornItem = {
  id: string;
  expiresAt: string | null;
};

export type MascotLoadout = {
  body: WornItem;
  hair: WornItem;
  /** Null uses the mood's eyes / brows / mouth / cheeks. A photo face id swaps those four layers. */
  face: WornItem | null;
  outfit: WornItem;
  /**
   * Worn together. The API may only send one `accessory` string;
   * the pink headband stays on unless that string is the headband itself
   * or `accessories` lists the slots explicitly.
   */
  accessories: WornItem[];
  roomItems: WornItem[];
};

export const EXPIRY_FADE_MS = 24 * 60 * 60 * 1000;

export type ItemLook = "full" | "fading" | "hidden";

export function permanentItem(id: string): WornItem {
  return { id, expiresAt: null };
}

/** Last 24h fades; after `expires_at` the item is gone. */
export function itemLook(expiresAt: string | null, now = Date.now()): ItemLook {
  if (!expiresAt) return "full";
  const at = Date.parse(expiresAt);
  if (!Number.isFinite(at)) return "full";
  if (now >= at) return "hidden";
  if (at - now <= EXPIRY_FADE_MS) return "fading";
  return "full";
}

export function itemOpacity(look: ItemLook): number {
  return look === "fading" ? 0.5 : 1;
}

export type RoutineToday = {
  amDone: number;
  amTotal: number;
  pmDone: number;
  pmTotal: number;
};

export type MascotSnapshot = {
  loadout: MascotLoadout;
  mood: string;
  skinMarks: SkinMark[];
  skinMarksPrev: SkinMark[];
  lineVi: string;
  lineEn: string;
  lastCheckinAt: string | null;
  /** Null when the payload did not say — do not invent a scolding. */
  missedDays: number | null;
  routineToday: RoutineToday;
  lastStepDone: string | null;
  isDefault: boolean;
};

export { poseForStep, isSessionComplete, streakDotBonus, POSE_HOLD_MS, STEP_POSES } from "@/lib/mascot/pose";
export type { StepPose } from "@/lib/mascot/pose";

export const DEFAULT_LOADOUT: MascotLoadout = {
  body: permanentItem(DEFAULT_MASCOT_IDS.body),
  hair: permanentItem(DEFAULT_MASCOT_IDS.hair),
  face: null,
  outfit: permanentItem(DEFAULT_MASCOT_IDS.outfit),
  accessories: DEFAULT_ACCESSORY_IDS.map((id) => permanentItem(id)),
  roomItems: [
    permanentItem("room_moon"),
    permanentItem("room_plant"),
    permanentItem("room_pillow"),
  ],
};

const EMPTY_ROUTINE: RoutineToday = { amDone: 0, amTotal: 0, pmDone: 0, pmTotal: 0 };

/** Catalog moods. Anything else resolves to `normal`. */
const MOOD_LAYER: Record<string, string> = {
  normal: "normal",
  happy: "happy",
  sparkle: "sparkle",
  sleepy: "sleepy",
  sad: "sad_pillow",
  sad_pillow: "sad_pillow",
  grumpy: "pouty_arms_crossed",
  pouty_arms_crossed: "pouty_arms_crossed",
  back_turned: "back_turned",
  note_on_mirror: "note_on_mirror",
  pot_on_head_corner: "pot_on_head_corner",
  suitcase_leaving: "suitcase_leaving",
  waiting_door_sign: "waiting_door_sign",
  hug_return: "hug_return",
  acne: "acne",
  oily: "oily",
  dry: "dry",
  red: "red",
  dark_spot: "dark_spot",
  worried: "acne",
};

const LINE_KEYS = new Set<string>([
  "happy",
  "sparkle",
  "sleepy",
  "acne",
  "oily",
  "dry",
  "red",
  "dark_spot",
  "normal",
  "reminder",
  "sad_pillow",
  "pouty_arms_crossed",
  "back_turned",
  "note_on_mirror",
  "pot_on_head_corner",
  "suitcase_leaving",
  "waiting_door_sign",
  "waiting_door_abandoned",
  "hug_return",
]);

export type LineKey =
  | "happy"
  | "sparkle"
  | "sleepy"
  | "acne"
  | "oily"
  | "dry"
  | "red"
  | "dark_spot"
  | "normal"
  | "reminder"
  | "sad_pillow"
  | "pouty_arms_crossed"
  | "back_turned"
  | "note_on_mirror"
  | "pot_on_head_corner"
  | "suitcase_leaving"
  | "waiting_door_sign"
  | "waiting_door_abandoned"
  | "hug_return";

export type BeDaView = {
  mood: string;
  lineKey: LineKey;
  useServerLine: boolean;
  serverLine: string;
  loadout: MascotLoadout;
  marks: SkinMark[];
  improved: SkinConcern[];
  disheveled: DisheveledLevel;
  flies: boolean;
  sign: "comeBack" | "abandoned";
  missedDays: number;
  bars: ConcernBar[];
};

const LEVEL_RANK: Record<SkinLevel, number> = { light: 1, medium: 2, heavy: 3 };

const CONCERN_ALIAS: Record<string, SkinConcern> = {
  acne: "acne",
  pimple: "acne",
  pimples: "acne",
  bump: "acne",
  oily: "oily",
  oil: "oily",
  shine: "oily",
  dry: "dry",
  dryness: "dry",
  flake: "dry",
  flakes: "dry",
  red: "red",
  redness: "red",
  blush: "red",
  dark_spot: "dark_spot",
  darkspot: "dark_spot",
  "dark-spot": "dark_spot",
  spot: "dark_spot",
  spots: "dark_spot",
  pigmentation: "dark_spot",
  pih: "dark_spot",
};

export function moodLayer(mood: string | null | undefined): string {
  const key = (mood ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return MOOD_LAYER[key] ?? "normal";
}

export function missedDayMood(days: number): string {
  if (days <= 1) return "normal";
  if (days <= 3) return "sleepy";
  if (days <= 5) return "sad_pillow";
  if (days <= 8) return "pouty_arms_crossed";
  if (days <= 11) return "back_turned";
  if (days <= 14) return "note_on_mirror";
  if (days <= 17) return "pot_on_head_corner";
  if (days === 18) return "suitcase_leaving";
  return "waiting_door_sign";
}

export function disheveledLevel(missedDays: number, mood: string): DisheveledLevel {
  const layer = moodLayer(mood);
  if (layer === "hug_return") return 0;
  if (missedDays === 18) return 2;
  if (layer === "suitcase_leaving" && missedDays < 21) return 2;
  if (missedDays >= 21) return 4;
  if (missedDays >= 15) return 3;
  if (missedDays >= 12) return 2;
  if (missedDays >= 6) return 1;
  return 0;
}

/** Cute flies only on the day-21 door beat. hug_return turns them off. */
export function showFlies(missedDays: number, mood: string): boolean {
  return moodLayer(mood) === "waiting_door_sign" && missedDays >= 21;
}

export function markOpacity(level: SkinLevel): number {
  if (level === "light") return 0.42;
  if (level === "medium") return 0.74;
  return 1;
}

export function markCount(level: SkinLevel): number {
  if (level === "light") return 2;
  if (level === "medium") return 4;
  return 7;
}

export function improvedConcerns(current: SkinMark[], prev: SkinMark[]): SkinConcern[] {
  const out: SkinConcern[] = [];
  for (const was of prev) {
    const now = current.find((mark) => mark.concern === was.concern);
    if (!now || LEVEL_RANK[now.level] < LEVEL_RANK[was.level]) out.push(was.concern);
  }
  return out;
}

export type ConcernBar = {
  concern: SkinConcern;
  level: SkinLevel | null;
  improved: boolean;
};

export function concernBars(current: SkinMark[], prev: SkinMark[]): ConcernBar[] {
  return SKIN_CONCERNS.filter(
    (concern) =>
      current.some((mark) => mark.concern === concern) ||
      prev.some((mark) => mark.concern === concern),
  ).map((concern) => {
    const now = current.find((mark) => mark.concern === concern);
    const was = prev.find((mark) => mark.concern === concern);
    const improved = !!was && (!now || LEVEL_RANK[now.level] < LEVEL_RANK[was.level]);
    return { concern, level: now?.level ?? null, improved };
  });
}

export function defaultSnapshot(): MascotSnapshot {
  return {
    loadout: cloneLoadout(DEFAULT_LOADOUT),
    mood: "happy",
    skinMarks: [],
    skinMarksPrev: [],
    lineVi: "",
    lineEn: "",
    lastCheckinAt: null,
    missedDays: null,
    routineToday: { ...EMPTY_ROUTINE },
    lastStepDone: null,
    isDefault: true,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.floor(value));
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Math.max(0, Math.floor(Number(value)));
  }
  return null;
}

function normalizeConcern(value: unknown): SkinConcern | null {
  const key = asString(value).toLowerCase().replace(/[\s-]+/g, "_");
  return CONCERN_ALIAS[key] ?? null;
}

function normalizeLevel(value: unknown): SkinLevel | null {
  const key = asString(value).toLowerCase();
  if (key === "light" || key === "medium" || key === "heavy") return key;
  return null;
}

export function parseSkinMark(value: unknown): SkinMark | null {
  if (typeof value === "string") {
    const [rawConcern, rawLevel] = value.split(":");
    const concern = normalizeConcern(rawConcern);
    if (!concern) return null;
    return { concern, level: normalizeLevel(rawLevel) ?? "medium" };
  }
  const row = asRecord(value);
  if (!row) return null;
  const concern = normalizeConcern(row.concern ?? row.id ?? row.type ?? row.kind ?? row.mark);
  if (!concern) return null;
  return { concern, level: normalizeLevel(row.level ?? row.severity) ?? "medium" };
}

function parseMarks(value: unknown): SkinMark[] {
  if (!Array.isArray(value)) return [];
  const out: SkinMark[] = [];
  for (const item of value) {
    const mark = parseSkinMark(item);
    if (!mark) continue;
    const existing = out.findIndex((row) => row.concern === mark.concern);
    if (existing >= 0) out[existing] = mark;
    else out.push(mark);
  }
  return out;
}

function parseWorn(value: unknown, fallback: string | null): WornItem | null {
  if (typeof value === "string") {
    const id = value.trim();
    if (!id) return fallback ? permanentItem(fallback) : null;
    return permanentItem(id);
  }
  const row = asRecord(value);
  if (!row) return fallback ? permanentItem(fallback) : null;
  const id = asString(row.id);
  if (!id) return fallback ? permanentItem(fallback) : null;
  const raw = row.expires_at;
  const expiresAt = raw == null || raw === "" ? null : asString(raw) || null;
  return { id, expiresAt };
}

function dedupeWorn(items: WornItem[]): WornItem[] {
  const seen = new Set<string>();
  const out: WornItem[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

/**
 * The API accessory field is a single id. The default look still wears the
 * pink headband and the star clip together. An explicit `accessories` array
 * is used as-is so a later payload can name every slot.
 */
function parseAccessories(row: Record<string, unknown>): WornItem[] {
  const headband = permanentItem(DEFAULT_MASCOT_IDS.headband);
  const clip = permanentItem(DEFAULT_MASCOT_IDS.accessory);
  if (Array.isArray(row.accessories)) {
    return dedupeWorn(
      row.accessories
        .map((item) => parseWorn(item, null))
        .filter((item): item is WornItem => !!item),
    );
  }
  const raw = row.accessory;
  if (Array.isArray(raw)) {
    return dedupeWorn(
      raw.map((item) => parseWorn(item, null)).filter((item): item is WornItem => !!item),
    );
  }
  const single = parseWorn(raw, null);
  if (!single) return [headband, clip];
  if (single.id === headband.id) return [single];
  return [headband, single];
}

function cloneLoadout(loadout: MascotLoadout): MascotLoadout {
  return {
    ...loadout,
    accessories: loadout.accessories.map((item) => ({ ...item })),
    roomItems: loadout.roomItems.map((item) => ({ ...item })),
  };
}

function parseLoadout(value: unknown): MascotLoadout {
  const row = asRecord(value);
  if (!row) return cloneLoadout(DEFAULT_LOADOUT);
  const room = Array.isArray(row.room_items)
    ? row.room_items
        .map((item) => parseWorn(item, null))
        .filter((item): item is WornItem => !!item)
    : DEFAULT_LOADOUT.roomItems.map((item) => ({ ...item }));
  return {
    body: parseWorn(row.body, DEFAULT_LOADOUT.body.id)!,
    hair: parseWorn(row.hair, DEFAULT_LOADOUT.hair.id)!,
    face: parseWorn(row.face, null),
    outfit: parseWorn(row.outfit, DEFAULT_LOADOUT.outfit.id)!,
    accessories: parseAccessories(row),
    roomItems: room,
  };
}

export function expiredItemKeys(loadout: MascotLoadout, now = Date.now()): string[] {
  const items = [
    loadout.body,
    loadout.hair,
    loadout.face,
    loadout.outfit,
    ...loadout.accessories,
    ...loadout.roomItems,
  ];
  return items
    .filter((item): item is WornItem => !!item && itemLook(item.expiresAt, now) === "hidden")
    .map((item) => `${item.id}@${item.expiresAt}`)
    .sort();
}

function parseRoutineToday(value: unknown): RoutineToday {
  const row = asRecord(value);
  if (!row) return { ...EMPTY_ROUTINE };
  return {
    amDone: asInt(row.am_done) ?? 0,
    amTotal: asInt(row.am_total) ?? 0,
    pmDone: asInt(row.pm_done) ?? 0,
    pmTotal: asInt(row.pm_total) ?? 0,
  };
}

/** Accept the GET /api/v1/me/mascot payload. Missing pieces fall back quietly. */
export function parseMascot(value: unknown): MascotSnapshot {
  const row = asRecord(value) ?? {};
  const missed = asInt(row.missed_days);
  return {
    loadout: parseLoadout(row.loadout),
    mood: asString(row.mood) || "happy",
    skinMarks: parseMarks(row.skin_marks),
    skinMarksPrev: parseMarks(row.skin_marks_prev),
    lineVi: asString(row.line_vi),
    lineEn: asString(row.line_en),
    lastCheckinAt: asString(row.last_checkin_at) || null,
    missedDays: missed,
    routineToday: parseRoutineToday(row.routine_today),
    lastStepDone: asString(row.last_step_done) || null,
    isDefault: false,
  };
}

export function daysBetween(fromISO: string, toISO: string): number | null {
  const from = fromISO.slice(0, 10);
  const to = toISO.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return null;
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  if (!Number.isFinite(ms)) return null;
  return Math.round(ms / 86_400_000);
}

/** Days skipped before today. Checked in yesterday → 0. Never checked in → null. */
export function missedDaysFromLast(lastISO: string, todayISO: string): number | null {
  const diff = daysBetween(lastISO, todayISO);
  if (diff == null) return null;
  if (diff <= 0) return 0;
  return diff - 1;
}

export function resolveMissedDays(
  snapshot: MascotSnapshot | null,
  streak: { days_since_last_check_in?: number | null; last_check_in_date?: string | null } | null,
  todayISO: string,
): number | null {
  if (snapshot && !snapshot.isDefault && snapshot.missedDays != null) return snapshot.missedDays;
  if (snapshot?.lastCheckinAt) {
    const fromCheckin = missedDaysFromLast(snapshot.lastCheckinAt, todayISO);
    if (fromCheckin != null) return fromCheckin;
  }
  if (streak?.last_check_in_date) {
    if (
      streak.days_since_last_check_in != null &&
      streak.last_check_in_date < todayISO
    ) {
      return Math.max(0, streak.days_since_last_check_in - 1);
    }
    return missedDaysFromLast(streak.last_check_in_date, todayISO);
  }
  return null;
}

function lineKeyFor(mood: string, missedDays: number, source: "checkin" | "missed" | "session"): LineKey {
  if (source === "session") return "happy";
  if (source === "missed" && mood === "normal") return "reminder";
  if (mood === "waiting_door_sign" && missedDays >= 21) return "waiting_door_abandoned";
  if (LINE_KEYS.has(mood)) return mood as LineKey;
  return "normal";
}

export function resolveBeDaView(input: {
  snapshot: MascotSnapshot | null;
  missedDays: number | null;
  sessionHappy: boolean;
  locale: string;
}): BeDaView {
  const snap = input.snapshot ?? defaultSnapshot();
  const missed = input.missedDays ?? 0;
  let mood = moodLayer(snap.mood);
  let source: "checkin" | "missed" | "session" = "checkin";
  if (input.sessionHappy) {
    mood = "happy";
    source = "session";
  } else if (moodLayer(snap.mood) === "hug_return") {
    mood = "hug_return";
  } else if (input.missedDays != null && input.missedDays >= 1) {
    mood = missedDayMood(input.missedDays);
    source = "missed";
  }
  const server = input.locale.toLowerCase().startsWith("en") ? snap.lineEn : snap.lineVi;
  const serverMatches =
    source === "checkin" || moodLayer(snap.mood) === mood;
  return {
    mood,
    lineKey: lineKeyFor(mood, missed, source),
    useServerLine: serverMatches && server.trim().length > 0,
    serverLine: server.trim(),
    loadout: snap.loadout,
    marks: snap.skinMarks,
    improved: improvedConcerns(snap.skinMarks, snap.skinMarksPrev),
    disheveled: disheveledLevel(missed, mood),
    flies: showFlies(missed, mood),
    sign: missed >= 21 && mood === "waiting_door_sign" ? "abandoned" : "comeBack",
    missedDays: missed,
    bars: concernBars(snap.skinMarks, snap.skinMarksPrev),
  };
}

/** One card per catalog mood for the review sheet. Day numbers pick the art beat. */
export const MOOD_SHEET: { id: string; missedDays: number; mood: string }[] = [
  { id: "normal", missedDays: 1, mood: "normal" },
  { id: "sleepy", missedDays: 2, mood: "sleepy" },
  { id: "sad_pillow", missedDays: 4, mood: "sad_pillow" },
  { id: "pouty_arms_crossed", missedDays: 6, mood: "pouty_arms_crossed" },
  { id: "back_turned", missedDays: 9, mood: "back_turned" },
  { id: "note_on_mirror", missedDays: 12, mood: "note_on_mirror" },
  { id: "pot_on_head_corner", missedDays: 15, mood: "pot_on_head_corner" },
  { id: "suitcase_leaving", missedDays: 18, mood: "suitcase_leaving" },
  { id: "waiting_door_sign", missedDays: 21, mood: "waiting_door_sign" },
  { id: "hug_return", missedDays: 0, mood: "hug_return" },
];
