/**
 * Xu shop for Góc bình yên.
 * GET /api/v1/mascot/shop and POST /api/v1/mascot/shop/buy.
 * Same gate as the other mascot routes: the web stays behind features.mascot.
 * The Android app adds X-DaDiary-Client: android-app on its own requests.
 * Prices are xu from skin care. Nothing here is sold for real money.
 */

import { ApiError, apiGet, apiPost } from "@/lib/api-client";
import { newTreeIdempotencyKey } from "@/lib/mascot/game/room-tree";
import artMap from "@/lib/mascot/game/xu-shop-art.json";

const SHOP = "/api/v1/mascot/shop";
const call = { toastOnError: false, credentials: "include" as const };

export const XU_SHOP_QUERY_KEY = ["mascot", "xu-shop"] as const;

/** A set, or any charge at this size, asks before the wallet moves. */
export const SHOP_CONFIRM_XU = 5000;

const EARN_FAST = 300;
const EARN_SLOW = 250;

const BOY_ART: Record<string, string> = {
  spa_02: "spa_02_boy",
  lohoi_01: "lohoi_01_boy",
  nang_01: "nang_01_boy",
  ngoctrai_02: "ngoctrai_02_boy",
};

const DAILY_ART: Record<string, string> = {
  shop_sticker_hoa: "daily_hoa",
  shop_sticker_may: "daily_may",
  shop_frame_tron: "daily_khung",
  shop_bubble_la: "daily_bong",
};

const ACC_FILTER: Record<string, ShopAccFilter> = {
  acc_kinh_mat_meo: "kinh",
  acc_kinh_tim: "kinh",
  acc_kinh_gong_vang: "kinh",
  acc_bao_tay_ren: "tay",
  acc_vong_tay_charm: "tay",
  acc_no_lua: "toc",
  acc_kep_ngoc_trai: "toc",
  acc_khuyen_tai_giot_ngoc: "tai",
  acc_tui_xach_mini: "tui",
  acc_khan_quang_co: "co",
};

export type ShopAccFilter = "all" | "kinh" | "toc" | "tay" | "co" | "tai" | "tui";

export type ShopPiece = {
  id: string;
  name: string;
  layer: string;
  artId: string;
  price: number;
  charge: number;
  owned: boolean;
  locked: boolean;
  purchasable: boolean;
  lockReason: string;
  streak: number | null;
  streakRequired: number | null;
};

export type ShopSet = {
  id: string;
  name: string;
  price: number;
  charge: number;
  owned: boolean;
  locked: boolean;
  purchasable: boolean;
  lockReason: string;
  streak: number | null;
  streakRequired: number | null;
  pieces: ShopPiece[];
  bonus: ShopPiece | null;
};

export type ShopSeedOffer = {
  key: string;
  name: string;
  price: number;
  purchasable: boolean;
};

export type ShopSeeds = {
  itemId: string;
  price: number;
  mysteryForSale: boolean;
  purchasable: boolean;
  trees: ShopSeedOffer[];
};

export type ShopSeasonal = {
  purchasable: boolean;
  reason: string;
  title: string;
};

export type ShopCatalog = {
  balance: number;
  streak: number;
  pearlUnlocked: boolean;
  sets: ShopSet[];
  accessories: ShopPiece[];
  seeds: ShopSeeds;
  daily: ShopPiece[];
  seasonal: ShopSeasonal;
};

export type ShopGrant = {
  id: string;
  name: string;
  layer: string;
};

export type ShopReceipt = {
  already: boolean;
  itemId: string;
  treeType: string;
  charged: number;
  balance: number;
  granted: ShopGrant[];
  bonusGranted: ShopGrant[];
};

export type ShopClosetKind = "set" | "accessory" | "daily";

export type ShopClosetItem = {
  id: string;
  name: string;
  layer: string;
  artId: string;
  kind: ShopClosetKind;
};

export type PurchaseAttempt = {
  key: string;
  itemId: string;
  treeType: string;
};

type ArtRow = { name?: string; icon?: string; layer?: string; set?: string };

const ART = artMap as Record<string, ArtRow>;

export function shopIdempotencyKey(): string {
  return newTreeIdempotencyKey();
}

/** Same key while the attempt is still the one that may not have reached the server. */
export function reusePurchaseAttempt(
  current: PurchaseAttempt | null,
  itemId: string,
  treeType: string,
  nextKey: () => string = shopIdempotencyKey,
): PurchaseAttempt {
  const tree = treeType || "";
  if (current && current.itemId === itemId && current.treeType === tree) return current;
  return { key: nextKey(), itemId, treeType: tree };
}

