/**
 * Bé Da spritesheet names. Each sheet is one full layer stack
 * (body, outfit, hair, accessories, glow), rasterized at 2×.
 * Pixi loads the JSON with Assets. The PNG sits beside it.
 */

/** CSS size of one frame. The PNG is this times SHEET_DPR. */
export const SHEET_CSS = { w: 220, h: 250 } as const;
export const SHEET_DPR = 2;
export const SHEET_FRAME = { w: SHEET_CSS.w * SHEET_DPR, h: SHEET_CSS.h * SHEET_DPR } as const;

/**
 * Shoes on the 250px sheet (body legs end at y=208).
 * The baked ground shadow hangs just below this line.
 */
export const SHEET_ANCHOR_Y = 208 / 250;

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

/** Stable id for one exact layer list, so a bow or a glow plate gets its own sheet. */
export function sheetKeyFromArt(art: readonly string[]): string {
  const look = lookFromArt(art);
  let hash = 2166136261;
  const text = art.join("\n");
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${sheetKey(look.outfit, look.hair)}__${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function sheetJsonUrlFromArt(art: readonly string[]): string {
  return `/mascot/game/sheets/${sheetKeyFromArt(art)}.json`;
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
