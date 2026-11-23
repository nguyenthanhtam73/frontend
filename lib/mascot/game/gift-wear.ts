import catalog from "@/lib/mascot/game/gift-wear.json";

/**
 * Gift clothes are drawn from this file, not from hardcoded paths.
 * Drop a new SVG at the slot path (`/mascot/gift/{dir}/{id}.svg`) and it is worn
 * with no code change. Set `legs_above` on an item when the legs drawing
 * must sit above that bottom. Shoes use `/mascot/gift/shoes/{id}.svg` when
 * the item sets `shoes`.
 */
export type GiftItemHint = {
  legs_above?: boolean;
  legs_src?: string;
  shoes?: boolean;
  shoes_src?: string;
  src?: string;
  sleeve?: "short" | "long";
  fx_back?: string;
  fx_front?: string;
};

export type GiftWearHints = {
  items?: Record<string, GiftItemHint>;
};

type Catalog = {
  root: string;
  order: string[];
  slots: Record<string, string>;
  alias: Record<string, string>;
  icon: string;
  legs: string;
  shoes: string;
  sleeve: string;
  bracelet: string;
  poses: Record<string, string>;
  shortSleeves: string[];
  fx: Record<string, { back?: string; front?: string }>;
  items: Record<string, GiftItemHint>;
};

const wear = catalog as Catalog;

export function giftItemHint(id: string, hints?: GiftWearHints): GiftItemHint {
  if (!id) return {};
  return { ...(wear.items[id] ?? {}), ...(hints?.items?.[id] ?? {}) };
}

export function giftFileId(id: string): string {
  return wear.alias[id] || id;
}

export function giftSrc(slot: string, id: string, hints?: GiftWearHints): string | null {
  if (!id) return null;
  const spec = giftItemHint(id, hints);
  if (spec.src) return spec.src;
  const dir = wear.slots[slot];
  if (!dir) return null;
  return `${wear.root}/${dir}/${giftFileId(id)}.svg`;
}

export function giftPoseName(pose: string | null | undefined): string {
  if (pose && wear.poses[pose]) return wear.poses[pose];
  return wear.poses.default || "arm_chin";
}

export function giftSleeveLength(topId: string, hints?: GiftWearHints): "short" | "long" {
  const spec = giftItemHint(topId, hints);
  if (spec.sleeve === "short" || spec.sleeve === "long") return spec.sleeve;
  if (!topId || wear.shortSleeves.includes(topId)) return "short";
  return "long";
}

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
}

/** Tight item drawing for closet tiles and the reveal list. The file is cropped to the piece. */
export function giftIconSrc(id: string): string {
  return fill(wear.icon, { id: giftFileId(id) });
}

export function giftSleeveSrc(topId: string, pose: string | null | undefined): string {
  return fill(wear.sleeve, { id: giftFileId(topId), pose: giftPoseName(pose) });
}

export function giftBraceletSrc(id: string, pose: string | null | undefined, topId: string, hints?: GiftWearHints): string {
  return fill(wear.bracelet, {
    id: giftFileId(id),
    pose: giftPoseName(pose),
    length: giftSleeveLength(topId, hints),
  });
}

export function legsAboveBottom(bottomId: string, hints?: GiftWearHints): boolean {
  return giftItemHint(bottomId, hints).legs_above === true;
}

export function legsSrc(bottomId: string, hints?: GiftWearHints): string {
  const spec = giftItemHint(bottomId, hints);
  return spec.legs_src || fill(wear.legs, { id: giftFileId(bottomId) });
}

export function shoesSrc(bottomId: string, hints?: GiftWearHints): string | null {
  const spec = giftItemHint(bottomId, hints);
  if (spec.shoes_src) return spec.shoes_src;
  if (spec.shoes === true) return fill(wear.shoes, { id: giftFileId(bottomId) });
  return null;
}

