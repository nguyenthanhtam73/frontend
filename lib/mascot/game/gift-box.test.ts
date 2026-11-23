import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { applyGiftWear } from "@/lib/mascot/layers";
import { bpsLabel, giftRateGroups, isCoinPrize, readOpen } from "@/lib/mascot/game/gift-box";
import { readRoomTree } from "@/lib/mascot/game/room-tree";

describe("gift box", () => {
  it("turns weight_bps into a percent and does not invent a rate", () => {
    assert.equal(bpsLabel(2000, "vi"), "20");
    assert.equal(bpsLabel(479, "vi"), "4,79");
    assert.equal(bpsLabel(50, "vi"), "0,5");
    assert.equal(bpsLabel(5, "vi"), "0,05");
    assert.equal(bpsLabel(5000, "vi"), "50");
    assert.equal(bpsLabel(4790, "vi"), "47,9");
    assert.equal(bpsLabel(4790, "en"), "47.9");
    assert.equal(bpsLabel(200, "vi"), "2");
    assert.equal(bpsLabel(10, "vi"), "0,1");
    assert.equal(bpsLabel(10, "en"), "0.1");
  });

  it("puts the xu rows ahead of the clothes, using the weights on the payload", () => {
    const groups = giftRateGroups({
      treeType: "leaf",
      name: "Hộp quà Lá xanh",
      treeName: "Cây lá xanh",
      tiers: [
        { key: "xu", name: "Xu", weightBps: 5000, prizeCount: 4, perPrizeBps: 0, dupeCoins: 0 },
        { key: "thuong", name: "Thường", weightBps: 4790, prizeCount: 1, perPrizeBps: 479, dupeCoins: 8 },
      ],
      prizes: [
        { id: "set_la_non", name: "Bộ Lá Non", rarity: "thuong", rarityName: "Thường", kind: "set", weightBps: 479, dupeCoins: 8, coins: 0, items: [] },
        { id: "xu_18", name: "18 xu", rarity: "xu", rarityName: "Xu", kind: "coins", weightBps: 1500, dupeCoins: 0, coins: 18, items: [] },
        { id: "xu_8", name: "8 xu", rarity: "xu", rarityName: "Xu", kind: "coins", weightBps: 2000, dupeCoins: 0, coins: 8, items: [] },
      ],
    });
    assert.equal(groups[0]?.key, "xu");
    assert.equal(groups[0]?.name, "Xu");
    assert.equal(groups[0]?.weightBps, 3500);
    assert.deepEqual(groups[0]?.rows.map((row) => row.name), ["18 xu", "8 xu"]);
    assert.equal(bpsLabel(groups[0]?.rows[0]?.weightBps ?? 0, "vi"), "15");
    assert.equal(groups[1]?.name, "Thường");
    assert.equal(groups[1]?.weightBps, 479);
  });

  it("reads a coin prize from kind or type plus an amount", () => {
    const byKind = readOpen({
      already: false,
      box: { id: "box-1", tree_type: "leaf", opened: true },
      prize: { id: "xu_18", name: "18 xu", type: "coins", rarity: "xu", amount: "18", weight_bps: 1500 },
      granted_items: [],
      duplicate: false,
      partial: false,
      dupe_coins: 0,
      balance: 38,
    });
    assert.ok(byKind);
    assert.equal(isCoinPrize(byKind.prize), true);
    assert.equal(byKind.prize.coins, 18);
    assert.equal(byKind.granted.length, 0);

    const byRoot = readOpen({
      already: false,
      box: { id: "box-2", tree_type: "leaf", opened: true },
      prize: { id: "xu_8", name: "8 xu", kind: "coins", rarity: "xu" },
      coins: 8,
      granted_items: [],
      duplicate: false,
    });
    assert.equal(byRoot?.prize.coins, 8);

    const exact = readOpen({
      already: false,
      box: { id: "box-9", tree_type: "leaf", opened: true },
      prize: {
        id: "coins_18",
        name: "18 xu",
        rarity: "coins",
        rarity_name: "Xu",
        kind: "coins",
        weight_bps: 1500,
        dupe_coins: 0,
        coins: 18,
        items: [],
      },
      granted_items: [],
      duplicate: false,
      partial: false,
      dupe_coins: 0,
      coins: 18,
      balance: 18,
    });
    assert.equal(exact?.prize.kind, "coins");
    assert.equal(exact?.prize.rarityName, "Xu");
    assert.equal(exact?.prize.coins, 18);
    assert.equal(isCoinPrize(exact!.prize), true);
    const groups = giftRateGroups({
      treeType: "leaf",
      name: "Hộp quà Lá xanh",
      treeName: "Cây lá xanh",
      tiers: [{ key: "coins", name: "Xu", weightBps: 5000, prizeCount: 4, perPrizeBps: 0, dupeCoins: 0 }],
      prizes: [exact!.prize],
    });
    assert.equal(groups[0]?.name, "Xu");
    assert.equal(groups[0]?.rows[0]?.name, "18 xu");
    assert.equal(bpsLabel(groups[0]?.rows[0]?.weightBps ?? 0, "vi"), "15");
  });

  it("keeps a duplicate refund separate from a coin prize", () => {
    const opened = readOpen({
      already: true,
      box: { id: "box-3", tree_type: "leaf", opened: true },
      prize: { id: "set_ke_la_me", name: "Bộ Kẻ Lá Me", kind: "set", rarity: "thuong", rarity_name: "Thường", weight_bps: 479, dupe_coins: 8 },
      granted_items: [],
      duplicate: true,
      dupe_coins: 8,
      balance: 28,
    });
    assert.ok(opened);
    assert.equal(isCoinPrize(opened.prize), false);
    assert.equal(opened.duplicate, true);
    assert.equal(opened.dupeCoins, 8);
    assert.equal(opened.prize.coins, 0);
  });

  it("reads the bloom box id and layers bottom under the top", () => {
    const tree = readRoomTree({
      stage: 7,
      stage_name: "Cây hoa rực rỡ",
      tree_type: "leaf",
      bloomed: true,
      rewards: [{ stage: 7, name: "Cây hoa rực rỡ", coins: 0, gift_box: true, box_id: "box-9" }],
    });
    assert.equal(tree?.rewards[0]?.giftBox, true);
    assert.equal(tree?.rewards[0]?.boxId, "box-9");

    const layers = applyGiftWear(
      [
        { slot: "glow-back", src: "/mascot/glow/level_1_back.svg", opacity: 1 },
        { slot: "body", src: "/mascot/body/body.svg", opacity: 1 },
        { slot: "outfit", src: "/mascot/outfit/outfit_pajamas.svg", opacity: 1 },
        { slot: "arms", src: "/mascot/outfits/arm_chin__pajamas.svg", opacity: 1 },
        { slot: "hair", src: "/mascot/hair/hair.svg", opacity: 1 },
        { slot: "face-mouth", src: "/mascot/faces/happy/mouth.svg", opacity: 1 },
      ],
      { top: "top_ao_len_suong_som", bottom: "bottom_vay_xep_ly_ma_non", bracelet: "acc_vong_tay_hat_la", hairAcc: "tree_clip_la_xanh" },
      null,
    );
    const slots = layers.map((layer) => layer.slot);
    assert.equal(slots.includes("outfit"), false);
    assert.equal(slots.includes("arms"), false);
    assert.ok(slots.indexOf("gift-bottom") < slots.indexOf("gift-top"));
    assert.ok(slots.indexOf("gift-top") < slots.indexOf("hair"));
    assert.ok(slots.indexOf("gift-hair") > slots.indexOf("face-mouth"));
    assert.equal(slots.at(-2), "gift-sleeve");
    assert.equal(slots.at(-1), "gift-bracelet");
    assert.match(layers.find((layer) => layer.slot === "gift-bracelet")?.src ?? "", /__long\.svg$/);
    assert.match(layers.find((layer) => layer.slot === "gift-hair")?.src ?? "", /acc_kep_toc_la_xanh\.svg$/);
    assert.equal(slots.includes("gift-legs"), false);
  });

  it("draws legs above a bottom when that item asks for it", () => {
    const layers = applyGiftWear(
      [
        { slot: "body", src: "/mascot/body/body.svg", opacity: 1 },
        { slot: "outfit", src: "/mascot/outfit/outfit_pajamas.svg", opacity: 1 },
        { slot: "hair", src: "/mascot/hair/hair.svg", opacity: 1 },
      ],
      { top: "top_ao_len_suong_som", bottom: "bottom_vay_xep_ly_ma_non" },
      null,
      {
        items: {
          bottom_vay_xep_ly_ma_non: {
            legs_above: true,
            legs_src: "/mascot/gift/legs/bottom_vay_xep_ly_ma_non.svg",
            shoes: true,
          },
        },
      },
    );
    const slots = layers.map((layer) => layer.slot);
    assert.ok(slots.indexOf("gift-bottom") < slots.indexOf("gift-legs"));
    assert.ok(slots.indexOf("gift-legs") < slots.indexOf("gift-shoes"));
    assert.ok(slots.indexOf("gift-shoes") < slots.indexOf("gift-top"));
    assert.equal(
      layers.find((layer) => layer.slot === "gift-legs")?.src,
      "/mascot/gift/legs/bottom_vay_xep_ly_ma_non.svg",
    );
    assert.equal(
      layers.find((layer) => layer.slot === "gift-shoes")?.src,
      "/mascot/gift/shoes/bottom_vay_xep_ly_ma_non.svg",
    );
  });
});
