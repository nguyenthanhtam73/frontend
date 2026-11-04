import {
  DEFAULT_MASCOT_IDS,
  isKnownMascotItem,
  type MascotItemLayer,
} from "@/lib/mascot/catalog";
import type { GameDress } from "@/lib/mascot/game/look";
import { isGameClip, isGameHair, isGameOutfit } from "@/lib/mascot/game/look";
import { accessoryUnlocked } from "@/lib/mascot/glow";
import {
  itemLook,
  itemOpacity,
  markOpacity,
  moodLayer,
  type BeDaView,
  type DisheveledLevel,
  type WornItem,
} from "@/lib/mascot/model";

/** Shared with Android. Every file in public/mascot uses this viewBox. */
export const MASCOT_VIEWBOX = "0 0 220 250";

/**
 * Fixed points in that viewBox. Generated face/hair art must use these
 * and leave the other slots' anchors clear so outfits and clips still fit.
 */
export const MASCOT_ANCHORS = {
  headCenter: [110, 104],
  faceRadius: 42,
  eyeLeft: [94, 111],
  eyeRight: [126, 111],
  browLeft: [94, 99],
  browRight: [126, 99],
  mouth: [110, 130],
  cheekLeft: [84, 123],
  cheekRight: [136, 123],
  hairCrown: [110, 58],
  hairBunLeft: [64, 86],
  hairBunRight: [156, 86],
  accessoryClip: [156, 62],
  torsoCenter: [110, 168],
  outfitTop: 146,
  ground: [110, 228],
} as const;

export const FACE_PARTS = ["cheeks", "brows", "eyes", "mouth"] as const;
export type FacePart = (typeof FACE_PARTS)[number];

/** Bottom → top. Outfits stay under hair and face parts. Glow wraps the body. */
export const LAYER_ORDER = [
  "glow-back",
  "props-room",
  "body",
  "outfit",
  "hair",
  "accessory-headband",
  "face-cheeks",
  "glow",
  "skin-marks",
  "messy",
  "face-brows",
  "face-eyes",
  "face-mouth",
  "accessory",
  "glow-front",
  "props-front",
  "fx-eyelids",
  "fx-yawn",
  "fx-flies",
] as const;

export type StackLayer = {
  src: string;
  opacity: number;
  slot: string;
};

const SIT = new Set(["sad_pillow", "note_on_mirror", "waiting_door_sign"]);
const NO_FACE = new Set(["back_turned"]);

const REACTIONS = new Set(["laugh", "startled", "pouty"]);

function equipped(
  item: WornItem,
  layer: MascotItemLayer,
  fallback: string,
  now: number,
): { id: string; opacity: number } {
  const known = isKnownMascotItem(item.id, layer);
  const look = itemLook(item.expiresAt, now);
  if (!known || look === "hidden") return { id: fallback, opacity: 1 };
  return { id: item.id, opacity: itemOpacity(look) };
}

function optionalOpacity(item: WornItem, now: number): number | null {
  const look = itemLook(item.expiresAt, now);
  if (look === "hidden") return null;
  return itemOpacity(look);
}

