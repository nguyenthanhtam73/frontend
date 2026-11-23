import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseRoomMessage } from "@/lib/mascot/game/spa-room";
import { readOwnedMascotItems } from "@/lib/mascot/model";
import { lobbyLook } from "@/lib/mascot/game/lobby-live";
import {
  msUntilVietnamMidnight,
  newTreeIdempotencyKey,
  nextTreeReward,
  prefersLightMotion,
  readRoomTree,
  readTreeTick,
  readTreeTypes,
  treeArtKey,
  treeFrame,
  treeIsHidden,
  treeRewardsSeenPath,
  vietnamDayKey,
  watersUntilLevel,
} from "@/lib/mascot/game/room-tree";
import { equippedGameLook } from "@/lib/mascot/game/wardrobe";
import { DEFAULT_GAME_LOOK } from "@/lib/mascot/game/look";
import { ApiError } from "@/lib/api-client";

const SAMPLE = {
  stage: 3,
  stage_name: "Cây con",
  tree_type: "leaf",
  tree_name: "Cây lá xanh",
  rarity: "common",
  image_key: "leaf",
  waters: 2,
  required: 3,
  watered: ["Lan", "Mây"],
  progress: 0.6666666666666666,
  can_water: true,
  bloomed: false,
  balance: 50,
  already: false,
  leveled: false,
  rewards: [
    { stage: 1, name: "Hạt giống", coins: 0 },
    { stage: 4, name: "Cây nhỏ có nụ", coins: 50, item_id: "tree_sticker_la_xanh", item_name: "Nhãn dán lá xanh", preview_only: true },
    { stage: 7, name: "Cây hoa rực rỡ", coins: 150, item_id: "tree_clip_la_xanh", item_name: "Kẹp tóc lá xanh" },
  ],
  my_rewards: [{ stage: 2, name: "Mầm non", coins: 20 }],
};

