import type { ShopCatalog, ShopPiece, ShopSet } from "@/lib/mascot/game/xu-shop";

type Seed = { id: string; name: string; layer: string; price: number; artId?: string };

function piece(seed: Seed, owned: boolean, locked = false): ShopPiece {
  return {
    id: seed.id,
    name: seed.name,
    layer: seed.layer,
    artId: seed.artId || seed.id,
    price: seed.price,
    charge: owned || locked || seed.price <= 0 ? 0 : seed.price,
    owned,
    locked,
    purchasable: !owned && !locked && seed.price > 0,
    lockReason: locked ? "streak" : "",
    streak: locked ? 12 : null,
    streakRequired: locked ? 30 : null,
  };
}

function bonus(id: string, name: string, layer: string, owned: boolean): ShopPiece {
  return piece({ id, name, layer, price: 0 }, owned);
}

function setOf(id: string, name: string, rows: ShopPiece[], extra: ShopPiece, locked = false): ShopSet {
  const price = rows.reduce((sum, row) => sum + row.price, 0);
  const missing = rows.reduce((sum, row) => sum + (row.owned ? 0 : row.price), 0);
  return {
    id,
    name,
    price,
    charge: locked ? 0 : missing,
    owned: rows.every((row) => row.owned),
    locked,
    purchasable: !locked && (missing > 0 || !extra.owned),
    lockReason: locked ? "streak" : "",
    streak: locked ? 12 : null,
    streakRequired: locked ? 30 : null,
    pieces: rows,
    bonus: extra,
  };
}

