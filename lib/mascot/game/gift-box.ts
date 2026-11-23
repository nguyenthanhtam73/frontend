import { ApiError, apiGet, apiPost } from "@/lib/api-client";

const BOXES = "/api/v1/mascot/gift-boxes";
const call = { toastOnError: false, credentials: "include" as const };

export type GiftPiece = {
  id: string;
  artId: string;
  name: string;
  slot: string;
  set: string;
};

export type GiftPrize = {
  id: string;
  name: string;
  rarity: string;
  rarityName: string;
  kind: string;
  weightBps: number;
  dupeCoins: number;
  /** Xu paid when this prize is coins. 0 for a clothes prize. */
  coins: number;
  items: GiftPiece[];
};

export type GiftBoxInfo = {
  id: string;
  treeType: string;
  artKey: string;
  name: string;
  treeName: string;
  roomCode: string;
  opened: boolean;
};

export type GiftOpenResult = {
  already: boolean;
  box: GiftBoxInfo;
  prize: GiftPrize;
  granted: GiftPiece[];
  duplicate: boolean;
  partial: boolean;
  dupeCoins: number;
  balance: number;
};

export type GiftRateTier = {
  key: string;
  name: string;
  weightBps: number;
  prizeCount: number;
  perPrizeBps: number;
  dupeCoins: number;
};

export type GiftRateCard = {
  treeType: string;
  name: string;
  treeName: string;
  tiers: GiftRateTier[];
  prizes: GiftPrize[];
};

/** Basis points out of 10000, shown as a percent. 440 → 4,4 and 125 → 1,25 in vi-VN. */
export function bpsLabel(bps: number, locale: string): string {
  const loc = locale.toLowerCase().startsWith("vi") ? "vi-VN" : "en-US";
  return new Intl.NumberFormat(loc, { maximumFractionDigits: 2 }).format(bps / 100);
}

const COIN_KEYS = new Set(["coins", "coin", "xu"]);

export function isCoinPrize(prize: { kind: string; rarity: string }): boolean {
  return COIN_KEYS.has(prize.kind) || COIN_KEYS.has(prize.rarity);
}

export type GiftRateRow = { id: string; name: string; weightBps: number };

export type GiftRateGroup = {
  key: string;
  name: string;
  weightBps: number;
  rows: GiftRateRow[];
};

/** Xu rows first, then each rarity. Percents come from the weights on the payload. */
export function giftRateGroups(card: GiftRateCard): GiftRateGroup[] {
  const coinPrizes = card.prizes.filter(isCoinPrize);
  const itemPrizes = card.prizes.filter((prize) => !isCoinPrize(prize));
  const coinTier = card.tiers.find((tier) => COIN_KEYS.has(tier.key));
  const groups: GiftRateGroup[] = [];
  if (coinPrizes.length > 0 || coinTier) {
    const rows = coinPrizes.map(rateRow);
    groups.push({
      key: "xu",
      name: coinTier?.name || "Xu",
      weightBps: rows.length > 0 ? sumBps(rows) : (coinTier?.weightBps ?? 0),
      rows,
    });
  }
  const used = new Set<string>();
  for (const tier of card.tiers) {
    if (COIN_KEYS.has(tier.key)) continue;
    const rows = itemPrizes.filter((prize) => prize.rarity === tier.key).map(rateRow);
    for (const row of rows) used.add(row.id);
    if (rows.length === 0 && tier.weightBps <= 0) continue;
    groups.push({
      key: tier.key,
      name: tier.name,
      weightBps: rows.length > 0 ? sumBps(rows) : tier.weightBps,
      rows,
    });
  }
  const rest = new Map<string, GiftPrize[]>();
  for (const prize of itemPrizes) {
    if (used.has(prize.id)) continue;
    const key = prize.rarity || "item";
    const list = rest.get(key) ?? [];
    list.push(prize);
    rest.set(key, list);
  }
  for (const [key, prizes] of rest) {
    const rows = prizes.map(rateRow);
    groups.push({
      key,
      name: prizes[0]?.rarityName || key,
      weightBps: sumBps(rows),
      rows,
    });
  }
  return groups;
}

function rateRow(prize: GiftPrize): GiftRateRow {
  const name = isCoinPrize(prize) && prize.coins > 0 ? `${prize.coins} xu` : prize.name;
  return { id: prize.id, name, weightBps: prize.weightBps };
}

function sumBps(rows: readonly GiftRateRow[]): number {
  return rows.reduce((total, row) => total + row.weightBps, 0);
}

export function giftBoxSrc(kind: "closed" | "shake" | "thuong" | "hiem" | "sieu"): string {
  if (kind === "shake") return "/mascot/gift/box/hop_qua_la_xanh_rung_trai.svg";
  if (kind === "thuong") return "/mascot/gift/box/hop_qua_la_xanh_mo_thuong.svg";
  if (kind === "hiem") return "/mascot/gift/box/hop_qua_la_xanh_mo_hiem.svg";
  if (kind === "sieu") return "/mascot/gift/box/hop_qua_la_xanh_mo_sieu.svg";
  return "/mascot/gift/box/hop_qua_la_xanh.svg";
}

export function giftOpenArt(rarity: string): "thuong" | "hiem" | "sieu" {
  if (rarity === "rare" || rarity === "hiem") return "hiem";
  if (rarity === "legendary" || rarity === "sieu" || rarity === "super") return "sieu";
  return "thuong";
}

export { giftIconSrc, giftSleeveSrc, giftSrc as giftPieceSrc } from "@/lib/mascot/game/gift-wear";

