import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { ApiError } from "@/lib/api-client";
import {
  applyShopReceipt,
  readShopCatalog,
  readShopError,
  readShopReceipt,
  reusePurchaseAttempt,
  SHOP_SEED_ART,
  shopClosetItems,
  shopIconSrc,
  shopItemName,
  shopLayerSrc,
  shopNameAccentGaps,
  shopNeedsConfirm,
  shopNextStep,
  shopRetrySameKey,
  shopThumb,
  xuShortfall,
  type ShopCatalog,
  type ShopPiece,
  type ShopReceipt,
} from "@/lib/mascot/game/xu-shop";
import { sampleShopCatalog } from "@/lib/mascot/game/xu-shop-sample";
import artMap from "@/lib/mascot/game/xu-shop-art.json";

const PUBLIC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../public");

const RAW = {
  balance: 4120,
  streak: 12,
  pearl_unlocked: false,
  groups: [
    {
      id: "sets",
      items: [
        {
          id: "set_dem",
          name: "Đêm Ngủ Ngon",
          price: 25000,
          charge: 25000,
          owned: false,
          locked: false,
          purchasable: true,
          pieces: [
            {
              id: "dem_02",
              name: "Gối ôm",
              layer: "held",
              art_id: "dem_02",
              price: 6500,
              charge: 6500,
              owned: false,
              locked: false,
              purchasable: true,
            },
          ],
          bonus: { id: "dem_bonus", name: "Sao bay lúc đắp mặt nạ", layer: "fx", art_id: "dem_bonus", price: 0, charge: 0, owned: false, locked: false, purchasable: false },
        },
        {
          id: "set_ngoctrai",
          name: "Ngọc Trai Hoàng Gia",
          price: 60000,
          charge: 0,
          owned: false,
          locked: true,
          purchasable: false,
          lock_reason: "streak",
          streak: 12,
          streak_required: 30,
          pieces: [
            {
              id: "ngoctrai_01",
              name: "Vương miện ngọc trai",
              layer: "hat",
              price: 16000,
              charge: 0,
              owned: false,
              locked: true,
              purchasable: false,
              lock_reason: "streak",
              streak: 12,
              streak_required: 30,
            },
          ],
          bonus: { id: "ngoctrai_bonus", name: "Hào quang cả phòng", layer: "fx", price: 0, charge: 0, owned: false, locked: false, purchasable: false },
        },
      ],
    },
    {
      id: "accessories",
      items: [
        { id: "acc_tui_xach_mini", name: "Túi xách mini", layer: "bag", art_id: "acc_tui_xach_mini", price: 5000, charge: 5000, owned: false, locked: false, purchasable: true },
      ],
    },
    {
      id: "seeds",
      item_id: "seed_piece",
      price: 5000,
      mystery_for_sale: false,
      purchasable: true,
      tree_types: [
        { key: "cherry", name: "Hoa anh đào", price: 5000, purchasable: true },
        { key: "aloe", name: "Lô hội", price: 5000, purchasable: true },
        { key: "sunflower", name: "Hướng dương", price: 5000, purchasable: true },
      ],
    },
    {
      id: "daily",
      items: [
        { id: "shop_sticker_hoa", name: "Nhãn dán hoa", layer: "sticker", art_id: "tree_sticker_la_xanh", price: 300, charge: 300, owned: false, locked: false, purchasable: true },
      ],
    },
  ],
  seasonal: { purchasable: false, reason: "gift_box", title: "Đồ mùa và đồ hiếm chỉ có trong hộp quà cây" },
};

