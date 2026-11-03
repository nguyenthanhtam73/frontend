/** Closet choices for the trial screen. Files live under public/mascot. No server round-trip. */

export const GAME_LOOK_KEY = "beda-game-look";

/** `outfits/outfit_*.svg`. Đồ ngủ uses the same drawing as the original pajamas. */
export const GAME_OUTFITS = [
  "outfit_pajamas",
  "outfit_ao_dai",
  "outfit_hoodie",
  "outfit_vay_hoa",
  "outfit_ao_thun_yem",
  "outfit_ao_len",
] as const;

export const GAME_HAIRS = [
  "hair_sleep_buns",
  "hair_twin_tails",
  "hair_short_bob",
  "hair_high_pony",
] as const;

/** Left-side clips. The star clip stays on the right and is not one of these. */
export const GAME_CLIPS = ["accessory_flower_clip", "accessory_ribbon_bow"] as const;

export type GameOutfitId = (typeof GAME_OUTFITS)[number];
export type GameHairId = (typeof GAME_HAIRS)[number];
export type GameClipId = (typeof GAME_CLIPS)[number];
export type GamePose = "wave" | "cheer";

export type GameLook = {
  outfit: GameOutfitId;
  hair: GameHairId;
  clip: GameClipId | null;
};

/** Passed into the layer stack. Pose adds the matching sleeve art. */
export type GameDress = {
  outfitId: GameOutfitId;
  hairId: GameHairId;
  clipId: GameClipId | null;
  pose?: GamePose | null;
};

export const DEFAULT_GAME_LOOK: GameLook = {
  outfit: "outfit_pajamas",
  hair: "hair_sleep_buns",
  clip: null,
};

const OUTFITS = new Set<string>(GAME_OUTFITS);
const HAIRS = new Set<string>(GAME_HAIRS);
const CLIPS = new Set<string>(GAME_CLIPS);

export function isGameOutfit(id: string): id is GameOutfitId {
  return OUTFITS.has(id);
}

export function isGameHair(id: string): id is GameHairId {
  return HAIRS.has(id);
}

export function isGameClip(id: string): id is GameClipId {
  return CLIPS.has(id);
}

export function gameDress(look: GameLook, pose?: GamePose | null): GameDress {
  return {
    outfitId: look.outfit,
    hairId: look.hair,
    clipId: look.clip,
    pose: pose ?? null,
  };
}

type Store = Pick<Storage, "getItem" | "setItem">;

/** A broken or unknown value is ignored so the figure stays on the default files. */
export function readGameLook(storage: Pick<Storage, "getItem">): GameLook | null {
  const raw = storage.getItem(GAME_LOOK_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { outfit?: unknown; hair?: unknown; clip?: unknown };
    if (typeof parsed.outfit !== "string" || !isGameOutfit(parsed.outfit)) return null;
    if (typeof parsed.hair !== "string" || !isGameHair(parsed.hair)) return null;
    const clip =
      parsed.clip == null ? null : typeof parsed.clip === "string" && isGameClip(parsed.clip) ? parsed.clip : null;
    if (parsed.clip != null && clip == null) return null;
    return { outfit: parsed.outfit, hair: parsed.hair, clip };
  } catch {
    return null;
  }
}

export function writeGameLook(storage: Store, look: GameLook): void {
  storage.setItem(
    GAME_LOOK_KEY,
    JSON.stringify({ outfit: look.outfit, hair: look.hair, clip: look.clip }),
  );
}
