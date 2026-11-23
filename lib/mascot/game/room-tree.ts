import { ApiError, apiGet, apiPost } from "@/lib/api-client";
import { isQuestHidden } from "@/lib/mascot/game/room-shared";

/** REST shared tree. Same origin and gate as the other room calls. */
const ROOMS = "/api/v1/mascot/rooms";
const TYPES = "/api/v1/mascot/tree-types";

const roomCall = { toastOnError: false, credentials: "include" as const };

/** Only the leaf drawing is in the app today. Other image keys use it. */
export const TREE_ART_KEYS = ["leaf"] as const;

export const TREE_STAGE_NAMES = [
  "",
  "Hạt giống",
  "Mầm non",
  "Cây con",
  "Cây nhỏ có nụ",
  "Nụ hồng hé nở",
  "Hoa nở",
  "Cây hoa rực rỡ",
] as const;

export const TREE_REASONS = ["room_ended", "bloomed", "already_watered", "needs_skin_check"] as const;

export type TreeReason = (typeof TREE_REASONS)[number];

export type TreeReward = {
  stage: number;
  name: string;
  coins: number;
  itemId: string;
  itemName: string;
  previewOnly: boolean;
};

export type RoomTree = {
  stage: number;
  stageName: string;
  treeType: string;
  treeName: string;
  rarity: string;
  imageKey: string;
  waters: number;
  required: number;
  watered: string[];
  progress: number;
  canWater: boolean;
  reason: TreeReason | null;
  bloomed: boolean;
  rewards: TreeReward[];
  myRewards: TreeReward[];
  balance: number;
  already: boolean;
  leveled: boolean;
  justGranted: TreeReward[];
};

export type TreeTypeInfo = {
  key: string;
  nameVi: string;
  rarity: string;
  imageKey: string;
  sortOrder: number;
  exclusiveItemKey: string;
  exclusiveItemName: string;
  creatable: boolean;
};

export type RoomTreeTick = {
  op: "tree_watered" | "tree_level_up";
  name: string;
  waters: number;
  required: number;
  progress: number;
  stage: number;
  treeType: string;
};

/** Closet rows the tree can grant. Wearable clips have character art. */
export const TREE_CLOSET = [
  { id: "tree_sticker_la_xanh", name: "Nhãn dán lá xanh", previewOnly: true, art: "item_nhan_dan_la_xanh.svg" },
  { id: "tree_frame_hoa", name: "Khung tên hoa", previewOnly: true, art: "item_khung_ten_hoa.svg" },
  { id: "tree_clip_la_xanh", name: "Kẹp tóc lá xanh", previewOnly: false, art: "item_kep_toc_la_xanh.svg" },
  { id: "tree_clip_hoa_anh_dao", name: "Kẹp hoa anh đào", previewOnly: false, art: "item_kep_hoa_anh_dao.svg" },
  { id: "tree_vong_la_lo_hoi", name: "Vòng lá lô hội", previewOnly: false, art: "item_vong_la_lo_hoi.svg" },
  { id: "tree_no_hoa_huong_duong", name: "Nơ hoa hướng dương", previewOnly: false, art: "item_no_hoa_huong_duong.svg" },
] as const;

export type TreeClosetId = (typeof TREE_CLOSET)[number]["id"];

const CLOSET_IDS = new Set<string>(TREE_CLOSET.map((item) => item.id));

export function isTreeWearClip(id: string): id is TreeClosetId {
  const row = TREE_CLOSET.find((item) => item.id === id);
  return row != null && !row.previewOnly;
}

export function treeClosetArt(id: string): string {
  const row = TREE_CLOSET.find((item) => item.id === id);
  return row ? `/mascot/tree/${row.art}` : "/mascot/tree/gift_box.svg";
}

/** Draw by image_key. Unknown keys (no art yet) use the leaf layers. */
export function treeArtKey(imageKey: string): string {
  return (TREE_ART_KEYS as readonly string[]).includes(imageKey) ? imageKey : "leaf";
}

export function treeStageName(stage: number, fromServer = ""): string {
  const named = fromServer.trim();
  if (named) return named;
  return TREE_STAGE_NAMES[stage] ?? TREE_STAGE_NAMES[1];
}

export function treePlantSrc(stage: number): string {
  const n = Math.min(7, Math.max(1, Math.trunc(stage) || 1));
  return `/mascot/tree/layer_plant_${n}.svg`;
}