export function mascotStack(
  view: BeDaView,
  options: {
    reaction?: string | null;
    stepPose?: string | null;
    locale?: string;
    now?: number;
    /**
     * Game closet only. Swaps the outfit and hair files and inserts sleeves
     * and a left clip. Home Bé Da leaves this unset.
     * Order matches public/mascot/LAYERS-NEW.md.
     */
    dress?: GameDress | null;
    /**
     * Lobby and spa visitors. Happy open eyes, body shadow, hair, and clothes.
     * No room stickers, glow sparkles, star clip, or sleepy props.
     */
    crowd?: boolean;
  } = {},
): StackLayer[] {
  const now = options.now ?? Date.now();
  const crowd = options.crowd === true;
  const mood = crowd ? "happy" : moodLayer(view.mood);
  const layers: StackLayer[] = [];
  const push = (slot: string, src: string, opacity = 1) => {
    if (opacity <= 0) return;
    layers.push({ slot, src, opacity });
  };
  const level = view.glowLevel;
  const showAccessory = (item: WornItem) =>
    accessoryUnlocked(item.id, level, item.source === "shop" || view.shopItemIds.includes(item.id));

  // Halo sits behind the room and the body. Back view keeps this layer.
  // Crowd figures keep the body shadow only, so the glow plates stay off.
  if (!crowd) push("glow-back", glowLayerSrc(level, "back"));

  if (!crowd) {
    for (const room of view.loadout.roomItems) {
      if (!isKnownMascotItem(room.id, "room")) continue;
      const opacity = optionalOpacity(room, now);
      if (opacity == null) continue;
      push("props-room", `/mascot/props/${room.id}.svg`, opacity);
    }
  }

  const body = equipped(view.loadout.body, "body", DEFAULT_MASCOT_IDS.body, now);
  const bodyFile = mood === "back_turned" ? "body_back" : SIT.has(mood) ? "body_sit" : body.id;
  push("body", `/mascot/body/${bodyFile}.svg`, bodyFile === body.id ? body.opacity : 1);

  const outfit = equipped(view.loadout.outfit, "outfit", DEFAULT_MASCOT_IDS.outfit, now);
  push("outfit", `/mascot/outfit/${outfit.id}.svg`, outfit.opacity);

  const hair = equipped(view.loadout.hair, "hair", DEFAULT_MASCOT_IDS.hair, now);
  push("hair", `/mascot/hair/${hair.id}.svg`, hair.opacity);
  for (const band of view.loadout.accessories) {
    if (band.id !== DEFAULT_MASCOT_IDS.headband) continue;
    if (!showAccessory(band)) continue;
    const opacity = optionalOpacity(band, now);
    if (opacity == null || !isKnownMascotItem(band.id, "accessory")) continue;
    push("accessory-headband", `/mascot/accessory/${band.id}.svg`, opacity);
  }

  const customFace = view.loadout.face;
  const faceOpacity = customFace ? optionalOpacity(customFace, now) : null;
  const faceId = customFace && faceOpacity != null ? customFace.id : null;
  const expression =
    options.reaction && REACTIONS.has(options.reaction) ? options.reaction : mood;
  const showFace = !NO_FACE.has(mood);

  if (showFace) {
    push("face-cheeks", facePartSrc(expression, "cheeks", faceId), faceOpacity ?? 1);
    // Face plate stays under the latest check-in marks so glow never covers them.
    // Back view skips this layer. The front sparkle file is a later slot.
    if (!crowd) push("glow", glowLayerSrc(level, "mid"));
  }

  if (showFace && !crowd) {
    for (const mark of view.marks) {
      push(
        "skin-marks",
        `/mascot/skin_marks/${mark.concern}_${mark.level}.svg`,
        markOpacity(mark.level),
      );
    }
  }

  if (!crowd && view.disheveled > 0) {
    push("messy", `/mascot/messy/${view.disheveled}.svg`, 1);
  }

  if (showFace) {
    for (const part of ["brows", "eyes", "mouth"] as const) {
      push(`face-${part}`, facePartSrc(expression, part, faceId), faceOpacity ?? 1);
    }
  }

  for (const accessory of view.loadout.accessories) {
    if (accessory.id === DEFAULT_MASCOT_IDS.headband) continue;
    if (crowd && accessory.id === "accessory_star_clip") continue;
    if (!showAccessory(accessory)) continue;
    const look = itemLook(accessory.expiresAt, now);
    if (look === "hidden") continue;
    const known = isKnownMascotItem(accessory.id, "accessory");
    push(
      "accessory",
      `/mascot/accessory/${known ? accessory.id : DEFAULT_MASCOT_IDS.accessory}.svg`,
      known ? itemOpacity(look) : 1,
    );
  }

  // Sparkles sit over the mouth and clips, under foreground props and blink/yawn.
  if (!crowd) push("glow-front", glowLayerSrc(level, "front"));

  if (!crowd) {
    for (const prop of frontProps(view, options.locale ?? "vi")) {
      push("props-front", prop, 1);
    }
  }
  if (options.stepPose) push("props-front", poseSrc(options.stepPose), 1);

  if (showFace && !crowd) {
    push("fx-eyelids", "/mascot/fx/eyelids.svg", 1);
    push("fx-yawn", "/mascot/fx/yawn.svg", 1);
  }
  if (view.flies) push("fx-flies", "/mascot/fx/flies/flies.svg", 1);

  return options.dress ? applyGameDress(layers, options.dress) : layers;
}