describe("xu shop catalog", () => {
  it("reads the four groups and the gift-box season", () => {
    const shop = readShopCatalog(RAW);
    assert.ok(shop);
    assert.equal(shop.balance, 4120);
    assert.equal(shop.streak, 12);
    assert.equal(shop.pearlUnlocked, false);
    assert.equal(shop.sets[0]?.price, 25000);
    assert.equal(shop.sets[0]?.pieces[0]?.charge, 6500);
    assert.equal(shop.sets[1]?.locked, true);
    assert.equal(shop.sets[1]?.pieces[0]?.streakRequired, 30);
    assert.equal(shop.accessories[0]?.id, "acc_tui_xach_mini");
    assert.equal(shop.seeds.itemId, "seed_piece");
    assert.equal(shop.seeds.mysteryForSale, false);
    assert.deepEqual(shop.seeds.trees.map((row) => row.key), ["cherry", "aloe", "sunflower"]);
    assert.equal(shop.daily[0]?.price, 300);
    assert.equal(shop.seasonal.purchasable, false);
    assert.equal(shop.seasonal.reason, "gift_box");
    assert.equal(readShopCatalog({ balance: 1 }), null);
  });

  it("reads a receipt and marks only the granted pieces owned", () => {
    const shop = readShopCatalog(RAW) as ShopCatalog;
    const receipt = readShopReceipt({
      already: false,
      item_id: "dem_02",
      tree_type: "",
      charged: 6500,
      balance: 0,
      granted: [{ id: "dem_02", name: "Gối ôm", layer: "held" }],
      bonus_granted: [],
    }) as ShopReceipt;
    const next = applyShopReceipt(shop, receipt);
    assert.equal(next.balance, 0);
    assert.equal(next.sets[0]?.pieces[0]?.owned, true);
    assert.equal(next.sets[0]?.pieces[0]?.purchasable, false);
    assert.equal(next.sets[0]?.charge, 0);
    assert.equal(readShopReceipt({ item_id: "" }), null);
  });
});

describe("xu shop purchase rules", () => {
  it("confirms sets and prices of 5.000 xu, and shows the shortfall", () => {
    assert.equal(shopNeedsConfirm("set_spa", 4500), true);
    assert.equal(shopNeedsConfirm("spa_03", 5000), true);
    assert.equal(shopNeedsConfirm("shop_sticker_hoa", 300), false);
    assert.equal(shopNeedsConfirm("spa_04", 0), false);
    assert.equal(xuShortfall(4120, 6500), 2380);
    assert.equal(xuShortfall(0, 300), 300);
    const short = shopNextStep({
      itemId: "dem_02",
      charge: 6500,
      balance: 4120,
      locked: false,
      purchasable: true,
      streak: 12,
      streakRequired: null,
    });
    assert.equal(short.type, "short");
    const confirm = shopNextStep({
      itemId: "set_spa",
      charge: 9500,
      balance: 20000,
      locked: false,
      purchasable: true,
      streak: 12,
      streakRequired: null,
    });
    assert.equal(confirm.type, "confirm");
    const buy = shopNextStep({
      itemId: "shop_sticker_hoa",
      charge: 300,
      balance: 4120,
      locked: false,
      purchasable: true,
      streak: 12,
      streakRequired: null,
    });
    assert.equal(buy.type, "buy");
    const locked = shopNextStep({
      itemId: "set_ngoctrai",
      charge: 0,
      balance: 90000,
      locked: true,
      purchasable: false,
      streak: 12,
      streakRequired: 30,
    });
    assert.deepEqual(locked, { type: "locked", streak: 12, need: 30 });
    const owned = shopNextStep({
      itemId: "spa_01",
      charge: 0,
      balance: 5000,
      locked: false,
      purchasable: false,
      streak: 12,
      streakRequired: null,
    });
    assert.equal(owned.type, "none");
  });

  it("reuses one idempotency key for the same attempt", () => {
    let n = 0;
    const next = () => `key-${++n}`;
    const first = reusePurchaseAttempt(null, "spa_03", "", next);
    const again = reusePurchaseAttempt(first, "spa_03", "", next);
    assert.equal(again.key, "key-1");
    const seed = reusePurchaseAttempt(again, "seed_piece", "cherry", next);
    assert.equal(seed.key, "key-2");
    assert.equal(seed.treeType, "cherry");
    const replay = reusePurchaseAttempt(seed, "seed_piece", "cherry", next);
    assert.equal(replay, seed);
    assert.equal(shopRetrySameKey(new ApiError("network")), true);
    assert.equal(shopRetrySameKey(new ApiError("server", { status: 503 })), true);
    assert.equal(shopRetrySameKey(new ApiError("api", { status: 409, code: "not_enough_coins" })), false);
    const info = readShopError(new ApiError("api", {
      status: 409,
      code: "not_enough_coins",
      payload: { success: false, error: { code: "not_enough_coins", needed: 6500, balance: 4120 } },
    }));
    assert.equal(info.needed, 6500);
    assert.equal(info.balance, 4120);
  });

  it("sorts owned shop pieces into the closet tabs", () => {
    const closet = shopClosetItems(sampleShopCatalog());
    assert.ok(closet.some((item) => item.id === "spa_01" && item.kind === "set"));
    assert.ok(closet.some((item) => item.id === "acc_no_lua" && item.kind === "accessory"));
    assert.equal(closet.some((item) => item.id.endsWith("_boy")), false);
    assert.equal(closet.some((item) => item.id === "spa_03"), false);
  });
});

