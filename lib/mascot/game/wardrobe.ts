/**
 * Player closet. One entry here is one item.
 * `grant` is reserved for later: "gift" (complete something) or "sell".
 * Only "default" is owned today. Do not build gifting or selling here.
 * Lobby visitors can still wear the other drawings; those are not closet items.
 */

import {
  DEFAULT_GAME_LOOK,
  isGameClip,
  isGameHair,
  isGameOutfit,
  type GameClipId,
  type GameHairId,
  type GameLook,
  type GameOutfitId,
} from "@/lib/mascot/game/look";

export type WardrobeSlot = "outfit" | "hair" | "clip";

/** How a player can receive an item. Only "default" is granted today. */
export type WardrobeGrant = "default" | "gift" | "sell";

export type WardrobeItem = {
  id: GameOutfitId | GameHairId | GameClipId;
  slot: WardrobeSlot;
  grant: WardrobeGrant;
};

/** The piece Bé Da is already wearing. Add one object when a new item exists. */
export const WARDROBE_CATALOG: readonly WardrobeItem[] = [
  { id: "outfit_pajamas", slot: "outfit", grant: "default" },
];

export function grantedWardrobeItems(slot?: WardrobeSlot): readonly WardrobeItem[] {
  return WARDROBE_CATALOG.filter((item) => item.grant === "default" && (slot == null || item.slot === slot));
}

export function wardrobeThumbSrc(item: WardrobeItem): string {
  if (item.slot === "hair") return `/mascot/hair/${item.id}.svg`;
  if (item.slot === "clip") return `/mascot/accessory/${item.id}.svg`;
  return `/mascot/outfits/${item.id}.svg`;
}

/**
 * What the player is shown wearing. A saved look that names a removed item
 * falls back to the default piece. The stored value is left untouched.
 */
export function equippedGameLook(look: GameLook | null | undefined): GameLook {
  const base = look ?? DEFAULT_GAME_LOOK;
  const outfits = new Set(grantedWardrobeItems("outfit").map((item) => item.id));
  const hairs = new Set(grantedWardrobeItems("hair").map((item) => item.id));
  const clips = new Set(grantedWardrobeItems("clip").map((item) => item.id));
  const outfit = isGameOutfit(base.outfit) && outfits.has(base.outfit) ? base.outfit : DEFAULT_GAME_LOOK.outfit;
  const hair = isGameHair(base.hair) && hairs.has(base.hair) ? base.hair : DEFAULT_GAME_LOOK.hair;
  const clip = base.clip && isGameClip(base.clip) && clips.has(base.clip) ? base.clip : null;
  return { outfit, hair, clip };
}
