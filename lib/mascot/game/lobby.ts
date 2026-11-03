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
  { id: "nang-som", nickname: "Nắng Sớm", x: 0.06, y: 0.5, mood: "normal", glow: 1, outfit: "outfit_ao_dai", hair: "hair_twin_tails", clip: "accessory_flower_clip", sample: true },
  { id: "suong-mai", nickname: "Sương Mai", x: 0.14, y: 0.58, mood: "happy", glow: 3, outfit: "outfit_vay_hoa", hair: "hair_high_pony", clip: "accessory_ribbon_bow", sample: true },
  { id: "tra-sua", nickname: "Trà Sữa", x: 0.22, y: 0.48, mood: "sparkle", glow: 3, outfit: "outfit_hoodie", hair: "hair_short_bob", clip: null, sample: true },
  { id: "may-hong", nickname: "Mây Hồng", x: 0.72, y: 0.48, mood: "happy", glow: 4, outfit: "outfit_ao_len", hair: "hair_sleep_buns", clip: "accessory_flower_clip", sample: true },
  { id: "chanh-leo", nickname: "Chanh Leo", x: 0.82, y: 0.56, mood: "normal", glow: 2, outfit: "outfit_ao_thun_yem", hair: "hair_twin_tails", clip: "accessory_ribbon_bow", sample: true },
  { id: "oc-que", nickname: "Ốc Quế", x: 0.91, y: 0.62, mood: "happy", glow: 4, outfit: "outfit_pajamas", hair: "hair_high_pony", clip: null, sample: true },
  { id: "meo-may", nickname: "Mèo Máy", x: 0.12, y: 0.7, mood: "happy", glow: 5, outfit: "outfit_ao_dai", hair: "hair_short_bob", clip: "accessory_ribbon_bow", sample: true },
  { id: "banh-flan", nickname: "Bánh Flan", x: 0.28, y: 0.66, mood: "happy", glow: 3, outfit: "outfit_vay_hoa", hair: "hair_sleep_buns", clip: "accessory_flower_clip", sample: true },
  { id: "keo-deo", nickname: "Kẹo Dẻo", x: 0.6, y: 0.74, mood: "sleepy", glow: 4, outfit: "outfit_hoodie", hair: "hair_twin_tails", clip: null, sample: true },
  { id: "cun-con", nickname: "Cún Con", x: 0.78, y: 0.68, mood: "normal", glow: 2, outfit: "outfit_ao_len", hair: "hair_high_pony", clip: "accessory_flower_clip", sample: true },
  { id: "hat-de", nickname: "Hạt Dẻ", x: 0.88, y: 0.76, mood: "happy", glow: 3, outfit: "outfit_ao_thun_yem", hair: "hair_sleep_buns", clip: "accessory_ribbon_bow", sample: true },
  { id: "gau-mo", nickname: "Gấu Mơ", x: 0.04, y: 0.82, mood: "normal", glow: 2, outfit: "outfit_pajamas", hair: "hair_short_bob", clip: "accessory_flower_clip", sample: true },
  { id: "dau-tay", nickname: "Dâu Tây", x: 0.18, y: 0.84, mood: "sparkle", glow: 4, outfit: "outfit_vay_hoa", hair: "hair_twin_tails", clip: null, sample: true },
  { id: "bo-xanh", nickname: "Bơ Xanh", x: 0.34, y: 0.8, mood: "happy", glow: 5, outfit: "outfit_ao_dai", hair: "hair_high_pony", clip: "accessory_ribbon_bow", sample: true },
  { id: "be-mit", nickname: "Bé Mít", x: 0.54, y: 0.86, mood: "sleepy", glow: 1, outfit: "outfit_hoodie", hair: "hair_sleep_buns", clip: "accessory_flower_clip", sample: true },
  { id: "su-kem", nickname: "Su Kem", x: 0.7, y: 0.84, mood: "sparkle", glow: 5, outfit: "outfit_ao_len", hair: "hair_short_bob", clip: null, sample: true },
  { id: "bong-gon", nickname: "Bông Gòn", x: 0.94, y: 0.8, mood: "happy", glow: 4, outfit: "outfit_ao_thun_yem", hair: "hair_twin_tails", clip: "accessory_ribbon_bow", sample: true },
];

/** Sample visitors plus the player's own Bé Da. */
export function lobbyHeadCount(): number {
  return SAMPLE_LOBBY_FRIENDS.length + 1;
}

/** Where the player's Bé Da stands in the wide world. */
export const LOBBY_PLAYER_SPOT = { x: 0.46, y: 0.78 };

/**
 * Sample visitors stay at or above this fraction of the walk band.
 * The band itself ends above the round nav, so a tag anchored at y never
 * enters that strip.
 */
export const LOBBY_WALK_Y_MAX = 0.9;

export type LobbySpot = { id: string; x: number; y: number };

/** Gap between the floating action card and the friend's head or the nav. */
export const FRIEND_CARD_GAP = 8;

const TAG_NUDGE_PX = 48;

/**
 * Map an authored lobby depth onto the walk band.
 * Foreground visitors land just above the nav instead of leaving a vacant strip.
 */
export function lobbyWalkY(y: number): number {
  const t = Math.min(1, Math.max(0, (y - 0.46) / 0.42));
  return 0.48 + t * 0.49;
}

/**
 * Inverse of `lobbyWalkY` for a tap on the plaza.
 * Returns null when the tap is in the sky, above the walk band.
 */
export function lobbyDepthY(visualY: number): number | null {
  if (visualY < 0.45 || visualY > 0.98) return null;
  const t = Math.min(1, Math.max(0, (visualY - 0.48) / 0.49));
  return Math.min(LOBBY_WALK_Y_MAX, Math.max(0.46, 0.46 + t * 0.42));
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