/** A full shelf for screenshots and the shop render test. */
export function sampleShopCatalog(balance = 5240): ShopCatalog {
  const own = new Set(["spa_01", "spa_02", "lohoi_01", "lohoi_02", "lohoi_03", "lohoi_04", "lohoi_bonus", "nang_02", "acc_no_lua", "acc_tui_xach_mini"]);
  const has = (id: string) => own.has(id);
  return {
    balance,
    streak: 12,
    pearlUnlocked: false,
    sets: [
      setOf(
        "set_spa",
        "Spa Sáng Sớm",
        [
          piece({ id: "spa_01", name: "Áo choàng tắm bông", layer: "outfit", price: 9000 }, has("spa_01")),
          piece({ id: "spa_02", name: "Khăn quấn tóc tai thỏ", layer: "hat", price: 6500 }, has("spa_02")),
          piece({ id: "spa_03", name: "Dép lông", layer: "shoes", price: 5000 }, has("spa_03")),
          piece({ id: "spa_04", name: "Ly trà hoa cúc", layer: "held", price: 4500 }, has("spa_04")),
        ],
        bonus("spa_bonus", "Hơi nước lấp lánh", "fx", has("spa_bonus")),
      ),
      setOf(
        "set_lohoi",
        "Vườn Lô Hội",
        [
          piece({ id: "lohoi_01", name: "Yếm xanh lá", layer: "outfit", price: 9000 }, has("lohoi_01")),
          piece({ id: "lohoi_02", name: "Bình tưới mini", layer: "held", price: 6000 }, has("lohoi_02")),
          piece({ id: "lohoi_03", name: "Mũ lá lô hội", layer: "hat", price: 5000 }, has("lohoi_03")),
          piece({ id: "lohoi_04", name: "Giày búp lá", layer: "shoes", price: 5000 }, has("lohoi_04")),
        ],
        bonus("lohoi_bonus", "Chậu lô hội trong phòng", "room", has("lohoi_bonus")),
      ),
      setOf(
        "set_nang",
        "Nắng Hè Xinh",
        [
          piece({ id: "nang_01", name: "Áo khoác chống nắng", layer: "outfit", price: 9000 }, has("nang_01")),
          piece({ id: "nang_02", name: "Mũ rộng vành", layer: "hat", price: 7000 }, has("nang_02")),
          piece({ id: "nang_03", name: "Ô nhỏ cầm tay", layer: "held", price: 5000 }, has("nang_03")),
          piece({ id: "nang_04", name: "Kính tròn", layer: "glasses", price: 4000 }, has("nang_04")),
        ],
        bonus("nang_bonus", "Khung tên mặt trời", "name_frame", has("nang_bonus")),
      ),
      setOf(
        "set_dem",
        "Đêm Ngủ Ngon",
        [
          piece({ id: "dem_01", name: "Đồ ngủ in sao", layer: "outfit", price: 9000 }, has("dem_01")),
          piece({ id: "dem_02", name: "Gối ôm", layer: "held", price: 6500 }, has("dem_02")),
          piece({ id: "dem_03", name: "Mũ ngủ hình trăng", layer: "hat", price: 5000 }, has("dem_03")),
          piece({ id: "dem_04", name: "Bịt mắt mây", layer: "glasses", price: 4500 }, has("dem_04")),
        ],
        bonus("dem_bonus", "Sao bay lúc đắp mặt nạ", "fx", has("dem_bonus")),
      ),
      setOf(
        "set_ngoctrai",
        "Ngọc Trai Hoàng Gia",
        [
          piece({ id: "ngoctrai_01", name: "Vương miện ngọc trai", layer: "hat", price: 16000 }, false, true),
          piece({ id: "ngoctrai_02", name: "Áo choàng ánh hồng", layer: "outfit", price: 15000 }, false, true),
          piece({ id: "ngoctrai_03", name: "Gậy ngọc trai", layer: "held", price: 11000 }, false, true),
          piece({ id: "ngoctrai_04", name: "Vòng cổ ngọc trai", layer: "necklace", price: 9500 }, false, true),
          piece({ id: "ngoctrai_05", name: "Giày ngọc trai", layer: "shoes", price: 8500 }, false, true),
        ],
        bonus("ngoctrai_bonus", "Hào quang cả phòng", "fx", false),
        true,
      ),
    ],
    accessories: [
      piece({ id: "acc_kinh_mat_meo", name: "Kính mắt mèo", layer: "glasses", price: 4500 }, has("acc_kinh_mat_meo")),
      piece({ id: "acc_kinh_tim", name: "Kính tim", layer: "glasses", price: 3500 }, has("acc_kinh_tim")),
      piece({ id: "acc_kinh_gong_vang", name: "Kính gọng vàng dây ngọc", layer: "glasses", price: 4000 }, has("acc_kinh_gong_vang")),
      piece({ id: "acc_bao_tay_ren", name: "Bao tay ren", layer: "gloves", price: 4000 }, has("acc_bao_tay_ren")),
      piece({ id: "acc_vong_tay_charm", name: "Vòng tay charm", layer: "bracelet", price: 3500 }, has("acc_vong_tay_charm")),
      piece({ id: "acc_no_lua", name: "Nơ lụa", layer: "hair_acc", price: 2500 }, has("acc_no_lua")),
      piece({ id: "acc_kep_ngoc_trai", name: "Kẹp ngọc trai", layer: "hair_acc", price: 3000 }, has("acc_kep_ngoc_trai")),
      piece({ id: "acc_khuyen_tai_giot_ngoc", name: "Khuyên tai giọt ngọc", layer: "earring", price: 4000 }, has("acc_khuyen_tai_giot_ngoc")),
      piece({ id: "acc_tui_xach_mini", name: "Túi xách mini", layer: "bag", price: 5000 }, has("acc_tui_xach_mini")),
      piece({ id: "acc_khan_quang_co", name: "Khăn quàng cổ", layer: "scarf", price: 4500 }, has("acc_khan_quang_co")),
    ],
    seeds: {
      itemId: "seed_piece",
      price: 5000,
      mysteryForSale: false,
      purchasable: true,
      trees: [
        { key: "cherry", name: "Hoa anh đào", price: 5000, purchasable: true },
        { key: "aloe", name: "Lô hội", price: 5000, purchasable: true },
        { key: "sunflower", name: "Hướng dương", price: 5000, purchasable: true },
      ],
    },
    daily: [
      piece({ id: "shop_sticker_hoa", name: "Nhãn dán hoa", layer: "sticker", price: 300 }, false),
      piece({ id: "shop_sticker_may", name: "Nhãn dán mây", layer: "sticker", price: 500 }, false),
      piece({ id: "shop_frame_tron", name: "Khung tên tròn", layer: "name_frame", price: 800 }, false),
      piece({ id: "shop_bubble_la", name: "Bóng chat lá", layer: "bubble", price: 1000, artId: "bubble_la" }, false),
      piece({ id: "shop_bubble_kem_hong", name: "Bóng kem hồng", layer: "bubble", price: 400, artId: "kem_hong" }, false),
      piece({ id: "shop_bubble_mint_mat", name: "Bóng mint mát", layer: "bubble", price: 400, artId: "mint_mat" }, false),
      piece({ id: "shop_bubble_vang_mat", name: "Bóng vàng mật", layer: "bubble", price: 450, artId: "vang_mat" }, false),
      piece({ id: "shop_bubble_dao_cam", name: "Bóng đào cam", layer: "bubble", price: 450, artId: "dao_cam" }, false),
    ],
    seasonal: {
      purchasable: false,
      reason: "gift_box",
      title: "Đồ mùa và đồ hiếm chỉ có trong hộp quà cây",
    },
  };
}
