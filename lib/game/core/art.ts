import type { GameDress, GameLook } from "@/lib/mascot/game/look";
import { gameDress } from "@/lib/mascot/game/look";
import { mascotStack } from "@/lib/mascot/layers";
import type { BeDaView } from "@/lib/mascot/model";

/** Layers the canvas draws. Blink lids stay out so the phone is not decoding an extra plate. */
export function shellArt(
  view: BeDaView,
  dress: GameDress | null,
  crowd: boolean,
  marks?: boolean,
): string[] {
  return mascotStack(view, { dress, crowd, marks, locale: "vi" })
    .filter((layer) => layer.opacity > 0 && layer.slot !== "fx-eyelids" && layer.slot !== "fx-yawn")
    .map((layer) => layer.src);
}

export function lookArt(view: BeDaView, look: GameLook, crowd: boolean, marks?: boolean): string[] {
  return shellArt(view, gameDress(look), crowd, marks);
}

/**
 * The signed-in player's v2 sheet.
 * Lobby, spa, and the private room must pass this same list so a chosen
 * outfit, hair, and Nữ/Nam variant resolve to one spritesheet.
 * Crowd art drops the home stickers (moon, plant, pillow) and the glow plates.
 */
export function playerActorArt(view: BeDaView, look: GameLook): string[] {
  return lookArt(view, look, true, true);
}
