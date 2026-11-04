import type { GameClipId, GameHairId, GameOutfitId } from "@/lib/mascot/game/look";
import { defaultSnapshot, resolveBeDaView, type BeDaView } from "@/lib/mascot/model";

/**
 * SAMPLE lobby visitors.
 *
 * There is no friends endpoint. These are not accounts. Nicknames are playful
 * labels (weather, snacks), never a real name, email, or photo. The signed-in
 * person is drawn separately and labeled "Bạn" / "You".
 */
export type SampleLobbyFriend = {
  id: string;
  nickname: string;
  /** 0–1 across the wide world. */
  x: number;
  /** 0–1 down the plaza. Lower on the screen (higher y) draws larger. */
  y: number;
  mood: "normal" | "happy" | "sparkle" | "sleepy";
  /**
   * Which glow art to wear. Visual variety only — never printed.
   */
  glow: number;
  outfit: GameOutfitId;
  hair: GameHairId;
  clip: GameClipId | null;
  sample: true;
};

/**
 * Shared lobby world. Android uses these same numbers.
 * Positions are normalized 0..1 over the whole world, origin top-left, y at the feet.
 */
export const LOBBY_WORLD = {
  /** Logical size. Width:height is 1:3. */
  width: 1000,
  height: 3000,
  /** Drawn world width divided by the viewport width. */
  viewportWidthScale: 1.3,
  /** Walkable floor. The top 12% is sky and decor, not feet. */
  walk: { minX: 0.06, maxX: 0.94, minY: 0.12, maxY: 0.96 },
  /** New arrivals. Random inside x±dx and y±dy. */
  spawn: { x: 0.5, y: 0.55, dx: 0.08, dy: 0.05 },
} as const;

/** Center of the arrival box. The live player uses `lobbySpawn` instead. */
export const LOBBY_PLAYER_SPOT = { x: LOBBY_WORLD.spawn.x, y: LOBBY_WORLD.spawn.y };

export type ScreenBox = { left: number; top: number; right: number; bottom: number };

/** Back button, zoom cluster, and the bottom menu, in screen pixels. */
export function lobbyChromePad(viewW: number, _viewH: number): { top: number; right: number; bottom: number; left: number } {
  const nav = lobbyNavReservePx(viewW);
  return { top: 176, right: 148, bottom: nav, left: 68 };
}

export function lobbyExclusionZones(viewW: number, viewH: number): ScreenBox[] {
  const pad = lobbyChromePad(viewW, viewH);
  return [
    { left: 0, top: 0, right: pad.left, bottom: 68 },
    { left: viewW - pad.right, top: 0, right: viewW, bottom: pad.top },
    { left: 0, top: viewH - pad.bottom, right: viewW, bottom: viewH },
  ];
}

/** Approximate on-screen width of a name pill at the lobby's 12px weight. */
export function lobbyTagWidthPx(nickname: string): number {
  return Math.ceil(nickname.length * 7.8 + 28);
}

/** Figure plus the name pill, in world pixels at zoom 1. Origin is the top-left of the world. */
export function lobbyBodyBox(x: number, y: number, nickname: string, worldW: number, worldH: number): ScreenBox {
  const figW = 110 * (0.78 + 0.4 * y) * 0.78;
  const figH = figW * (250 / 220);
  const tagW = lobbyTagWidthPx(nickname) * 0.9;
  const width = Math.max(figW, tagW);
  const height = figH + 12;
  const cx = x * worldW;
  const feet = y * worldH;
  return { left: cx - width / 2, top: feet - height, right: cx + width / 2, bottom: feet + 4 };
}

export function screenBoxesOverlap(a: ScreenBox, b: ScreenBox, gap = 2): boolean {
  return a.left < b.right + gap && a.right + gap > b.left && a.top < b.bottom + gap && a.bottom + gap > b.top;
}

function lobbyWorldSize(viewW: number) {
  const worldW = viewW * LOBBY_WORLD.viewportWidthScale;
  const worldH = worldW * (LOBBY_WORLD.height / LOBBY_WORLD.width);
  return { worldW, worldH };
}