/** Network and 5xx can be sent again with the same key. A 4xx answer is final. */
export function shopRetrySameKey(err: unknown): boolean {
  if (!(err instanceof ApiError)) return true;
  return err.status == null || err.status >= 500;
}

export type ShopNextStep =
  | { type: "locked"; streak: number; need: number }
  | { type: "short" }
  | { type: "confirm" }
  | { type: "buy" }
  | { type: "none" };

/** What a buy tap does. Owned and free previews stay on "none". */
export function shopNextStep(input: {
  itemId: string;
  charge: number;
  balance: number;
  locked: boolean;
  purchasable: boolean;
  streak: number;
  streakRequired: number | null;
}): ShopNextStep {
  if (input.locked) {
    return { type: "locked", streak: input.streak, need: input.streakRequired ?? 30 };
  }
  if (!input.purchasable) return { type: "none" };
  const charge = Math.max(0, Math.trunc(input.charge));
  if (charge > 0 && xuShortfall(input.balance, charge) > 0) return { type: "short" };
  if (shopNeedsConfirm(input.itemId, charge)) return { type: "confirm" };
  if (charge <= 0 && !input.itemId.startsWith("set_")) return { type: "none" };
  return { type: "buy" };
}

export function shopNeedsConfirm(itemId: string, charge: number): boolean {
  if (!Number.isFinite(charge) || charge <= 0) return false;
  if (itemId.startsWith("set_")) return true;
  return charge >= SHOP_CONFIRM_XU;
}

export function xuShortfall(balance: number, charge: number): number {
  const have = Number.isFinite(balance) ? Math.max(0, Math.trunc(balance)) : 0;
  const cost = Number.isFinite(charge) ? Math.max(0, Math.trunc(charge)) : 0;
  return Math.max(0, cost - have);
}

/** Days of steady care at about 250–300 xu a day. Null when nothing is missing. */
export function xuDaysRange(short: number): { min: number; max: number } | null {
  if (!Number.isFinite(short) || short <= 0) return null;
  const min = Math.ceil(short / EARN_FAST);
  const max = Math.ceil(short / EARN_SLOW);
  return { min, max: Math.max(min, max) };
}

export function shopAccFilter(id: string): ShopAccFilter {
  return ACC_FILTER[id] ?? "all";
}

export function shopWearId(itemId: string, gender: "female" | "male" | null | undefined): string {
  if (gender !== "male") return itemId;
  return BOY_ART[itemId] ?? itemId;
}

export function shopArtId(id: string, artId?: string): string {
  if (DAILY_ART[id]) return DAILY_ART[id];
  const fromArt = artId?.trim();
  if (fromArt) return fromArt;
  return id;
}

export function shopIconSrc(artId: string): string {
  if (!artId) return "";
  if (artId.startsWith("daily_")) return `/mascot/shop/icons/${artId}.svg`;
  const row = ART[artId];
  if (row?.icon) return row.icon;
  return `/mascot/shop/icons/${artId}.png`;
}

/** Wear layer in the mascot box. Empty when the piece is only an icon. */
export function shopLayerSrc(artId: string): string {
  return ART[artId]?.layer ?? "";
}

export function shopKind(id: string): ShopClosetKind {
  if (id.startsWith("acc_")) return "accessory";
  if (id.startsWith("shop_")) return "daily";
  return "set";
}

const WEAR_RANK = ["outfit", "hat", "glasses", "shoes", "held", "necklace", "scarf", "hair_acc", "earring", "bag", "gloves", "bracelet", "name_frame", "sticker", "bubble", "fx", "room"];

/** The piece Mặc thử puts on. Seeds are not clothes. */
export function shopTryPiece(receipt: Pick<ShopReceipt, "granted" | "bonusGranted">): ShopGrant | null {
  const rows = [...receipt.granted, ...receipt.bonusGranted].filter((row) => row.id && row.layer !== "seed" && !row.id.endsWith("_boy"));
  if (rows.length === 0) return null;
  return [...rows].sort((a, b) => rank(a.layer) - rank(b.layer))[0] ?? null;
}

function rank(layer: string): number {
  const index = WEAR_RANK.indexOf(layer);
  return index === -1 ? WEAR_RANK.length : index;
}

