/**
 * Shop item ids. The backend catalog (free grants and loadout strings)
 * must use these exact ids. Pose files such as body_sit are not shop items.
 */
export const MASCOT_LAYERS = ["body", "hair", "outfit", "accessory", "room"] as const;
export type MascotItemLayer = (typeof MASCOT_LAYERS)[number];

export type MascotCatalogItem = {
  id: string;
  layer: MascotItemLayer;
  name: string;
};

export const MASCOT_CATALOG: readonly MascotCatalogItem[] = [
  { id: "body_chibi", layer: "body", name: "Bé Da" },
  { id: "hair_sleep_buns", layer: "hair", name: "Tóc búi ngủ" },
  { id: "outfit_cozy_pajamas", layer: "outfit", name: "Pijama ấm" },
  { id: "accessory_star_clip", layer: "accessory", name: "Kẹp sao" },
  { id: "accessory_pink_headband", layer: "accessory", name: "Băng đô hồng" },
  { id: "room_moon", layer: "room", name: "Trăng" },
  { id: "room_plant", layer: "room", name: "Cây nhỏ" },
  { id: "room_pillow", layer: "room", name: "Gối" },
];

export const DEFAULT_ACCESSORY_IDS = [
  "accessory_pink_headband",
  "accessory_star_clip",
] as const;

export const DEFAULT_MASCOT_IDS = {
  body: "body_chibi",
  hair: "hair_sleep_buns",
  outfit: "outfit_cozy_pajamas",
  accessory: "accessory_star_clip",
  headband: "accessory_pink_headband",
} as const;

const KNOWN = new Set(MASCOT_CATALOG.map((item) => `${item.layer}:${item.id}`));

export function isKnownMascotItem(id: string, layer: MascotItemLayer): boolean {
  return KNOWN.has(`${layer}:${id}`);
}

/** Unknown shop ids render the default art for that layer. */
export function resolveMascotItemId(
  id: string,
  layer: MascotItemLayer,
  fallback: string,
): string {
  return isKnownMascotItem(id, layer) ? id : fallback;
}