/** Camera on the spawn center, inset by the control pads. */
export function lobbyOpeningCamera(
  player: { x: number; y: number } = LOBBY_PLAYER_SPOT,
  view: { viewW: number; viewH: number } = { viewW: 390, viewH: 844 },
) {
  const { worldW, worldH } = lobbyWorldSize(view.viewW);
  const pad = lobbyChromePad(view.viewW, view.viewH);
  let x = pad.left + (view.viewW - pad.left - pad.right) * 0.5 - player.x * worldW;
  let y = pad.top + (view.viewH - pad.top - pad.bottom) * 0.46 - player.y * worldH;
  x = Math.min(pad.left, Math.max(view.viewW - pad.right - worldW, x));
  y = Math.min(pad.top, Math.max(view.viewH - pad.bottom - worldH, y));
  return { x, y, worldW, worldH, viewW: view.viewW, viewH: view.viewH, scale: 1 };
}

function bodyHitsZones(
  x: number,
  y: number,
  nickname: string,
  cam: { x: number; y: number; worldW: number; worldH: number; viewH: number },
  zones: readonly ScreenBox[],
): boolean {
  const box = lobbyBodyBox(x, y, nickname, cam.worldW, cam.worldH);
  const screen = {
    left: cam.x + box.left,
    top: cam.y + box.top,
    right: cam.x + box.right,
    bottom: cam.y + box.bottom,
  };
  if (screen.bottom <= 0 || screen.top >= cam.viewH) return false;
  return zones.some((zone) => screenBoxesOverlap(screen, zone, 0));
}

const NUDGE_STEPS: readonly { x: number; y: number }[] = [
  { x: 0, y: 0.06 },
  { x: 0, y: 0.1 },
  { x: 0, y: -0.06 },
  { x: 0, y: -0.1 },
  { x: -0.08, y: 0 },
  { x: 0.08, y: 0 },
  { x: -0.12, y: 0.04 },
  { x: 0.12, y: 0.04 },
  { x: -0.08, y: 0.08 },
  { x: 0.08, y: 0.08 },
];

/**
 * Move a sample visitor just far enough that their figure and name are not under
 * the back button, zoom cluster, or bottom menu. Keeps clear of people already placed.
 */
export function sampleRenderSpot(
  spot: { x: number; y: number; nickname: string },
  others: readonly { x: number; y: number; nickname: string }[],
  cam: { x: number; y: number; scale: number },
  viewW: number,
  viewH: number,
  worldW: number,
  worldH: number,
): { x: number; y: number } {
  const zones = lobbyExclusionZones(viewW, viewH);
  const hits = (x: number, y: number) => {
    const box = lobbyBodyBox(x, y, spot.nickname, worldW, worldH);
    const screen = {
      left: cam.x + box.left * cam.scale,
      top: cam.y + box.top * cam.scale,
      right: cam.x + box.right * cam.scale,
      bottom: cam.y + box.bottom * cam.scale,
    };
    if (screen.bottom <= 0 || screen.top >= viewH || screen.right <= 0 || screen.left >= viewW) return false;
    return zones.some((zone) => screenBoxesOverlap(screen, zone, 0));
  };
  const crowded = (x: number, y: number) =>
    others.some((other) =>
      screenBoxesOverlap(
        lobbyBodyBox(x, y, spot.nickname, worldW, worldH),
        lobbyBodyBox(other.x, other.y, other.nickname, worldW, worldH),
        0,
      ),
    );
  if (!hits(spot.x, spot.y)) return { x: spot.x, y: spot.y };
  for (const step of NUDGE_STEPS) {
    const cand = clampLobbyPoint(spot.x + step.x, spot.y + step.y);
    if (!hits(cand.x, cand.y) && !crowded(cand.x, cand.y)) return cand;
  }
  return { x: spot.x, y: spot.y };
}

/** True when this visitor's figure or name would sit under a control at the opening camera. */
export function sampleStandsUnderOpeningChrome(x: number, y: number, nickname = ""): boolean {
  const cam = lobbyOpeningCamera();
  return bodyHitsZones(x, y, nickname, cam, lobbyExclusionZones(cam.viewW, cam.viewH));
}

/**
 * Even spots across the whole walkable floor. Boxes do not overlap at zoom 1,
 * at most three stand near the arrival box, and none sit under the opening controls.
 */
