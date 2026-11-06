import type { GameDress, GameLook } from "@/lib/mascot/game/look";
import { gameDress } from "@/lib/mascot/game/look";
import { mascotStack } from "@/lib/mascot/layers";
import type { BeDaView } from "@/lib/mascot/model";

/** Layers the canvas draws. Blink lids stay out so the phone is not decoding an extra plate. */
export function shellArt(view: BeDaView, dress: GameDress | null, crowd: boolean): string[] {
  return mascotStack(view, { dress, crowd, locale: "vi" })
    .filter((layer) => layer.opacity > 0 && layer.slot !== "fx-eyelids" && layer.slot !== "fx-yawn")
    .map((layer) => layer.src);
}

export function lookArt(view: BeDaView, look: GameLook, crowd: boolean): string[] {
  return shellArt(view, gameDress(look), crowd);
}