describe("xu shop art and names", () => {
  it("rewrites the unaccented leaf bubble and keeps every other name marked", () => {
    assert.equal(shopItemName("shop_bubble_la", "Bong bóng chat lá"), "Bóng chat lá");
    assert.equal(shopItemName("shop_bubble_kem_hong", "Bóng kem hồng"), "Bóng kem hồng");
    const catalog = sampleShopCatalog();
    const names = catalogNames(catalog);
    assert.equal(names.filter((name) => name === "Bóng kem hồng").length, 1);
    assert.equal(names.filter((name) => name === "Bóng chat lá").length, 1);
    assert.equal(names.some((name) => name.includes("Bong")), false);
    assert.deepEqual(names.flatMap((name) => shopNameAccentGaps(name)), []);
    const ids = catalogIds(catalog);
    assert.equal(new Set(ids).size, ids.length);
    const read = readShopCatalog({
      balance: 6,
      groups: [
        { id: "sets", items: [] },
        { id: "accessories", items: [] },
        { id: "seeds", item_id: "seed_piece", price: 5000, purchasable: false, tree_types: [] },
        {
          id: "daily",
          items: [
            { id: "shop_bubble_la", name: "Bong bóng chat lá", layer: "bubble", art_id: "bubble_la", price: 1000, charge: 1000, owned: false, locked: false, purchasable: true },
          ],
        },
      ],
    });
    assert.equal(read?.daily[0]?.name, "Bóng chat lá");
  });

  it("points every catalog thumbnail at a file, or a drawn bubble", () => {
    const catalog = sampleShopCatalog();
    const pieces = [...catalog.sets.flatMap((set) => set.pieces), ...catalog.accessories, ...catalog.daily];
    assert.ok(pieces.length > 0);
    for (const piece of pieces) {
      const thumb = shopThumb(piece.id, piece.artId);
      if (thumb.kind === "bubble") {
        assert.equal(shopIconSrc(thumb.colourId), "", piece.id);
        continue;
      }
      assert.ok(thumb.src, piece.id);
      assertFile(thumb.src);
      const layer = shopLayerSrc(piece.artId);
      if (layer) assertFile(layer);
    }
    for (const tree of catalog.seeds.trees) assertFile(SHOP_SEED_ART[tree.key] ?? "");
    for (const [id, row] of Object.entries(artMap as Record<string, { icon?: string; layer?: string }>)) {
      if (row.icon) assertFile(row.icon);
      if (row.layer) assertFile(row.layer);
      assert.ok(id);
    }
  });
});

function catalogNames(catalog: ShopCatalog): string[] {
  return catalogIds(catalog, true) as string[];
}

function catalogIds(catalog: ShopCatalog, names = false): string[] {
  const rows: ShopPiece[] = [
    ...catalog.sets.flatMap((set) => set.pieces),
    ...catalog.accessories,
    ...catalog.daily,
  ];
  return rows.map((row) => (names ? row.name : row.id));
}

function assertFile(src: string) {
  assert.ok(src.startsWith("/"), src);
  const file = path.join(PUBLIC, src.replace(/^\//, ""));
  assert.equal(fs.existsSync(file), true, src);
}