export function shopClosetItems(catalog: ShopCatalog): ShopClosetItem[] {
  const out: ShopClosetItem[] = [];
  const push = (piece: ShopPiece, kind: ShopClosetKind) => {
    if (!piece.owned || piece.id.endsWith("_boy")) return;
    out.push({
      id: piece.id,
      name: piece.name,
      layer: piece.layer,
      artId: shopArtId(piece.id, piece.artId),
      kind,
    });
  };
  for (const set of catalog.sets) {
    for (const piece of set.pieces) push(piece, "set");
    if (set.bonus) push(set.bonus, "set");
  }
  for (const piece of catalog.accessories) push(piece, "accessory");
  for (const piece of catalog.daily) push(piece, "daily");
  return out;
}

export function closetFromOwned(
  items: readonly { id: string; name: string; layer: string; source?: string }[],
): ShopClosetItem[] {
  const out: ShopClosetItem[] = [];
  for (const item of items) {
    if ((item.source ?? "").toLowerCase() !== "shop") continue;
    if (!item.id || item.id.endsWith("_boy") || item.layer === "seed") continue;
    out.push({
      id: item.id,
      name: item.name || ART[item.id]?.name || item.id,
      layer: item.layer,
      artId: shopArtId(item.id, item.id),
      kind: shopKind(item.id),
    });
  }
  return out;
}

export type ShopErrorInfo = {
  code: string;
  reason: string;
  needed: number | null;
  balance: number | null;
  streak: number | null;
  streakRequired: number | null;
};

export function readShopError(err: unknown): ShopErrorInfo {
  const empty: ShopErrorInfo = {
    code: "",
    reason: "",
    needed: null,
    balance: null,
    streak: null,
    streakRequired: null,
  };
  if (!(err instanceof ApiError)) return empty;
  const payload = err.payload;
  const box = payload && typeof payload === "object" ? (payload as { error?: unknown }).error : null;
  const row = box && typeof box === "object" ? (box as Record<string, unknown>) : null;
  return {
    code: err.code || text(row?.code, 64),
    reason: text(row?.reason, 64),
    needed: intOrNull(row?.needed),
    balance: intOrNull(row?.balance),
    streak: intOrNull(row?.streak),
    streakRequired: intOrNull(row?.streak_required),
  };
}

export async function getXuShop(): Promise<ShopCatalog> {
  const data = await apiGet<unknown>(SHOP, call);
  const catalog = readShopCatalog(data);
  if (!catalog) throw new ApiError("api", { status: 502, code: "bad_message" });
  return catalog;
}

export async function buyShopItem(itemId: string, treeType: string, idempotencyKey: string): Promise<ShopReceipt> {
  const data = await apiPost<unknown>(
    `${SHOP}/buy`,
    {
      idempotency_key: idempotencyKey,
      item_id: itemId,
      tree_type: itemId === "seed_piece" ? treeType : "",
    },
    call,
  );
  const receipt = readShopReceipt(data);
  if (!receipt) throw new ApiError("api", { status: 502, code: "bad_message" });
  return receipt;
}

export function readShopCatalog(data: unknown): ShopCatalog | null {
  const body = row(data);
  if (!body || !Array.isArray(body.groups)) return null;
  const balance = intOrNull(body.balance);
  if (balance == null || balance < 0) return null;
  const groups = new Map<string, Record<string, unknown>>();
  for (const group of body.groups) {
    const rec = row(group);
    const id = text(rec?.id, 32);
    if (rec && id) groups.set(id, rec);
  }
  const seasonal = row(body.seasonal) ?? {};
  return {
    balance,
    streak: Math.max(0, intOrNull(body.streak) ?? 0),
    pearlUnlocked: body.pearl_unlocked === true,
    sets: readSets(groups.get("sets")),
    accessories: readPieces(groups.get("accessories")),
    seeds: readSeeds(groups.get("seeds")),
    daily: readPieces(groups.get("daily")),
    seasonal: {
      purchasable: seasonal.purchasable === true,
      reason: text(seasonal.reason, 64),
      title: text(seasonal.title, 160),
    },
  };
}

export function readShopReceipt(data: unknown): ShopReceipt | null {
  const body = row(data);
  if (!body) return null;
  const itemId = text(body.item_id, 64);
  if (!itemId) return null;
  const balance = intOrNull(body.balance);
  if (balance == null) return null;
  return {
    already: body.already === true,
    itemId,
    treeType: text(body.tree_type, 64),
    charged: Math.max(0, intOrNull(body.charged) ?? 0),
    balance,
    granted: readGrants(body.granted),
    bonusGranted: readGrants(body.bonus_granted),
  };
}

