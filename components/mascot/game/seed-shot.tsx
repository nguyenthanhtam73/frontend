"use client";

import { useEffect, useState } from "react";

import { SeedBagSheet, SeedDrawView } from "@/components/mascot/game/be-da-seed-bag";
import { readSeedBag, type SeedBag } from "@/lib/mascot/game/seed-bag";
import "@/components/mascot/game/be-da-game.css";

const SAMPLE = {
  shards: [{ type_key: "sunflower", name_vi: "Hướng dương", count: 4 }],
  mystery_shards: 3,
  mystery_shard_name: "Cánh bí ẩn",
  seeds: [{ type_key: "cherry", name_vi: "Anh đào", count: 2 }],
  mystery_seeds: 1,
  mystery_seed_name: "Hạt bí ẩn",
  catalog: [
    { type_key: "cherry", name_vi: "Anh đào", rarity: "common", image_key: "cherry", shards: 3, seeds: 2, available: true, coming_soon: false, in_mystery_pool: true, revealed: true },
    { type_key: "sunflower", name_vi: "Hướng dương", rarity: "common", image_key: "sunflower", shards: 4, seeds: 1, available: true, coming_soon: false, in_mystery_pool: true, revealed: true },
    { type_key: "aloe", name_vi: "Lô hội", rarity: "common", image_key: "aloe", shards: 4, seeds: 0, available: true, coming_soon: false, in_mystery_pool: true, revealed: true },
    { type_key: "sen_hong", name_vi: "Sen hồng", rarity: "rare", image_key: "sen_hong", shards: 0, seeds: 0, available: false, coming_soon: true, in_mystery_pool: false, revealed: false },
  ],
  slot_count: 18,
  coming_soon_count: 12,
  rules: { merge_count: 5, trade_in_count: 3, shard_buy_price: 5000, mystery_shard_bps: 1000 },
  balance: 6200,
  already: false,
};

function useScene() {
  const [scene, setScene] = useState("bag");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setScene(params.get("scene") || "bag");
  }, []);
  return scene;
}

export function SeedShot() {
  const scene = useScene();
  const bag = readSeedBag(SAMPLE);
  if (!bag) return null;
  if (scene === "draw") {
    return (
      <div className="beda-game is-spa" data-testid="beda-seed-shot">
        <SeedDrawView
          draws={[
            { name: "Mây Hồng", pending: false, shard: { typeKey: "sunflower", nameVi: "Hướng dương", mystery: false } },
            { name: "Trà Sữa", pending: true, shard: null },
          ]}
          result={null}
          error={null}
          busy={false}
          gift="+150 xu và Kẹp tóc lá xanh đã vào Tủ đồ"
          onFlip={() => undefined}
          onClose={() => undefined}
        />
      </div>
    );
  }
  return (
    <div className="beda-game" data-testid="beda-seed-shot">
      <SeedBagSheet
        bag={bag}
        locale="vi"
        busy={false}
        error={null}
        planting={null}
        onClose={() => undefined}
        onTrade={() => undefined}
        onBuy={() => undefined}
        onPlant={() => undefined}
      />
    </div>
  );
}

export type { SeedBag };