export async function listGiftBoxes(): Promise<GiftBoxInfo[]> {
  const data = await apiGet<unknown>(BOXES, call);
  const body = row(data);
  if (!body || !Array.isArray(body.boxes)) throw new ApiError("api", { status: 502, code: "bad_message" });
  return body.boxes.map(readBox).filter((box): box is GiftBoxInfo => box != null && !box.opened);
}

export async function openGiftBox(id: string): Promise<GiftOpenResult> {
  const data = await apiPost<unknown>(`${BOXES}/${encodeURIComponent(id)}/open`, {}, call);
  const opened = readOpen(data);
  if (!opened) throw new ApiError("api", { status: 502, code: "bad_message" });
  return opened;
}

export function parseGiftRates(data: unknown): GiftRateCard[] {
  const body = row(data);
  const nested = body ? row(body.data) : null;
  const payload = nested && Array.isArray(nested.boxes) ? nested : body;
  if (!payload || !Array.isArray(payload.boxes)) return [];
  return payload.boxes.map(readCard).filter((card): card is GiftRateCard => card != null);
}

export async function getGiftRates(treeType?: string): Promise<GiftRateCard[]> {
  const query = treeType ? `?tree_type=${encodeURIComponent(treeType)}` : "";
  const data = await apiGet<unknown>(`${BOXES}/rates${query}`, call);
  const cards = parseGiftRates(data);
  if (cards.length === 0 && !Array.isArray(row(data)?.boxes)) {
    throw new ApiError("api", { status: 502, code: "bad_message" });
  }
  return cards;
}

export function readOpen(data: unknown): GiftOpenResult | null {
  const body = row(data);
  const box = readBox(body?.box);
  const prize = readPrize(body?.prize);
  if (!body || !box || !prize) return null;
  if (isCoinPrize(prize) && prize.coins <= 0) {
    prize.coins = firstAmount(body.amount, body.coins, body.coin_amount, body.xu);
  }
  return {
    already: body.already === true,
    box,
    prize,
    granted: Array.isArray(body.granted_items) ? body.granted_items.map(readPiece).filter((item): item is GiftPiece => item != null) : [],
    duplicate: body.duplicate === true,
    partial: body.partial === true,
    dupeCoins: int(body.dupe_coins),
    balance: int(body.balance),
  };
}

function readCard(value: unknown): GiftRateCard | null {
  const body = row(value);
  if (!body) return null;
  const tiers = Array.isArray(body.tiers) ? body.tiers.map(readTier).filter((tier): tier is GiftRateTier => tier != null) : [];
  const prizes = Array.isArray(body.prizes) ? body.prizes.map(readPrize).filter((prize): prize is GiftPrize => prize != null) : [];
  if (Array.isArray(body.tiers)) {
    for (const tier of body.tiers) {
      const rec = row(tier);
      if (!rec || !Array.isArray(rec.prizes)) continue;
      for (const raw of rec.prizes) {
        const prize = readPrize(raw);
        if (!prize || prizes.some((have) => have.id === prize.id)) continue;
        if (!prize.kind && COIN_KEYS.has(text(rec.key, 32))) prize.kind = "coins";
        if (!prize.rarity) prize.rarity = text(rec.key, 32);
        if (!prize.rarityName) prize.rarityName = text(rec.name, 40);
        prizes.push(prize);
      }
    }
  }
  return {
    treeType: text(body.tree_type, 64),
    name: text(body.name, 80),
    treeName: text(body.tree_name, 80),
    tiers,
    prizes,
  };
}

function readTier(value: unknown): GiftRateTier | null {
  const body = row(value);
  if (!body) return null;
  return {
    key: text(body.key, 32),
    name: text(body.name, 40),
    weightBps: int(body.weight_bps),
    prizeCount: int(body.prize_count),
    perPrizeBps: int(body.per_prize_bps),
    dupeCoins: int(body.dupe_coins),
  };
}

function readPrize(value: unknown): GiftPrize | null {
  const body = row(value);
  if (!body) return null;
  const id = text(body.id, 64);
  if (!id) return null;
  const kind = text(body.kind, 32) || text(body.type, 32);
  const rarity = text(body.rarity, 32);
  return {
    id,
    name: text(body.name, 80),
    rarity,
    rarityName: text(body.rarity_name, 40),
    kind: kind || (COIN_KEYS.has(rarity) ? "coins" : ""),
    weightBps: int(body.weight_bps),
    dupeCoins: int(body.dupe_coins),
    coins: firstAmount(body.amount, body.coins, body.coin_amount, body.xu),
    items: Array.isArray(body.items) ? body.items.map(readPiece).filter((item): item is GiftPiece => item != null) : [],
  };
}

function readPiece(value: unknown): GiftPiece | null {
  const body = row(value);
  if (!body) return null;
  const id = text(body.id, 64);
  const artId = text(body.art_id, 64) || id;
  if (!id) return null;
  return {
    id,
    artId,
    name: text(body.name, 80),
    slot: text(body.slot, 32),
    set: text(body.set, 64),
  };
}

function readBox(value: unknown): GiftBoxInfo | null {
  const body = row(value);
  if (!body) return null;
  const id = text(body.id, 80);
  if (!id) return null;
  return {
    id,
    treeType: text(body.tree_type, 64),
    artKey: text(body.art_key, 64),
    name: text(body.name, 80),
    treeName: text(body.tree_name, 80),
    roomCode: text(body.room_code, 16),
    opened: body.opened === true,
  };
}

function row(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function text(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function int(value: unknown): number {
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Math.max(0, Math.trunc(Number(value)));
  }
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

function firstAmount(...values: unknown[]): number {
  for (const value of values) {
    const amount = int(value);
    if (amount > 0) return amount;
  }
  return 0;
}