/** Marks the receipt's clothes as owned and keeps the new balance. */
export function applyShopReceipt(catalog: ShopCatalog, receipt: ShopReceipt): ShopCatalog {
  const ids = new Set<string>([...receipt.granted, ...receipt.bonusGranted].map((row) => row.id).filter(Boolean));
  const own = (piece: ShopPiece): ShopPiece => {
    if (!ids.has(piece.id) && !piece.owned) return piece;
    if (!ids.has(piece.id)) return piece;
    return { ...piece, owned: true, charge: 0, purchasable: false };
  };
  return {
    ...catalog,
    balance: receipt.balance,
    sets: catalog.sets.map((set) => retotalSet({ ...set, pieces: set.pieces.map(own), bonus: set.bonus ? own(set.bonus) : null })),
    accessories: catalog.accessories.map(own),
    daily: catalog.daily.map(own),
  };
}

function retotalSet(set: ShopSet): ShopSet {
  const missing = set.pieces.reduce((sum, piece) => sum + (piece.owned ? 0 : piece.price), 0);
  const locked = set.locked;
  const bonusOwned = set.bonus?.owned === true;
  return {
    ...set,
    owned: set.pieces.length > 0 && set.pieces.every((piece) => piece.owned),
    charge: locked ? 0 : missing,
    purchasable: !locked && (missing > 0 || !bonusOwned),
  };
}

function readSets(group: Record<string, unknown> | undefined): ShopSet[] {
  const list = group?.items;
  if (!Array.isArray(list)) return [];
  const out: ShopSet[] = [];
  for (const item of list) {
    const rec = row(item);
    if (!rec) continue;
    const id = text(rec.id, 64);
    const name = text(rec.name, 80);
    if (!id || !name) continue;
    const pieces = Array.isArray(rec.pieces) ? rec.pieces.map((piece) => readPiece(piece)).filter((piece): piece is ShopPiece => !!piece) : [];
    const bonus = readPiece(rec.bonus);
    out.push({
      id,
      name,
      price: Math.max(0, intOrNull(rec.price) ?? 0),
      charge: Math.max(0, intOrNull(rec.charge) ?? 0),
      owned: rec.owned === true,
      locked: rec.locked === true,
      purchasable: rec.purchasable === true,
      lockReason: text(rec.lock_reason, 32),
      streak: intOrNull(rec.streak),
      streakRequired: intOrNull(rec.streak_required),
      pieces,
      bonus,
    });
  }
  return out;
}

function readPieces(group: Record<string, unknown> | undefined): ShopPiece[] {
  const list = group?.items;
  if (!Array.isArray(list)) return [];
  return list.map((item) => readPiece(item)).filter((piece): piece is ShopPiece => !!piece);
}

function readPiece(value: unknown): ShopPiece | null {
  const rec = row(value);
  if (!rec) return null;
  const id = text(rec.id, 64);
  const name = text(rec.name, 80);
  if (!id || !name) return null;
  return {
    id,
    name,
    layer: text(rec.layer, 32),
    artId: text(rec.art_id, 64) || id,
    price: Math.max(0, intOrNull(rec.price) ?? 0),
    charge: Math.max(0, intOrNull(rec.charge) ?? 0),
    owned: rec.owned === true,
    locked: rec.locked === true,
    purchasable: rec.purchasable === true,
    lockReason: text(rec.lock_reason, 32),
    streak: intOrNull(rec.streak),
    streakRequired: intOrNull(rec.streak_required),
  };
}

function readSeeds(group: Record<string, unknown> | undefined): ShopSeeds {
  const empty: ShopSeeds = { itemId: "seed_piece", price: 0, mysteryForSale: false, purchasable: false, trees: [] };
  if (!group) return empty;
  const trees: ShopSeedOffer[] = [];
  if (Array.isArray(group.tree_types)) {
    for (const item of group.tree_types) {
      const rec = row(item);
      const key = text(rec?.key, 32);
      if (!rec || !key) continue;
      trees.push({
        key,
        name: text(rec.name, 80) || key,
        price: Math.max(0, intOrNull(rec.price) ?? intOrNull(group.price) ?? 0),
        purchasable: rec.purchasable === true,
      });
    }
  }
  return {
    itemId: text(group.item_id, 64) || "seed_piece",
    price: Math.max(0, intOrNull(group.price) ?? 0),
    mysteryForSale: group.mystery_for_sale === true,
    purchasable: group.purchasable === true,
    trees,
  };
}

function readGrants(value: unknown): ShopGrant[] {
  if (!Array.isArray(value)) return [];
  const out: ShopGrant[] = [];
  for (const item of value) {
    const rec = row(item);
    const id = text(rec?.id, 64);
    if (!rec || !id) continue;
    out.push({ id, name: text(rec.name, 80), layer: text(rec.layer, 32) });
  }
  return out;
}

function row(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function text(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function intOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) return Number(value.trim());
  return null;
}
