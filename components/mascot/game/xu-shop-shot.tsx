"use client";

import { useEffect, useState } from "react";

import { BeDaXuShop, type ShopDialog, type ShopTry } from "@/components/mascot/game/be-da-xu-shop";
import { defaultSnapshot, resolveBeDaView } from "@/lib/mascot/model";
import { applyShopReceipt } from "@/lib/mascot/game/xu-shop";
import { sampleShopCatalog } from "@/lib/mascot/game/xu-shop-sample";

import "@/components/mascot/game/be-da-xu-shop.css";

const TRY: ShopTry = {
  id: "spa_03",
  artId: "spa_03",
  name: "Dép lông",
  price: 5000,
  setName: "Spa Sáng Sớm",
  layer: "shoes",
};

function dialogFor(scene: string): ShopDialog {
  if (scene === "confirm") return { kind: "confirm", itemId: "spa_03", treeType: "", name: "Dép lông", charge: 5000 };
  if (scene === "short") return { kind: "short", name: "Gối ôm", charge: 6500, balance: 4120 };
  if (scene === "success") {
    return {
      kind: "success",
      name: "Dép lông",
      charged: 5000,
      balance: 240,
      already: false,
      bonusName: "",
      piece: { id: "spa_03", name: "Dép lông", layer: "shoes" },
    };
  }
  return null;
}

/** Local screenshots. The dev layout answers 404 in production. */
export function XuShopShot() {
  const [scene, setScene] = useState("full");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setScene(params.get("scene") || "full");
    setTheme(params.get("theme") === "dark" ? "dark" : "light");
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  }, [theme]);
  const balance = scene === "short" ? 4120 : 5240;
  const shelf = sampleShopCatalog(balance);
  const catalog =
    scene === "success"
      ? applyShopReceipt(shelf, {
          already: false,
          itemId: "spa_03",
          treeType: "",
          charged: 5000,
          balance: 240,
          granted: [{ id: "spa_03", name: "Dép lông", layer: "shoes" }],
          bonusGranted: [],
        })
      : shelf;
  const player = resolveBeDaView({
    snapshot: { ...defaultSnapshot(), isDefault: false, mood: "happy", gender: "female" },
    missedDays: 0,
    sessionHappy: false,
    locale: "vi",
  });
  return (
    <BeDaXuShop
      catalog={catalog}
      locale="vi"
      gender="female"
      pending={false}
      trying={scene === "card" ? null : TRY}
      dialog={dialogFor(scene)}
      problem={null}
      player={player}
      theme={theme}
      onClose={() => undefined}
      onGender={() => undefined}
      onTry={() => undefined}
      onClearTry={() => undefined}
      onBuy={() => undefined}
      onConfirm={() => undefined}
      onDismiss={() => undefined}
      onWear={() => undefined}
      onCare={() => undefined}
    />
  );
}
