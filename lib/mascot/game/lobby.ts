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
  /** Temporary outfit recolor, degrees. */
  hue: number;
  sample: true;
};

export const SAMPLE_LOBBY_FRIENDS: readonly SampleLobbyFriend[] = [
  { id: "nang-som", nickname: "Nắng Sớm", x: 0.06, y: 0.5, mood: "normal", glow: 1, hue: 18, sample: true },
  { id: "suong-mai", nickname: "Sương Mai", x: 0.14, y: 0.58, mood: "happy", glow: 3, hue: 40, sample: true },
  { id: "tra-sua", nickname: "Trà Sữa", x: 0.22, y: 0.48, mood: "sparkle", glow: 3, hue: 200, sample: true },
  { id: "may-hong", nickname: "Mây Hồng", x: 0.72, y: 0.48, mood: "happy", glow: 4, hue: 330, sample: true },
  { id: "chanh-leo", nickname: "Chanh Leo", x: 0.82, y: 0.56, mood: "normal", glow: 2, hue: 70, sample: true },
  { id: "oc-que", nickname: "Ốc Quế", x: 0.91, y: 0.62, mood: "happy", glow: 4, hue: 230, sample: true },
  { id: "meo-may", nickname: "Mèo Máy", x: 0.12, y: 0.7, mood: "happy", glow: 5, hue: 160, sample: true },
  { id: "banh-flan", nickname: "Bánh Flan", x: 0.28, y: 0.66, mood: "happy", glow: 3, hue: 350, sample: true },
  { id: "keo-deo", nickname: "Kẹo Dẻo", x: 0.6, y: 0.74, mood: "sleepy", glow: 4, hue: 300, sample: true },
  { id: "cun-con", nickname: "Cún Con", x: 0.78, y: 0.68, mood: "normal", glow: 2, hue: 180, sample: true },
  { id: "hat-de", nickname: "Hạt Dẻ", x: 0.88, y: 0.76, mood: "happy", glow: 3, hue: 20, sample: true },
  { id: "gau-mo", nickname: "Gấu Mơ", x: 0.04, y: 0.82, mood: "normal", glow: 2, hue: 250, sample: true },
  { id: "dau-tay", nickname: "Dâu Tây", x: 0.18, y: 0.84, mood: "sparkle", glow: 4, hue: 340, sample: true },
  { id: "bo-xanh", nickname: "Bơ Xanh", x: 0.34, y: 0.8, mood: "happy", glow: 5, hue: 100, sample: true },
  { id: "be-mit", nickname: "Bé Mít", x: 0.54, y: 0.86, mood: "sleepy", glow: 1, hue: 30, sample: true },
  { id: "su-kem", nickname: "Su Kem", x: 0.7, y: 0.84, mood: "sparkle", glow: 5, hue: 50, sample: true },
  { id: "bong-gon", nickname: "Bông Gòn", x: 0.94, y: 0.8, mood: "happy", glow: 4, hue: 140, sample: true },
];

/** Sample visitors plus the player's own Bé Da. */
export function lobbyHeadCount(): number {
  return SAMPLE_LOBBY_FRIENDS.length + 1;
}

/** Where the player's Bé Da stands in the wide world. */
export const LOBBY_PLAYER_SPOT = { x: 0.46, y: 0.78 };

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