export function treePotSrc(): string {
  return "/mascot/tree/layer_pot_soil.svg";
}

function row(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function int(value: unknown, fallback = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.trunc(value));
}

function text(value: unknown, max = 80): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function reasonOf(value: unknown): TreeReason | null {
  return typeof value === "string" && (TREE_REASONS as readonly string[]).includes(value)
    ? (value as TreeReason)
    : null;
}

function readReward(value: unknown): TreeReward | null {
  const body = row(value);
  if (!body) return null;
  const stage = int(body.stage, 0);
  if (stage < 1 || stage > 7) return null;
  const itemId = text(body.item_id, 64);
  const known = TREE_CLOSET.find((item) => item.id === itemId);
  return {
    stage,
    name: text(body.name, 80) || treeStageName(stage),
    coins: int(body.coins),
    itemId,
    itemName: text(body.item_name, 80) || known?.name || "",
    previewOnly: body.preview_only === true || known?.previewOnly === true,
  };
}

function readRewards(value: unknown): TreeReward[] {
  if (!Array.isArray(value)) return [];
  const out: TreeReward[] = [];
  for (const item of value) {
    const reward = readReward(item);
    if (reward && !out.some((have) => have.stage === reward.stage)) out.push(reward);
  }
  out.sort((a, b) => a.stage - b.stage);
  return out;
}

/** GET/POST tree body. Null when the payload is not a tree. */
export function readRoomTree(data: unknown): RoomTree | null {
  const body = row(data);
  if (!body) return null;
  const stage = int(body.stage, 0);
  if (stage < 1 || stage > 7) return null;
  const watered = Array.isArray(body.watered)
    ? body.watered.map((name) => text(name, 40)).filter((name) => name.length > 0)
    : [];
  const progress = typeof body.progress === "number" && Number.isFinite(body.progress) ? Math.max(0, body.progress) : 0;
  const justGranted = readRewards(body.just_granted);
  const leveled = body.leveled === true || justGranted.length > 0;
  return {
    stage,
    stageName: treeStageName(stage, text(body.stage_name, 80)),
    treeType: text(body.tree_type, 64) || "leaf",
    treeName: text(body.tree_name, 80),
    rarity: text(body.rarity, 32),
    imageKey: treeArtKey(text(body.image_key, 64) || text(body.tree_type, 64) || "leaf"),
    waters: int(body.waters),
    required: int(body.required),
    watered,
    progress,
    canWater: body.can_water === true,
    reason: body.can_water === true ? null : reasonOf(body.reason),
    bloomed: body.bloomed === true || stage >= 7,
    rewards: readRewards(body.rewards),
    myRewards: readRewards(body.my_rewards),
    balance: int(body.balance),
    already: body.already === true,
    leveled,
    justGranted,
  };
}

export function readTreeTypes(data: unknown): TreeTypeInfo[] {
  const body = row(data);
  const list = body && Array.isArray(body.types) ? body.types : [];
  const out: TreeTypeInfo[] = [];
  for (const item of list) {
    const type = row(item);
    if (!type) continue;
    const key = text(type.key, 64);
    if (!key) continue;
    out.push({
      key,
      nameVi: text(type.name_vi, 80),
      rarity: text(type.rarity, 32),
      imageKey: treeArtKey(text(type.image_key, 64) || key),
      sortOrder: int(type.sort_order),
      exclusiveItemKey: text(type.exclusive_item_key, 64),
      exclusiveItemName: text(type.exclusive_item_name, 80),
      creatable: type.creatable === true,
    });
  }
  out.sort((a, b) => a.sortOrder - b.sortOrder);
  return out;
}

/** One tick event. Null when the object is not a tree event. */
export function readTreeTick(value: unknown): RoomTreeTick | null {
  const body = row(value);
  if (!body) return null;
  if (body.op !== "tree_watered" && body.op !== "tree_level_up") return null;
  const tree = row(body.tree) ?? body;
  const stage = int(tree.stage, 0);
  if (stage < 1 || stage > 7) return null;
  const progress = typeof tree.progress === "number" && Number.isFinite(tree.progress) ? Math.max(0, tree.progress) : 0;
  return {
    op: body.op,
    name: text(tree.name, 40),
    waters: int(tree.waters),
    required: int(tree.required),
    progress,
    stage,
    treeType: text(tree.tree_type, 64) || "leaf",
  };
}