/**
 * Closet art sits in the same slots as the shop outfit and hair.
 * Sleeves come right after the outfit. A flower or ribbon sits after the
 * headband and before the cheeks. The star clip stays on the right.
 */
export function applyGameDress(layers: StackLayer[], dress: GameDress): StackLayer[] {
  if (!isGameOutfit(dress.outfitId) || !isGameHair(dress.hairId)) return layers;
  const next = layers.map((layer) => {
    if (layer.slot === "outfit") return { ...layer, src: `/mascot/outfits/${dress.outfitId}.svg` };
    if (layer.slot === "hair") return { ...layer, src: `/mascot/hair/${dress.hairId}.svg` };
    return layer;
  });
  const outfitAt = next.findIndex((layer) => layer.slot === "outfit");
  if (outfitAt >= 0 && (dress.pose === "wave" || dress.pose === "cheer")) {
    const arm = dress.pose === "wave" ? "arm_wave_right" : "arms_up";
    const sleeve = dress.outfitId.replace(/^outfit_/, "");
    next.splice(outfitAt + 1, 0, {
      slot: "arms",
      src: `/mascot/outfits/${arm}__${sleeve}.svg`,
      opacity: 1,
    });
  }
  if (dress.clipId && isGameClip(dress.clipId)) {
    let at = next.findIndex((layer) => layer.slot === "accessory-headband");
    if (at < 0) at = next.findIndex((layer) => layer.slot === "hair");
    if (at >= 0) {
      next.splice(at + 1, 0, {
        slot: "accessory-clip",
        src: `/mascot/accessory/${dress.clipId}.svg`,
        opacity: 1,
      });
    }
  }
  return next;
}

export function glowLayerSrc(level: number, part: "back" | "mid" | "front"): string {
  if (part === "mid") return `/mascot/glow/level_${level}.svg`;
  return `/mascot/glow/level_${level}_${part}.svg`;
}

export function facePartSrc(expression: string, part: FacePart, faceItemId: string | null): string {
  if (faceItemId) return `/mascot/faces/items/${faceItemId}/${part}.svg`;
  return `/mascot/faces/${expression}/${part}.svg`;
}

function frontProps(view: BeDaView, locale: string): string[] {
  const mood = moodLayer(view.mood);
  const en = locale.toLowerCase().startsWith("en");
  const out: string[] = [];
  if (mood === "sad_pillow") out.push("/mascot/props/pillow.svg");
  if (mood === "note_on_mirror") out.push(en ? "/mascot/props/mirror_en.svg" : "/mascot/props/mirror.svg");
  if (mood === "suitcase_leaving") out.push("/mascot/props/suitcase.svg");
  if (mood === "pot_on_head_corner") out.push("/mascot/props/pot.svg");
  if (mood === "waiting_door_sign") {
    out.push("/mascot/props/door.svg");
    const abandoned = view.sign === "abandoned";
    if (abandoned) out.push(en ? "/mascot/props/sign_abandoned_en.svg" : "/mascot/props/sign_abandoned.svg");
    else out.push(en ? "/mascot/props/sign_come_back_en.svg" : "/mascot/props/sign_come_back.svg");
  }
  if (mood === "sleepy") out.push("/mascot/props/zzz.svg");
  if (mood === "sparkle" || mood === "hug_return") out.push("/mascot/props/sparkles.svg");
  return out;
}

export function poseSrc(pose: string): string {
  return `/mascot/props/pose_${pose}.svg`;
}

export function messySlotHidden(level: DisheveledLevel, tidy: boolean): boolean {
  return tidy || level <= 0;
}
