import { ApiError, apiGet, apiPost } from "@/lib/api-client";
import { newTreeIdempotencyKey } from "@/lib/mascot/game/room-tree";

const BAG = "/api/v1/mascot/seed-bag";
const ROOMS = "/api/v1/mascot/rooms";
const call = { toastOnError: false, credentials: "include" as const };

/** Art file stem for the Kẹo bóng petals. Unknown types have no drawing. */
const ART: Record<string, string> = {
  cherry: "anh_dao",
  sunflower: "huong_duong",
  aloe: "lo_hoi",
  mystery: "bi_an",
};

export type SeedStack = {
  typeKey: string;
  nameVi: string;
  count: number;
};

export type SeedCatalogItem = {
  typeKey: string;
  nameVi: string;
  rarity: string;
  imageKey: string;
  shards: number;
  seeds: number;
  available: boolean;
  comingSoon: boolean;
  inMysteryPool: boolean;
  revealed: boolean;
};

export type SeedRules = {
  mergeCount: number | null;
  tradeInCount: number | null;
  shardBuyPrice: number | null;
  mysteryShardBps: number | null;
};

export type SeedBag = {
  shards: SeedStack[];
  mysteryShards: number;
  mysteryShardName: string;
  seeds: SeedStack[];
  mysterySeeds: number;
  mysterySeedName: string;
  catalog: SeedCatalogItem[];
  slotCount: number | null;
  comingSoonCount: number | null;
  rules: SeedRules;
  balance: number;
  already: boolean;
};

export type SeedDrawResult = {
  already: boolean;
  pick: number | null;
  typeKey: string;
  nameVi: string;
  mystery: boolean;
};

export function seedArtKey(typeKey: string): string | null {
  return ART[typeKey] ?? null;
}

export function seedRingSrc(typeKey: string, shards: number): string | null {
  const art = seedArtKey(typeKey);
  if (!art) return null;
  const count = Math.max(0, Math.min(5, Math.trunc(shards)));
  return `/mascot/seeds/ring_${art}_${count}.svg`;
}

export function seedPetalSrc(typeKey: string, mystery = false): string | null {
  if (mystery) return "/mascot/seeds/petal_bi_an.svg";
  const art = seedArtKey(typeKey);
  return art ? `/mascot/seeds/petal_${art}.svg` : null;
}

export function seedCardSrc(kind: "back" | "front" | "mystery"): string {
  if (kind === "back") return "/mascot/seeds/card_back.svg";
  if (kind === "mystery") return "/mascot/seeds/card_front_bi_an.svg";
  return "/mascot/seeds/card_front.svg";
}

/** Empty locked slots the server asked for, after the catalog rows. */
export function seedBlankSlots(bag: Pick<SeedBag, "slotCount" | "comingSoonCount" | "catalog">): number {
  if (bag.comingSoonCount != null) return bag.comingSoonCount;
  if (bag.slotCount == null) return 0;
  return Math.max(0, bag.slotCount - bag.catalog.length);
}

export function readSeedBag(data: unknown): SeedBag | null {
  const body = row(data);
  if (!body || !Array.isArray(body.catalog)) return null;
  const catalog: SeedCatalogItem[] = [];
  for (const item of body.catalog) {
    const rec = row(item);
    if (!rec) continue;
    const typeKey = text(rec.type_key, 64);
    if (!typeKey) continue;
    catalog.push({
      typeKey,
      nameVi: text(rec.name_vi, 80) || typeKey,
      rarity: text(rec.rarity, 32),
      imageKey: text(rec.image_key, 64),
      shards: int(rec.shards),
      seeds: int(rec.seeds),
      available: rec.available === true,
      comingSoon: rec.coming_soon === true,
      inMysteryPool: rec.in_mystery_pool === true,
      revealed: rec.revealed === true,
    });
  }
  const rules = row(body.rules) ?? {};
  return {
    shards: readStacks(body.shards),
    mysteryShards: int(body.mystery_shards),
    mysteryShardName: text(body.mystery_shard_name, 80),
    seeds: readStacks(body.seeds),
    mysterySeeds: int(body.mystery_seeds),
    mysterySeedName: text(body.mystery_seed_name, 80),
    catalog,
    slotCount: intOrNull(body.slot_count),
    comingSoonCount: intOrNull(body.coming_soon_count),
    rules: {
      mergeCount: intOrNull(rules.merge_count),
      tradeInCount: intOrNull(rules.trade_in_count),
      shardBuyPrice: intOrNull(rules.shard_buy_price),
      mysteryShardBps: intOrNull(rules.mystery_shard_bps),
    },
    balance: int(body.balance),
    already: body.already === true,
  };
}

export function readSeedDraw(data: unknown): SeedDrawResult | null {
  const body = row(data);
  const shard = row(body?.my_shard);
  if (!body || !shard) return null;
  const typeKey = text(shard.type_key, 64);
  if (!typeKey) return null;
  const pick = intOrNull(body.pick);
  return {
    already: body.already === true,
    pick: pick != null && pick >= 0 && pick <= 2 ? pick : null,
    typeKey,
    nameVi: text(shard.name_vi, 80),
    mystery: shard.mystery === true,
  };
}

export function seedIdempotencyKey(): string {
  return newTreeIdempotencyKey();
}

/** True when the request never reached a definite answer, so the same key can be sent again. */
export function seedRetrySameKey(err: unknown): boolean {
  if (!(err instanceof ApiError)) return true;
  return err.status == null || err.status >= 500;
}

export async function getSeedBag(): Promise<SeedBag> {
  const data = await apiGet<unknown>(BAG, call);
  const bag = readSeedBag(data);
  if (!bag) throw new ApiError("api", { status: 502, code: "bad_message" });
  return bag;
}

export async function tradeSeedShards(
  offerType: string,
  count: number,
  want: string,
  idempotencyKey: string,
): Promise<SeedBag> {
  const data = await apiPost<unknown>(
    `${BAG}/trade`,
    { offer: [{ type_key: offerType, count }], want, idempotency_key: idempotencyKey },
    call,
  );
  const bag = readSeedBag(data);
  if (!bag) throw new ApiError("api", { status: 502, code: "bad_message" });
  return bag;
}

export async function buySeedShard(typeKey: string, idempotencyKey: string): Promise<SeedBag> {
  const data = await apiPost<unknown>(
    `${BAG}/buy`,
    { type_key: typeKey, idempotency_key: idempotencyKey },
    call,
  );
  const bag = readSeedBag(data);
  if (!bag) throw new ApiError("api", { status: 502, code: "bad_message" });
  return bag;
}

export async function drawTreeLeaf(code: string, pick: number, idempotencyKey: string): Promise<SeedDrawResult> {
  const data = await apiPost<unknown>(
    `${ROOMS}/${encodeURIComponent(code)}/tree/draw`,
    { pick, idempotency_key: idempotencyKey },
    call,
  );
  const drawn = readSeedDraw(data);
  if (!drawn) throw new ApiError("api", { status: 502, code: "bad_message" });
  return drawn;
}

function readStacks(value: unknown): SeedStack[] {
  if (!Array.isArray(value)) return [];
  const out: SeedStack[] = [];
  for (const item of value) {
    const rec = row(item);
    if (!rec) continue;
    const typeKey = text(rec.type_key, 64);
    if (!typeKey) continue;
    out.push({ typeKey, nameVi: text(rec.name_vi, 80), count: int(rec.count) });
  }
  return out;
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
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

function intOrNull(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.trunc(value));
}