export function treeReasonFromError(err: unknown): TreeReason | null {
  if (!(err instanceof ApiError) || err.status !== 409) return null;
  return reasonOf(err.code);
}

export function treeIsHidden(err: unknown): boolean {
  return isQuestHidden(err);
}

/** GET /api/v1/mascot/tree-types. Enabled types only. */
export async function getTreeTypes(): Promise<TreeTypeInfo[]> {
  const data = await apiGet<unknown>(TYPES, roomCall);
  return readTreeTypes(data);
}

/** GET /api/v1/mascot/rooms/:code/tree. */
export async function getRoomTree(code: string): Promise<RoomTree> {
  const data = await apiGet<unknown>(`${ROOMS}/${encodeURIComponent(code)}/tree`, roomCall);
  const tree = readRoomTree(data);
  if (!tree) throw new ApiError("api", { status: 502, code: "bad_message" });
  return tree;
}

/**
 * POST /api/v1/mascot/rooms/:code/tree/water.
 * One idempotency key per tap. The same key replays as `already`.
 */
export async function waterRoomTree(code: string, idempotencyKey: string): Promise<RoomTree> {
  const data = await apiPost<unknown>(
    `${ROOMS}/${encodeURIComponent(code)}/tree/water`,
    { idempotency_key: idempotencyKey },
    roomCall,
  );
  const tree = readRoomTree(data);
  if (!tree) throw new ApiError("api", { status: 502, code: "bad_message" });
  return tree;
}

/** Up to 80 characters. A new key for each tap. */
export function newTreeIdempotencyKey(): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && typeof cryptoObj.randomUUID === "function") return cryptoObj.randomUUID();
  const bytes = new Uint8Array(16);
  if (cryptoObj && typeof cryptoObj.getRandomValues === "function") cryptoObj.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function nextTreeReward(tree: Pick<RoomTree, "stage" | "rewards" | "bloomed">): TreeReward | null {
  if (tree.bloomed || tree.stage >= 7) return null;
  return tree.rewards.find((reward) => reward.stage === tree.stage + 1) ?? null;
}

/** Waters still needed today before a full day levels. Null when the day cannot level. */
export function watersUntilLevel(tree: Pick<RoomTree, "waters" | "required" | "bloomed">): number | null {
  if (tree.bloomed || tree.required <= 0) return null;
  const left = tree.required - tree.waters;
  return left > 0 ? left : 0;
}

export function treeProgressPercent(progress: number): number {
  if (!Number.isFinite(progress)) return 0;
  return Math.max(0, Math.min(100, progress * 100));
}

export type StageMark = "done" | "now" | "soon" | "later";

export function stageMark(stage: number, current: number, bloomed: boolean): StageMark {
  if (bloomed || stage < current) return "done";
  if (stage === current) return "now";
  if (stage === current + 1) return "soon";
  return "later";
}

export function treeGrantsFrom(tree: Pick<RoomTree, "myRewards" | "justGranted">): TreeReward[] {
  const merged = [...tree.myRewards, ...tree.justGranted];
  return merged.filter((reward) => reward.itemId && CLOSET_IDS.has(reward.itemId));
}

const LIGHT_DEVICE_CORES = 2;
const LIGHT_DEVICE_MEMORY = 2;