export function layoutSampleSpots<T extends { id: string; nickname: string }>(people: readonly T[]): (T & { x: number; y: number })[] {
  const grid: { x: number; y: number }[] = [];
  for (let row = 0; row < 9; row += 1) {
    const y = 0.14 + row * 0.1;
    for (const x of [0.1, 0.5, 0.9]) grid.push({ x, y });
  }
  return people.map((person, index) => {
    const spot = grid[index] ?? { x: 0.5, y: 0.55 };
    return { ...person, ...clampLobbyPoint(spot.x, spot.y) };
  });
}

const SAMPLE_ROSTER: readonly Omit<SampleLobbyFriend, "x" | "y">[] = [
  { id: "nang-som", nickname: "Nắng Sớm", mood: "normal", glow: 1, outfit: "outfit_ao_dai", hair: "hair_twin_tails", clip: "accessory_flower_clip", sample: true },
  { id: "suong-mai", nickname: "Sương Mai", mood: "happy", glow: 3, outfit: "outfit_vay_hoa", hair: "hair_high_pony", clip: "accessory_ribbon_bow", sample: true },
  { id: "tra-sua", nickname: "Trà Sữa", mood: "sparkle", glow: 3, outfit: "outfit_hoodie", hair: "hair_short_bob", clip: null, sample: true },
  { id: "may-hong", nickname: "Mây Hồng", mood: "happy", glow: 4, outfit: "outfit_ao_len", hair: "hair_sleep_buns", clip: "accessory_flower_clip", sample: true },
  { id: "chanh-leo", nickname: "Chanh Leo", mood: "normal", glow: 2, outfit: "outfit_ao_thun_yem", hair: "hair_twin_tails", clip: "accessory_ribbon_bow", sample: true },
  { id: "oc-que", nickname: "Ốc Quế", mood: "happy", glow: 4, outfit: "outfit_pajamas", hair: "hair_high_pony", clip: null, sample: true },
  { id: "meo-may", nickname: "Mèo Máy", mood: "happy", glow: 5, outfit: "outfit_ao_dai", hair: "hair_short_bob", clip: "accessory_ribbon_bow", sample: true },
  { id: "banh-flan", nickname: "Bánh Flan", mood: "happy", glow: 3, outfit: "outfit_vay_hoa", hair: "hair_sleep_buns", clip: "accessory_flower_clip", sample: true },
  { id: "keo-deo", nickname: "Kẹo Dẻo", mood: "sleepy", glow: 4, outfit: "outfit_hoodie", hair: "hair_twin_tails", clip: null, sample: true },
  { id: "cun-con", nickname: "Cún Con", mood: "normal", glow: 2, outfit: "outfit_ao_len", hair: "hair_high_pony", clip: "accessory_flower_clip", sample: true },
  { id: "hat-de", nickname: "Hạt Dẻ", mood: "happy", glow: 3, outfit: "outfit_ao_thun_yem", hair: "hair_sleep_buns", clip: "accessory_ribbon_bow", sample: true },
  { id: "gau-mo", nickname: "Gấu Mơ", mood: "normal", glow: 2, outfit: "outfit_pajamas", hair: "hair_short_bob", clip: "accessory_flower_clip", sample: true },
  { id: "dau-tay", nickname: "Dâu Tây", mood: "sparkle", glow: 4, outfit: "outfit_vay_hoa", hair: "hair_twin_tails", clip: null, sample: true },
  { id: "bo-xanh", nickname: "Bơ Xanh", mood: "happy", glow: 5, outfit: "outfit_ao_dai", hair: "hair_high_pony", clip: "accessory_ribbon_bow", sample: true },
  { id: "be-mit", nickname: "Bé Mít", mood: "sleepy", glow: 1, outfit: "outfit_hoodie", hair: "hair_sleep_buns", clip: "accessory_flower_clip", sample: true },
  { id: "su-kem", nickname: "Su Kem", mood: "sparkle", glow: 5, outfit: "outfit_ao_len", hair: "hair_short_bob", clip: null, sample: true },
  { id: "bong-gon", nickname: "Bông Gòn", mood: "happy", glow: 4, outfit: "outfit_ao_thun_yem", hair: "hair_twin_tails", clip: "accessory_ribbon_bow", sample: true },
  { id: "gio-mat", nickname: "Gió Mát", mood: "normal", glow: 2, outfit: "outfit_ao_dai", hair: "hair_short_bob", clip: null, sample: true },
  { id: "mua-nho", nickname: "Mưa Nhỏ", mood: "happy", glow: 3, outfit: "outfit_vay_hoa", hair: "hair_twin_tails", clip: "accessory_flower_clip", sample: true },
  { id: "sao-dem", nickname: "Sao Đêm", mood: "sparkle", glow: 4, outfit: "outfit_hoodie", hair: "hair_high_pony", clip: "accessory_ribbon_bow", sample: true },
  { id: "com-nguoi", nickname: "Cơm Nguội", mood: "normal", glow: 1, outfit: "outfit_ao_len", hair: "hair_sleep_buns", clip: null, sample: true },
  { id: "tra-dao", nickname: "Trà Đào", mood: "happy", glow: 5, outfit: "outfit_pajamas", hair: "hair_short_bob", clip: "accessory_flower_clip", sample: true },
  { id: "sen-hong", nickname: "Sen Hồng", mood: "sparkle", glow: 3, outfit: "outfit_ao_thun_yem", hair: "hair_high_pony", clip: null, sample: true },
  { id: "lac-rang", nickname: "Lắc Răng", mood: "happy", glow: 2, outfit: "outfit_hoodie", hair: "hair_twin_tails", clip: "accessory_ribbon_bow", sample: true },
  { id: "mo-uoc", nickname: "Mơ Ước", mood: "normal", glow: 4, outfit: "outfit_vay_hoa", hair: "hair_sleep_buns", clip: null, sample: true },
  { id: "ca-phe", nickname: "Cà Phê", mood: "happy", glow: 1, outfit: "outfit_ao_dai", hair: "hair_short_bob", clip: "accessory_flower_clip", sample: true },
  { id: "yen-nhe", nickname: "Yên Nhẹ", mood: "sleepy", glow: 2, outfit: "outfit_ao_len", hair: "hair_high_pony", clip: "accessory_ribbon_bow", sample: true },
];