describe("shared room tree", () => {
  it("reads the tree payload and the next gift", () => {
    const tree = readRoomTree(SAMPLE);
    assert.ok(tree);
    assert.equal(tree.stageName, "Cây con");
    assert.deepEqual(tree.watered, ["Lan", "Mây"]);
    assert.equal(tree.canWater, true);
    assert.equal(tree.reason, null);
    assert.equal(tree.balance, 50);
    assert.equal(tree.rewards[1]?.previewOnly, true);
    assert.equal(nextTreeReward(tree)?.itemName, "Nhãn dán lá xanh");
    assert.equal(watersUntilLevel(tree), 1);
  });

  it("falls back to leaf art and hides a 404 gate", () => {
    assert.equal(treeArtKey("cherry"), "leaf");
    assert.equal(treeArtKey("leaf"), "leaf");
    const types = readTreeTypes({
      types: [
        { key: "leaf", name_vi: "Cây lá xanh", rarity: "common", image_key: "leaf", sort_order: 1, exclusive_item_key: "tree_clip_la_xanh", exclusive_item_name: "Kẹp tóc lá xanh", creatable: true },
        { key: "cherry", name_vi: "Hoa anh đào", rarity: "common", image_key: "cherry", sort_order: 2, exclusive_item_key: "tree_clip_hoa_anh_dao", creatable: false },
      ],
    });
    assert.equal(types[1]?.imageKey, "leaf");
    assert.equal(types[1]?.creatable, false);
    assert.equal(treeIsHidden(new ApiError("api", { status: 404, code: "not_found" })), true);
    assert.equal(treeIsHidden(new ApiError("api", { status: 409, code: "needs_skin_check" })), false);
  });

  it("reads watering ticks from the room socket", () => {
    const tick = readTreeTick({
      op: "tree_watered",
      tree: { name: "Mây Hồng", waters: 2, required: 3, progress: 0.67, stage: 3, tree_type: "leaf" },
    });
    assert.equal(tick?.name, "Mây Hồng");
    assert.equal(tick?.waters, 2);
    const message = parseRoomMessage(
      JSON.stringify({
        op: "tick",
        channel: "room",
        count: 2,
        cap: 8,
        upserts: [],
        left: [],
        events: [
          { op: "tree_watered", tree: { name: "Mây Hồng", waters: 2, required: 3, progress: 1, stage: 3, tree_type: "leaf" } },
          { op: "tree_level_up", tree: { name: "Mây Hồng", waters: 3, required: 3, progress: 0, stage: 4, tree_type: "leaf" } },
        ],
      }),
    );
    assert.equal(message.op, "tick");
    if (message.op !== "tick") return;
    assert.equal(message.events[0]?.op, "tree_watered");
    assert.equal(message.events[0]?.tree?.name, "Mây Hồng");
    assert.equal(message.events[1]?.op, "tree_level_up");
    assert.equal(message.events[1]?.tree?.stage, 4);
  });

  it("drops water and skips it when motion is light", () => {
    const full = treeFrame(1500, "water", false, false);
    assert.ok(full.drops.length > 0);
    assert.ok(full.can.opacity > 0);
    const light = treeFrame(1500, "water", false, true);
    assert.equal(light.drops.length, 0);
    assert.equal(light.ripples.length, 0);
    const other = treeFrame(200, "other", false, false);
    assert.ok(other.toast > 0);
    assert.equal(other.can.opacity, 0);
    assert.equal(prefersLightMotion({ matchMedia: () => ({ matches: true }) }), true);
    const key = newTreeIdempotencyKey();
    assert.ok(key.length > 8 && key.length <= 80);
  });

  it("reads unseen rewards and the count on each reward", () => {
    const tree = readRoomTree({
      ...SAMPLE,
      unseen_rewards: [
        { stage: 4, coins: 50, item_id: "tree_sticker_la_xanh", item_name: "Nhãn dán lá xanh", preview_only: true, rewarded_count: 4 },
      ],
    });
    assert.equal(tree?.unseenRewards.length, 1);
    assert.equal(tree?.unseenRewards[0]?.rewardedCount, 4);
    assert.equal(tree?.unseenRewards[0]?.previewOnly, true);
    assert.equal(readRoomTree(SAMPLE)?.rewards[0]?.rewardedCount, null);
    assert.equal(treeRewardsSeenPath("DA7K2M"), "/api/v1/mascot/rooms/DA7K2M/tree/rewards/seen");
    const ignored = readOwnedMascotItems({
      items: [{ id: "tree_clip_la_xanh", layer: "accessory" }],
      grants: [{ item_id: "tree_clip_la_xanh" }],
    });
    assert.equal(ignored.length, 0);
    const owned = readOwnedMascotItems({
      owned_items: [
        { item_key: "tree_clip_la_xanh", layer: "accessory", preview_only: false, source: "tree", granted_at: "2026-11-23T00:00:00Z" },
        { item_key: "tree_sticker_la_xanh", layer: "decal", preview_only: true, source: "tree", granted_at: "2026-11-23T00:00:00Z" },
      ],
    });
    assert.equal(owned.length, 2);
    assert.equal(owned[0]?.id, "tree_clip_la_xanh");
    assert.equal(owned[1]?.previewOnly, true);
    const look = { ...DEFAULT_GAME_LOOK, clip: "tree_clip_la_xanh" as const };
    assert.equal(equippedGameLook(look).clip, null);
    assert.equal(equippedGameLook(look, { ownedIds: new Set(["tree_clip_la_xanh"]) }).clip, "tree_clip_la_xanh");
    assert.equal(equippedGameLook(look, { ownedIds: new Set(["tree_sticker_la_xanh"]) }).clip, null);
    assert.equal(lobbyLook("outfit_pajamas", "hair_sleep_buns", "tree_clip_la_xanh").clip, "tree_clip_la_xanh");
    const noon = new Date("2026-11-23T05:00:00.000Z");
    assert.equal(vietnamDayKey(noon), "2026-11-23");
    const wait = msUntilVietnamMidnight(noon);
    assert.ok(wait > 60_000 && wait < 24 * 60 * 60 * 1000);
  });
});
