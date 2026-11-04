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

export const SAMPLE_LOBBY_FRIENDS: readonly SampleLobbyFriend[] = [
  { id: "nang-som", nickname: "Nắng Sớm", x: 0.08, y: 0.16, mood: "normal", glow: 1, outfit: "outfit_ao_dai", hair: "hair_twin_tails", clip: "accessory_flower_clip", sample: true },
  { id: "suong-mai", nickname: "Sương Mai", x: 0.24, y: 0.18, mood: "happy", glow: 3, outfit: "outfit_vay_hoa", hair: "hair_high_pony", clip: "accessory_ribbon_bow", sample: true },
  { id: "tra-sua", nickname: "Trà Sữa", x: 0.4, y: 0.15, mood: "sparkle", glow: 3, outfit: "outfit_hoodie", hair: "hair_short_bob", clip: null, sample: true },
  { id: "may-hong", nickname: "Mây Hồng", x: 0.56, y: 0.2, mood: "happy", glow: 4, outfit: "outfit_ao_len", hair: "hair_sleep_buns", clip: "accessory_flower_clip", sample: true },
  { id: "chanh-leo", nickname: "Chanh Leo", x: 0.72, y: 0.17, mood: "normal", glow: 2, outfit: "outfit_ao_thun_yem", hair: "hair_twin_tails", clip: "accessory_ribbon_bow", sample: true },
  { id: "oc-que", nickname: "Ốc Quế", x: 0.9, y: 0.22, mood: "happy", glow: 4, outfit: "outfit_pajamas", hair: "hair_high_pony", clip: null, sample: true },
  { id: "meo-may", nickname: "Mèo Máy", x: 0.12, y: 0.32, mood: "happy", glow: 5, outfit: "outfit_ao_dai", hair: "hair_short_bob", clip: "accessory_ribbon_bow", sample: true },
  { id: "banh-flan", nickname: "Bánh Flan", x: 0.3, y: 0.36, mood: "happy", glow: 3, outfit: "outfit_vay_hoa", hair: "hair_sleep_buns", clip: "accessory_flower_clip", sample: true },
  { id: "keo-deo", nickname: "Kẹo Dẻo", x: 0.48, y: 0.3, mood: "sleepy", glow: 4, outfit: "outfit_hoodie", hair: "hair_twin_tails", clip: null, sample: true },
  { id: "cun-con", nickname: "Cún Con", x: 0.66, y: 0.4, mood: "normal", glow: 2, outfit: "outfit_ao_len", hair: "hair_high_pony", clip: "accessory_flower_clip", sample: true },
  { id: "hat-de", nickname: "Hạt Dẻ", x: 0.84, y: 0.34, mood: "happy", glow: 3, outfit: "outfit_ao_thun_yem", hair: "hair_sleep_buns", clip: "accessory_ribbon_bow", sample: true },
  { id: "gau-mo", nickname: "Gấu Mơ", x: 0.08, y: 0.5, mood: "normal", glow: 2, outfit: "outfit_pajamas", hair: "hair_short_bob", clip: "accessory_flower_clip", sample: true },
  { id: "dau-tay", nickname: "Dâu Tây", x: 0.22, y: 0.56, mood: "sparkle", glow: 4, outfit: "outfit_vay_hoa", hair: "hair_twin_tails", clip: null, sample: true },
  { id: "bo-xanh", nickname: "Bơ Xanh", x: 0.4, y: 0.48, mood: "happy", glow: 5, outfit: "outfit_ao_dai", hair: "hair_high_pony", clip: "accessory_ribbon_bow", sample: true },
  { id: "be-mit", nickname: "Bé Mít", x: 0.58, y: 0.54, mood: "sleepy", glow: 1, outfit: "outfit_hoodie", hair: "hair_sleep_buns", clip: "accessory_flower_clip", sample: true },
  { id: "su-kem", nickname: "Su Kem", x: 0.76, y: 0.5, mood: "sparkle", glow: 5, outfit: "outfit_ao_len", hair: "hair_short_bob", clip: null, sample: true },
  { id: "bong-gon", nickname: "Bông Gòn", x: 0.92, y: 0.46, mood: "happy", glow: 4, outfit: "outfit_ao_thun_yem", hair: "hair_twin_tails", clip: "accessory_ribbon_bow", sample: true },
  { id: "gio-mat", nickname: "Gió Mát", x: 0.14, y: 0.68, mood: "normal", glow: 2, outfit: "outfit_ao_dai", hair: "hair_short_bob", clip: null, sample: true },
  { id: "mua-nho", nickname: "Mưa Nhỏ", x: 0.32, y: 0.74, mood: "happy", glow: 3, outfit: "outfit_vay_hoa", hair: "hair_twin_tails", clip: "accessory_flower_clip", sample: true },
  { id: "sao-dem", nickname: "Sao Đêm", x: 0.5, y: 0.66, mood: "sparkle", glow: 4, outfit: "outfit_hoodie", hair: "hair_high_pony", clip: "accessory_ribbon_bow", sample: true },
  { id: "com-nguoi", nickname: "Cơm Nguội", x: 0.68, y: 0.72, mood: "normal", glow: 1, outfit: "outfit_ao_len", hair: "hair_sleep_buns", clip: null, sample: true },
  { id: "tra-dao", nickname: "Trà Đào", x: 0.86, y: 0.64, mood: "happy", glow: 5, outfit: "outfit_pajamas", hair: "hair_short_bob", clip: "accessory_flower_clip", sample: true },
  { id: "sen-hong", nickname: "Sen Hồng", x: 0.1, y: 0.86, mood: "sparkle", glow: 3, outfit: "outfit_ao_thun_yem", hair: "hair_high_pony", clip: null, sample: true },
  { id: "lac-rang", nickname: "Lắc Răng", x: 0.28, y: 0.92, mood: "happy", glow: 2, outfit: "outfit_hoodie", hair: "hair_twin_tails", clip: "accessory_ribbon_bow", sample: true },
  { id: "mo-uoc", nickname: "Mơ Ước", x: 0.46, y: 0.84, mood: "normal", glow: 4, outfit: "outfit_vay_hoa", hair: "hair_sleep_buns", clip: null, sample: true },
  { id: "ca-phe", nickname: "Cà Phê", x: 0.64, y: 0.94, mood: "happy", glow: 1, outfit: "outfit_ao_dai", hair: "hair_short_bob", clip: "accessory_flower_clip", sample: true },
  { id: "yen-nhe", nickname: "Yên Nhẹ", x: 0.84, y: 0.88, mood: "sleepy", glow: 2, outfit: "outfit_ao_len", hair: "hair_high_pony", clip: "accessory_ribbon_bow", sample: true },
];