export const SAMPLE_LOBBY_FRIENDS: readonly SampleLobbyFriend[] = layoutSampleSpots(SAMPLE_ROSTER);

/** Sample visitors plus the player's own Bé Da. */
export function lobbyHeadCount(): number {
  return SAMPLE_LOBBY_FRIENDS.length + 1;
}

function unit(roll: number): number {
  const u = Number.isFinite(roll) ? Math.min(0.999999, Math.max(0, roll)) : 0.5;
  return u * 2 - 1;
}

/** Keep feet on the walkable floor. Missing numbers fall back to the spawn center. */
export function clampLobbyPoint(x: number, y: number): { x: number; y: number } {
  const { walk, spawn } = LOBBY_WORLD;
  const cx = Number.isFinite(x) ? x : spawn.x;
  const cy = Number.isFinite(y) ? y : spawn.y;
  return {
    x: Math.min(walk.maxX, Math.max(walk.minX, cx)),
    y: Math.min(walk.maxY, Math.max(walk.minY, cy)),
  };
}

/** Feet closer than this in both axes are standing on each other. */
export const LOBBY_CLEAR_X = 0.08;
export const LOBBY_CLEAR_Y = 0.04;
const SPAWN_TRIES = 8;

export function lobbyTooClose(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  return Math.abs(a.x - b.x) < LOBBY_CLEAR_X - 1e-4 && Math.abs(a.y - b.y) < LOBBY_CLEAR_Y - 1e-4;
}

/** Larger means the spot has more room. Infinity when nobody else is there. */
export function lobbyCrowding(spot: { x: number; y: number }, others: readonly { x: number; y: number }[]): number {
  let best = Infinity;
  for (const other of others) {
    const nx = Math.abs(spot.x - other.x) / LOBBY_CLEAR_X;
    const ny = Math.abs(spot.y - other.y) / LOBBY_CLEAR_Y;
    best = Math.min(best, Math.hypot(nx, ny));
  }
  return best;
}

function rawSpawn(random: () => number): { x: number; y: number } {
  const { spawn } = LOBBY_WORLD;
  return clampLobbyPoint(spawn.x + unit(random()) * spawn.dx, spawn.y + unit(random()) * spawn.dy);
}

/**
 * A point in the arrival box that is not on top of anyone.
 * Tries a few random points, then keeps the least crowded.
 */
