import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ApiError } from "@/lib/api-client";
import {
  readSeedBag,
  readSeedDraw,
  seedBlankSlots,
  seedRetrySameKey,
  seedRingSrc,
} from "@/lib/mascot/game/seed-bag";
import { readRoomTree } from "@/lib/mascot/game/room-tree";

const BAG = {
  shards: [{ type_key: "sunflower", name_vi: "Hướng dương", count: 4 }],
  mystery_shards: 3,
  mystery_shard_name: "Cánh bí ẩn",
  seeds: [{ type_key: "cherry", name_vi: "Anh đào", count: 2 }],
  mystery_seeds: 0,
  mystery_seed_name: "Hạt bí ẩn",
  catalog: [
    { type_key: "cherry", name_vi: "Anh đào", rarity: "common", image_key: "cherry", shards: 3, seeds: 2, available: true, coming_soon: false, in_mystery_pool: true, revealed: true },
    { type_key: "sunflower", name_vi: "Hướng dương", rarity: "common", image_key: "sunflower", shards: 4, seeds: 1, available: true, coming_soon: false, in_mystery_pool: true, revealed: true },
    { type_key: "aloe", name_vi: "Lô hội", rarity: "common", image_key: "aloe", shards: 0, seeds: 0, available: true, coming_soon: false, in_mystery_pool: true, revealed: true },
    { type_key: "sen_hong", name_vi: "Sen hồng", rarity: "rare", image_key: "sen_hong", shards: 0, seeds: 0, available: false, coming_soon: true, in_mystery_pool: false, revealed: false },
  ],
  slot_count: 18,
  coming_soon_count: 12,
  rules: { merge_count: 5, trade_in_count: 3, shard_buy_price: 5000, mystery_shard_bps: 1000 },
  balance: 6200,
  already: false,
};

describe("seed bag", () => {
  it("reads the bag the server sent and leaves unknown prices empty", () => {
    const bag = readSeedBag(BAG);
    assert.ok(bag);
    assert.equal(bag.mysteryShards, 3);
    assert.equal(bag.catalog[0]?.seeds, 2);
    assert.equal(bag.rules.shardBuyPrice, 5000);
    assert.equal(seedBlankSlots(bag), 12);
    assert.equal(seedRingSrc("cherry", 3), "/mascot/seeds/ring_anh_dao_3.svg");
    assert.equal(seedRingSrc("sen_hong", 1), null);
    const thin = readSeedBag({ catalog: [], shards: [], seeds: [] });
    assert.equal(thin?.rules.shardBuyPrice, null);
    assert.equal(thin?.slotCount, null);
    assert.equal(seedBlankSlots(thin!), 0);
    assert.equal(readSeedBag({ shards: [] }), null);
  });

  it("reads a leaf draw and does not treat a failed call as a retry of a finished one", () => {
    const drawn = readSeedDraw({
      already: false,
      pick: 1,
      my_shard: { type_key: "mystery", name_vi: "Cánh bí ẩn", mystery: true },
    });
    assert.equal(drawn?.mystery, true);
    assert.equal(drawn?.pick, 1);
    assert.equal(readSeedDraw({ already: true }), null);
    assert.equal(seedRetrySameKey(new ApiError("network")), true);
    assert.equal(seedRetrySameKey(new ApiError("api", { status: 409, code: "not_enough_coins" })), false);
    const tree = readRoomTree({
      stage: 7,
      can_water: false,
      bloomed: true,
      can_draw: true,
      my_shard: null,
      draws: [
        { name: "Mây Hồng", pending: false, shard: { type_key: "sunflower", name_vi: "Hướng dương", mystery: false } },
        { name: "Trà Sữa", pending: true },
      ],
      rewards: [],
      my_rewards: [],
      watered: [],
    });
    assert.equal(tree?.canDraw, true);
    assert.equal(tree?.draws[1]?.pending, true);
    assert.equal(tree?.draws[0]?.shard?.nameVi, "Hướng dương");
  });
});
