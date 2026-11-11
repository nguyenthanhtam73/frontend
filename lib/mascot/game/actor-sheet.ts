/**
 * Bé Da spritesheet names. Pixi loads `<outfit>__<hair>.json` with Assets.
 * Frames are idle, walk, and wave. The PNG sits beside the JSON.
 */

export const SHEET_FRAME = { w: 176, h: 200 } as const;

/** Bottom of the frame, where the ground shadow ends. Matches the DOM figure box. */
export const SHEET_ANCHOR_Y = 1;

const OUTFITS = new Set([
  "outfit_pajamas",
  "outfit_ao_dai",
  "outfit_hoodie",
  "outfit_vay_hoa",
  "outfit_ao_thun_yem",
  "outfit_ao_len",
  "outfit_ao_thu",
]);

const HAIRS = new Set(["hair_sleep_buns", "hair_twin_tails", "hair_short_bob", "hair_high_pony"]);

export type ActorClip = "idle" | "walk" | "wave";

export function sheetKey(outfit: string, hair: string): string {
  const worn = OUTFITS.has(outfit) ? outfit : "outfit_pajamas";
  const style = HAIRS.has(hair) ? hair : "hair_sleep_buns";
  return `${worn}__${style}`;
}

export function sheetJsonUrl(outfit: string, hair: string): string {
  return `/mascot/game/sheets/${sheetKey(outfit, hair)}.json`;
}

/** Pull the closet ids out of the layer list the shell already carries. */
export function lookFromArt(art: readonly string[]): { outfit: string; hair: string } {
  let outfit = "outfit_pajamas";
  let hair = "hair_sleep_buns";
  for (const src of art) {
    const worn = src.match(/\/outfits\/(outfit_[a-z0-9_]+)\.svg/);
    const style = src.match(/\/hair\/(hair_[a-z0-9_]+)\.svg/);
    if (worn?.[1] && OUTFITS.has(worn[1])) outfit = worn[1];
    if (style?.[1] && HAIRS.has(style[1])) hair = style[1];
  }
  return { outfit, hair };
}

/** Walking wins. A wave or cheer plays only while her feet are still. */
export function actorClip(moving: boolean, pose: string | null | undefined): ActorClip {
  if (moving) return "walk";
  if (pose === "wave" || pose === "cheer") return "wave";
  return "idle";
}