function spawnBlocked(spot: { x: number; y: number }, other: { x: number; y: number; nickname?: string }): boolean {
  if (lobbyTooClose(spot, other)) return true;
  const worldW = 390 * 1.3;
  const worldH = worldW * 3;
  const name = other.nickname ?? "Mây Hồng";
  return screenBoxesOverlap(
    lobbyBodyBox(spot.x, spot.y, "Bé Da", worldW, worldH),
    lobbyBodyBox(other.x, other.y, name, worldW, worldH),
    0,
  );
}

export function lobbySpawn(
  random: () => number = Math.random,
  others: readonly { x: number; y: number; nickname?: string }[] = SAMPLE_LOBBY_FRIENDS,
): { x: number; y: number } {
  let best = rawSpawn(random);
  let bestScore = lobbyCrowding(best, others);
  if (!others.some((other) => spawnBlocked(best, other))) return best;
  for (let attempt = 1; attempt < SPAWN_TRIES; attempt += 1) {
    const spot = rawSpawn(random);
    if (!others.some((other) => spawnBlocked(spot, other))) return spot;
    const score = lobbyCrowding(spot, others);
    if (score > bestScore) {
      best = spot;
      bestScore = score;
    }
  }
  return best;
}

function hashedSpawn(id: string, salt: number): { x: number; y: number } {
  let hash = (2166136261 ^ salt) >>> 0;
  for (let i = 0; i < id.length; i += 1) hash = Math.imul(hash ^ id.charCodeAt(i), 16777619) >>> 0;
  const a = (hash & 0xffff) / 0x10000;
  const b = ((hash >>> 16) & 0xffff) / 0x10000;
  const { spawn } = LOBBY_WORLD;
  return clampLobbyPoint(spawn.x + (a * 2 - 1) * spawn.dx, spawn.y + (b * 2 - 1) * spawn.dy);
}

/** Stable arrival spot when a person shows up without coordinates. */
export function lobbySpawnForId(
  id: string,
  others: readonly { x: number; y: number }[] = SAMPLE_LOBBY_FRIENDS,
): { x: number; y: number } {
  let best = hashedSpawn(id, 0);
  let bestScore = lobbyCrowding(best, others);
  if (!others.some((other) => lobbyTooClose(best, other))) return best;
  for (let salt = 1; salt < SPAWN_TRIES; salt += 1) {
    const spot = hashedSpawn(id, salt);
    if (!others.some((other) => lobbyTooClose(spot, other))) return spot;
    const score = lobbyCrowding(spot, others);
    if (score > bestScore) {
      best = spot;
      bestScore = score;
    }
  }
  return best;
}

/** True when some point in the arrival box is within the old point clearance of these feet. */
export function sampleBlocksSpawn(x: number, y: number): boolean {
  const { spawn } = LOBBY_WORLD;
  const nx = Math.min(Math.max(x, spawn.x - spawn.dx), spawn.x + spawn.dx);
  const ny = Math.min(Math.max(y, spawn.y - spawn.dy), spawn.y + spawn.dy);
  return lobbyTooClose({ x, y }, { x: nx, y: ny });
}

export type LobbySpot = { id: string; x: number; y: number };

/** Gap between the floating action card and the friend's head or the nav. */
export const FRIEND_CARD_GAP = 8;

/** Name tags stay this far inside the screen edge. */
export const TAG_VIEW_MARGIN = 8;

/**
 * Horizontal screen shift that pulls a name tag inside the frame.
 * Moves it only as far as the edge requires, so it stays under its Bé Da.
 */
export function tagEdgeDelta(
  tag: { left: number; right: number },
  frame: { left: number; right: number },
  margin = TAG_VIEW_MARGIN,
): number {
  const min = frame.left + margin;
  const max = frame.right - margin;
  let dx = 0;
  if (tag.left < min) dx = min - tag.left;
  if (tag.right + dx > max) dx -= tag.right + dx - max;
  if (tag.left + dx < min) dx = min - tag.left;
  return dx;
}