export function giftFx(ids: readonly string[], hints?: GiftWearHints): { back: string; front: string } {
  let back = "";
  let front = "";
  for (const id of ids) {
    if (!id) continue;
    const spec = giftItemHint(id, hints);
    const table = wear.fx[id];
    if (!back) back = spec.fx_back || table?.back || "";
    if (!front) front = spec.fx_front || table?.front || "";
  }
  return { back, front };
}

export type GiftDraw = { slot: string; src: string; at: "before-body" | "after-body" | "after-hair" | "after-face" | "tail" };

/** Layers for the equipped gift pieces, in catalog order. Legs sit above the bottom only when that item says so. */
export function giftDraws(
  loadout: { top?: string; bottom?: string; hairAcc?: string; hat?: string; earring?: string; glasses?: string; cheek?: string; bracelet?: string; bag?: string },
  pose: string | null | undefined,
  hints?: GiftWearHints,
): GiftDraw[] {
  const top = loadout.top ?? "";
  const bottom = loadout.bottom ?? "";
  const bag = loadout.bag ?? "";
  const hairAcc = loadout.hairAcc ?? "";
  const hat = loadout.hat ?? "";
  const earring = loadout.earring ?? "";
  const glasses = loadout.glasses ?? "";
  const cheek = loadout.cheek ?? "";
  const bracelet = loadout.bracelet ?? "";
  const fx = giftFx([top, bottom, hairAcc, hat, earring, glasses, cheek, bag, bracelet], hints);
  const shoes = bottom ? shoesSrc(bottom, hints) : null;
  const legs = bottom && legsAboveBottom(bottom, hints) ? legsSrc(bottom, hints) : "";
  const slotSrc: Record<string, string> = {};
  if (fx.back) slotSrc.fx_back = fx.back;
  if (bottom) slotSrc.bottom = giftSrc("bottom", bottom, hints) ?? "";
  if (legs) slotSrc.legs = legs;
  if (shoes) slotSrc.shoes = shoes;
  if (top) slotSrc.top = giftSrc("top", top, hints) ?? "";
  if (bag) slotSrc.bag = giftSrc("bag", bag, hints) ?? "";
  if (earring) slotSrc.earring = giftSrc("earring", earring, hints) ?? "";
  if (cheek) slotSrc.cheek = giftSrc("cheek", cheek, hints) ?? "";
  if (hat) slotSrc.hat = giftSrc("hat", hat, hints) ?? "";
  if (glasses) slotSrc.glasses = giftSrc("glasses", glasses, hints) ?? "";
  if (hairAcc) slotSrc.hair_acc = giftSrc("hair_acc", hairAcc, hints) ?? "";
  if (fx.front) slotSrc.fx_front = fx.front;
  if (top) slotSrc.sleeve = giftSleeveSrc(top, pose);
  if (bracelet) slotSrc.bracelet = giftBraceletSrc(bracelet, pose, top, hints);

  const atFor = (key: string): GiftDraw["at"] => {
    const index = wear.order.indexOf(key);
    const body = wear.order.indexOf("body");
    const hair = wear.order.indexOf("hair");
    const face = wear.order.indexOf("face");
    if (body >= 0 && index >= 0 && index < body) return "before-body";
    if (hair >= 0 && index >= 0 && index < hair) return "after-body";
    if (face >= 0 && index >= 0 && index < face) return "after-hair";
    if (key === "sleeve" || key === "bracelet") return "tail";
    return "after-face";
  };

  const slotName: Record<string, string> = {
    fx_back: "gift-fx-back",
    bottom: "gift-bottom",
    legs: "gift-legs",
    shoes: "gift-shoes",
    top: "gift-top",
    bag: "gift-bag",
    earring: "gift-earring",
    cheek: "gift-cheek",
    hat: "gift-hat",
    glasses: "gift-glasses",
    hair_acc: "gift-hair",
    fx_front: "gift-fx-front",
    sleeve: "gift-sleeve",
    bracelet: "gift-bracelet",
  };
  const out: GiftDraw[] = [];
  for (const key of wear.order) {
    const src = slotSrc[key];
    if (!src) continue;
    out.push({ slot: slotName[key] ?? `gift-${key}`, src, at: atFor(key) });
  }
  return out;
}