/** prefers-reduced-motion, a very small device, or data saver. */
export function prefersLightMotion(win: {
  matchMedia?: (query: string) => { matches: boolean };
  navigator?: { hardwareConcurrency?: number; deviceMemory?: number; connection?: { saveData?: boolean } };
} | null): boolean {
  if (!win) return false;
  if (win.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return true;
  const nav = win.navigator;
  if (!nav) return false;
  if ((nav.hardwareConcurrency ?? 8) <= LIGHT_DEVICE_CORES) return true;
  if (nav.deviceMemory != null && nav.deviceMemory <= LIGHT_DEVICE_MEMORY) return true;
  if (nav.connection?.saveData) return true;
  return false;
}

export type TreeMotion = "water" | "other" | "grow";

export type TreeFrame = {
  can: { opacity: number; x: number; y: number; rotate: number };
  drops: { x: number; y: number; opacity: number }[];
  ripples: { w: number; h: number; opacity: number }[];
  plant: { scaleX: number; scaleY: number; opacity: number };
  nextPlant: { scale: number; opacity: number };
  glow: number;
  flash: number;
  sparkles: { opacity: number; scale: number }[];
  stars: { y: number; opacity: number }[];
  plus: { y: number; opacity: number };
  toast: number;
  popup: number;
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function span(ms: number, start: number, end: number): number {
  if (end <= start) return ms >= end ? 1 : 0;
  return clamp01((ms - start) / (end - start));
}

function easeOut(t: number): number {
  return 1 - (1 - t) ** 3;
}

function easeIn(t: number): number {
  return t * t;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

const REST: TreeFrame = {
  can: { opacity: 0, x: 0, y: 0, rotate: 0 },
  drops: [],
  ripples: [],
  plant: { scaleX: 1, scaleY: 1, opacity: 1 },
  nextPlant: { scale: 1, opacity: 0 },
  glow: 0,
  flash: 0,
  sparkles: [],
  stars: [],
  plus: { y: 0, opacity: 0 },
  toast: 0,
  popup: 0,
};

/**
 * One moment of the watering / grow animation.
 * Times match the handoff (ms from the tap, or from the other person's water).
 * `light` is the fade-only version: no drops, ripples, sparkles, or stars.
 */
export function treeFrame(ms: number, motion: TreeMotion, level: boolean, light: boolean): TreeFrame {
  const frame: TreeFrame = {
    ...REST,
    can: { ...REST.can },
    plant: { ...REST.plant },
    nextPlant: { ...REST.nextPlant },
    plus: { ...REST.plus },
  };
  const time = Math.max(0, ms);
  if (motion === "other") {
    const show = span(time, 0, 250);
    const hide = span(time, 2000, 2300);
    frame.toast = show * (1 - hide);
    if (!light) {
      frame.drops = otherDrops(time);
      const ripple = span(time, 500, 1100);
      if (ripple > 0 && ripple < 1) {
        frame.ripples = [{ w: lerp(10, 46, easeOut(ripple)), h: lerp(4, 14, easeOut(ripple)), opacity: 1 - ripple }];
      }
    }
    frame.plant = bounce(time, 550, 1350);
    frame.plus = floatPlus(time, 900, 1800);
    if (level) Object.assign(frame, growPart(time + 1700, light, frame));
    return frame;
  }
  if (!light && motion === "water") {
    const arrive = easeOut(span(time, 450, 850));
    frame.can = {
      opacity: arrive * (1 - span(time, 2350, 2600)),
      x: lerp(-24, 0, arrive),
      y: lerp(-14, span(time, 2350, 2600) * -10, arrive),
      rotate: lerp(0, 50, easeInOut(span(time, 850, 1150))) * (1 - easeInOut(span(time, 2150, 2350))),
    };
    frame.drops = selfDrops(time);
    frame.ripples = selfRipples(time);
  } else if (motion === "water") {
    frame.can = { opacity: span(time, 200, 500) * (1 - span(time, 2000, 2400)), x: 0, y: 0, rotate: 0 };
  }
  if (motion === "water") {
    frame.plant = bounce(time, 1700, 2500);
    frame.plus = floatPlus(time, 2300, 3200);
  }
  if (motion === "grow" || (level && motion === "water")) {
    growPart(motion === "grow" ? time + 3200 : time, light, frame);
  }
  return frame;
}

function bounce(ms: number, start: number, end: number): { scaleX: number; scaleY: number; opacity: number } {
  const t = span(ms, start, end);
  if (t <= 0 || t >= 1) return { scaleX: 1, scaleY: 1, opacity: 1 };
  const wave = Math.sin(t * Math.PI * 3) * (1 - t);
  const scaleY = 1 + wave * 0.06;
  return { scaleX: 1 / scaleY, scaleY, opacity: 1 };
}

function floatPlus(ms: number, start: number, end: number): { y: number; opacity: number } {
  const t = span(ms, start, end);
  if (t <= 0) return { y: 0, opacity: 0 };
  const fadeIn = clamp01(t / 0.2);
  const fadeOut = t > 0.75 ? clamp01((t - 0.75) / 0.25) : 0;
  return { y: -34 * easeOut(t), opacity: fadeIn * (1 - fadeOut) };
}

function selfDrops(ms: number): { x: number; y: number; opacity: number }[] {
  const drops: { x: number; y: number; opacity: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const start = 1150 + i * 130;
    const t = span(ms, start, start + 520);
    if (t <= 0 || t >= 1) continue;
    const fall = easeIn(t);
    const fade = t > 0.85 ? (t - 0.85) / 0.15 : 0;
    drops.push({ x: 8 + (i % 4) * 3, y: 66 * fall, opacity: 1 - fade });
  }
  return drops;
}

function otherDrops(ms: number): { x: number; y: number; opacity: number }[] {
  const drops: { x: number; y: number; opacity: number }[] = [];
  for (let i = 0; i < 5; i++) {
    const start = 100 + i * 120;
    const t = span(ms, start, start + 420);
    if (t <= 0 || t >= 1) continue;
    drops.push({ x: (i - 2) * 6, y: 66 * easeIn(t), opacity: 1 - (t > 0.85 ? (t - 0.85) / 0.15 : 0) });
  }
  return drops;
}

function selfRipples(ms: number): { w: number; h: number; opacity: number }[] {
  const rings: { w: number; h: number; opacity: number }[] = [];
  for (const [start, end] of [
    [1650, 2250],
    [1950, 2550],
  ] as const) {
    const t = span(ms, start, end);
    if (t <= 0 || t >= 1) continue;
    const eased = easeOut(t);
    rings.push({ w: lerp(10, 60, eased), h: lerp(4, 16, eased), opacity: 1 - t });
  }
  return rings;
}

function growPart(ms: number, light: boolean, base: TreeFrame): TreeFrame {
  const frame = base;
  const oldT = span(ms, 3700, 4400);
  const newT = easeOutBack(span(ms, 3900, 4600));
  if (oldT > 0) {
    frame.plant = {
      scaleX: lerp(1, 1.08, oldT),
      scaleY: lerp(1, 1.08, oldT),
      opacity: 1 - oldT,
    };
  }
  if (span(ms, 3900, 4600) > 0) {
    frame.nextPlant = { scale: lerp(0.86, 1, Math.min(1, newT)), opacity: span(ms, 3900, 4300) };
  }
  if (!light) {
    frame.glow = span(ms, 3200, 3700) * (1 - span(ms, 5000, 5400));
    const flashT = span(ms, 3950, 4500);
    frame.flash = Math.sin(flashT * Math.PI) * 0.55;
    frame.sparkles = sparkleList(ms);
    frame.stars = starList(ms);
  } else {
    frame.glow = span(ms, 3200, 3700) * 0.4;
  }
  const pop = easeOutBack(span(ms, 5100, 5500));
  if (span(ms, 5100, 5500) > 0) frame.popup = Math.min(1, pop);
  return frame;
}

function sparkleList(ms: number): { opacity: number; scale: number }[] {
  const out: { opacity: number; scale: number }[] = [];
  for (let i = 0; i < 8; i++) {
    const local = ms - 3300 - i * 90;
    if (local < 0 || local > 1700) continue;
    const pulse = (Math.sin((local / 600) * Math.PI * 2) + 1) / 2;
    out.push({ opacity: 0.35 + pulse * 0.65, scale: lerp(0.6, 1.2, pulse) });
  }
  return out;
}

function starList(ms: number): { y: number; opacity: number }[] {
  const out: { y: number; opacity: number }[] = [];
  for (let i = 0; i < 8; i++) {
    const start = 3900 + i * 110;
    const t = span(ms, start, start + 900);
    if (t <= 0 || t >= 1) continue;
    out.push({ y: -90 * easeOut(t), opacity: 1 - t });
  }
  return out;
}

/** How long the motion runs before the card can settle. */
export function treeMotionMs(motion: TreeMotion, level: boolean, light: boolean): number {
  if (light) {
    if (motion === "other") return level ? 1600 : 900;
    return level ? 1800 : 700;
  }
  if (motion === "other") return level ? 4000 : 2300;
  if (motion === "grow") return 2500;
  return level ? 5600 : 3200;
}

/** Count, bar, and stage switch on these beats of a self-water. */
export function treeReveal(ms: number, level: boolean, light: boolean): { count: boolean; stage: boolean; popup: boolean } {
  if (light) return { count: ms >= 200, stage: !level || ms >= 600, popup: !level || ms >= 800 };
  return { count: ms >= 2500, stage: level && ms >= 3900, popup: level && ms >= 5100 };
}