/** Round-nav block. Mirrors `--beda-nav-reserve` in be-da-game.css, before measurement. */
export function lobbyNavReservePx(viewportWidth: number, safeAreaBottom = 0): number {
  const padTop = 10;
  const gap = 4;
  const padBottom = 18 + safeAreaBottom;
  if (viewportWidth >= 768) return padTop + 80 + gap + 20 + padBottom;
  const orb = Math.min(72, Math.max(58, viewportWidth * 0.16));
  return padTop + orb + gap + 18 + padBottom;
}

/** Tags stay centered under their Bé Da. The screen clamp slides them in from the edges. */
export function lobbyTagNudgePx(spot: LobbySpot, spots: readonly LobbySpot[]): number {
  void spot;
  void spots;
  return 0;
}

/** Lower on the screen (larger y) paints in front. */
export function lobbyStackZ(y: number): number {
  return 20 + Math.round(y * 1000);
}

export type FriendCardPlacement = {
  top: number;
  left: number;
  /** Card sits under the friend when there is no room above the head. */
  flipped: boolean;
};

/**
 * Small card above the friend's head. Flips below the tag when the top of the
 * frame can't hold it, then clamps so the card never crosses the round nav.
 */
export function placeFriendCard(input: {
  frameWidth: number;
  frameHeight: number;
  friendTop: number;
  friendLeft: number;
  friendWidth: number;
  friendHeight: number;
  cardWidth: number;
  cardHeight: number;
  navTop: number;
  gap?: number;
  margin?: number;
}): FriendCardPlacement {
  const gap = input.gap ?? FRIEND_CARD_GAP;
  const margin = input.margin ?? 8;
  let left = input.friendLeft + input.friendWidth / 2 - input.cardWidth / 2;
  const maxLeft = input.frameWidth - input.cardWidth - margin;
  if (input.cardWidth + margin * 2 <= input.frameWidth) {
    left = Math.min(Math.max(margin, left), maxLeft);
  } else {
    left = Math.max(0, (input.frameWidth - input.cardWidth) / 2);
  }

  const above = input.friendTop - input.cardHeight - gap;
  const below = input.friendTop + input.friendHeight + gap;
  const maxTop = input.navTop - gap - input.cardHeight;
  let top = above;
  let flipped = false;
  if (above < margin) {
    top = below;
    flipped = true;
  }
  if (top > maxTop) top = maxTop;
  if (top + input.cardHeight > input.navTop - gap) {
    top = input.navTop - gap - input.cardHeight;
  }
  const overlapsFriend =
    top < input.friendTop + input.friendHeight && top + input.cardHeight > input.friendTop;
  if (overlapsFriend && input.friendTop + input.cardHeight <= maxTop) {
    top = input.friendTop;
    flipped = true;
    const right = input.friendLeft + input.friendWidth + gap;
    const leftSide = input.friendLeft - input.cardWidth - gap;
    if (right + input.cardWidth <= input.frameWidth - margin) left = right;
    else if (leftSide >= margin) left = leftSide;
  }
  return { top, left, flipped };
}

const sampleViews = new Map<string, BeDaView>();

/** Art for a sample visitor. Missed days stay 0 so the chosen face is kept. */
export function sampleFriendView(friend: SampleLobbyFriend): BeDaView {
  const cached = sampleViews.get(friend.id);
  if (cached) return cached;
  const view = resolveBeDaView({
    snapshot: {
      ...defaultSnapshot(),
      isDefault: false,
      mood: friend.mood,
      missedDays: 0,
      glowLevel: friend.glow,
      glowProgress: null,
      nearLevelUp: false,
      levelUp: false,
      skinMarks: [],
      skinMarksPrev: [],
    },
    missedDays: 0,
    sessionHappy: false,
    locale: "vi",
  });
  sampleViews.set(friend.id, view);
  return view;
}

let neutralView: BeDaView | null = null;

/** Face for a real person. No level, points, marks, or glow — outfit comes from the wire. */
export function lobbyNeutralView(): BeDaView {
  if (neutralView) return neutralView;
  neutralView = resolveBeDaView({
    snapshot: {
      ...defaultSnapshot(),
      isDefault: false,
      mood: "happy",
      missedDays: 0,
      glowLevel: 1,
      glowProgress: null,
      nearLevelUp: false,
      levelUp: false,
      skinMarks: [],
      skinMarksPrev: [],
    },
    missedDays: 0,
    sessionHappy: false,
    locale: "vi",
  });
  return neutralView;
}