/** Sample visitors plus the player's own Bé Da. */
export function lobbyHeadCount(): number {
  return SAMPLE_LOBBY_FRIENDS.length + 1;
}

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

/** A random point in the arrival box, then clamped to the floor. */
export function lobbySpawn(random: () => number = Math.random): { x: number; y: number } {
  const { spawn } = LOBBY_WORLD;
  return clampLobbyPoint(spawn.x + unit(random()) * spawn.dx, spawn.y + unit(random()) * spawn.dy);
}

/** Stable arrival spot when a person shows up without coordinates. */
export function lobbySpawnForId(id: string): { x: number; y: number } {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i += 1) hash = Math.imul(hash ^ id.charCodeAt(i), 16777619) >>> 0;
  const a = (hash & 0xffff) / 0x10000;
  const b = ((hash >>> 16) & 0xffff) / 0x10000;
  const { spawn } = LOBBY_WORLD;
  return clampLobbyPoint(spawn.x + (a * 2 - 1) * spawn.dx, spawn.y + (b * 2 - 1) * spawn.dy);
}

export type LobbySpot = { id: string; x: number; y: number };

/** Gap between the floating action card and the friend's head or the nav. */
export const FRIEND_CARD_GAP = 8;

const TAG_NUDGE_PX = 48;

/** Round-nav block. Mirrors `--beda-nav-reserve` in be-da-game.css, before measurement. */
export function lobbyNavReservePx(viewportWidth: number, safeAreaBottom = 0): number {
  const padTop = 10;
  const gap = 4;
  const padBottom = 18 + safeAreaBottom;
  if (viewportWidth >= 768) return padTop + 80 + gap + 20 + padBottom;
  const orb = Math.min(72, Math.max(58, viewportWidth * 0.16));
  return padTop + orb + gap + 18 + padBottom;
}

/**
 * Shift a name tag off the face of the nearest Bé Da standing in front.
 * Negative is left. Tags with nobody close still step aside so shadows
 * don't stack on a neighbor.
 */
export function lobbyTagNudgePx(spot: LobbySpot, spots: readonly LobbySpot[]): number {
  let nearest: LobbySpot | null = null;
  let nearestDy = Infinity;
  let nearestDx = Infinity;
  for (const other of spots) {
    if (other.id === spot.id) continue;
    const dy = other.y - spot.y;
    if (dy <= 0.012) continue;
    const dx = Math.abs(other.x - spot.x);
    if (dx > 0.14) continue;
    if (dy < nearestDy - 0.001 || (Math.abs(dy - nearestDy) <= 0.001 && dx < nearestDx)) {
      nearest = other;
      nearestDy = dy;
      nearestDx = dx;
    }
  }
  if (!nearest) return spot.x < 0.5 ? -TAG_NUDGE_PX / 2 : TAG_NUDGE_PX / 2;
  return nearest.x >= spot.x ? -TAG_NUDGE_PX : TAG_NUDGE_PX;
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
