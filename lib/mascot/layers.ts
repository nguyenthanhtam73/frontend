import {
  DEFAULT_MASCOT_IDS,
  isKnownMascotItem,
  type MascotItemLayer,
} from "@/lib/mascot/catalog";
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
  eyeLeft: [94, 102],
  eyeRight: [126, 102],
  browLeft: [94, 90],
  browRight: [126, 90],
  mouth: [110, 122],
  cheekLeft: [80, 116],
  cheekRight: [140, 116],
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
  options: { reaction?: string | null; stepPose?: string | null; locale?: string; now?: number } = {},
): StackLayer[] {
  const now = options.now ?? Date.now();
  const mood = moodLayer(view.mood);
  const layers: StackLayer[] = [];
  const push = (slot: string, src: string, opacity = 1) => {
    if (opacity <= 0) return;
    layers.push({ slot, src, opacity });
  };
  const level = view.glowLevel;
  const showAccessory = (item: WornItem) =>
    accessoryUnlocked(item.id, level, item.source === "shop" || view.shopItemIds.includes(item.id));

  // Halo sits behind the room and the body. Back view keeps this layer.
  push("glow-back", glowLayerSrc(level, "back"));

  for (const room of view.loadout.roomItems) {
    if (!isKnownMascotItem(room.id, "room")) continue;
    const opacity = optionalOpacity(room, now);
    if (opacity == null) continue;
    push("props-room", `/mascot/props/${room.id}.svg`, opacity);
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
    push("glow", glowLayerSrc(level, "mid"));
  }

  if (showFace) {
    for (const mark of view.marks) {
      push(
        "skin-marks",
        `/mascot/skin_marks/${mark.concern}_${mark.level}.svg`,
        markOpacity(mark.level),
      );
    }
  }

  if (view.disheveled > 0) {
    push("messy", `/mascot/messy/${view.disheveled}.svg`, 1);
  }

  if (showFace) {
    for (const part of ["brows", "eyes", "mouth"] as const) {
      push(`face-${part}`, facePartSrc(expression, part, faceId), faceOpacity ?? 1);
    }
  }

  for (const accessory of view.loadout.accessories) {
    if (accessory.id === DEFAULT_MASCOT_IDS.headband) continue;
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
  push("glow-front", glowLayerSrc(level, "front"));

  for (const prop of frontProps(view, options.locale ?? "vi")) {
    push("props-front", prop, 1);
  }
  if (options.stepPose) push("props-front", poseSrc(options.stepPose), 1);

  if (showFace) {
    push("fx-eyelids", "/mascot/fx/eyelids.svg", 1);
    push("fx-yawn", "/mascot/fx/yawn.svg", 1);
  }
  if (view.flies) push("fx-flies", "/mascot/fx/flies/flies.svg", 1);

  return layers;
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
