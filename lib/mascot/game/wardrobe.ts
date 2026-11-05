/**
 * Player closet. One entry here is one item.
 * `grant` is how the item is owned. "default" is everyone. "admin" follows
 * is_admin and stays out of every other account's list. "gift" and "sell"
 * are reserved. Do not build gifting or selling here.
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

/** How a player can receive an item. "admin" is not in the shared owned list. */
export type WardrobeGrant = "default" | "admin" | "gift" | "sell";

export type ClosetAccess = {
  admin?: boolean;
};

export type WardrobeItem = {
  id: GameOutfitId | GameHairId | GameClipId;
  slot: WardrobeSlot;
  grant: WardrobeGrant;
};

/** The piece Bé Da is already wearing. Add one object when a new item exists. */
export const WARDROBE_CATALOG: readonly WardrobeItem[] = [
  { id: "outfit_pajamas", slot: "outfit", grant: "default" },
  { id: "outfit_ao_thu", slot: "outfit", grant: "admin" },
];

/** Default rows only, unless access.admin is set. Admin rows stay hidden otherwise. */
export function grantedWardrobeItems(slot?: WardrobeSlot, access?: ClosetAccess): readonly WardrobeItem[] {
  const admin = access?.admin === true;
  return WARDROBE_CATALOG.filter((item) => {
    if (slot != null && item.slot !== slot) return false;
    if (item.grant === "default") return true;
    if (item.grant === "admin") return admin;
    return false;
  });
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
export function equippedGameLook(look: GameLook | null | undefined, access?: ClosetAccess): GameLook {
  const base = look ?? DEFAULT_GAME_LOOK;
  const outfits = new Set(grantedWardrobeItems("outfit", access).map((item) => item.id));
  const hairs = new Set(grantedWardrobeItems("hair", access).map((item) => item.id));
  const clips = new Set(grantedWardrobeItems("clip", access).map((item) => item.id));
  const outfit = isGameOutfit(base.outfit) && outfits.has(base.outfit) ? base.outfit : DEFAULT_GAME_LOOK.outfit;
  const hair = isGameHair(base.hair) && hairs.has(base.hair) ? base.hair : DEFAULT_GAME_LOOK.hair;
  const clip = base.clip && isGameClip(base.clip) && clips.has(base.clip) ? base.clip : null;
  return { outfit, hair, clip };
}
