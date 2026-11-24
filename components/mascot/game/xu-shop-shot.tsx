"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { BeDaFigure } from "@/components/mascot/be-da-figure";
import { BeDaXuShop, XuShopPopup, type ShopDialog, type ShopShelf, type ShopTry } from "@/components/mascot/game/be-da-xu-shop";
import { GameIcon } from "@/components/mascot/game/icons";
import { bubbleColour, bubbleFrameStyle } from "@/lib/mascot/game/bubble-colour";
import { formatGameCoins } from "@/lib/mascot/game/coins";
import { DEFAULT_GAME_LOOK, gameDress } from "@/lib/mascot/game/look";
import { defaultSnapshot, resolveBeDaView } from "@/lib/mascot/model";
import { applyShopReceipt } from "@/lib/mascot/game/xu-shop";
import { sampleShopCatalog } from "@/lib/mascot/game/xu-shop-sample";

import "@/components/mascot/game/be-da-game.css";
import "@/components/mascot/game/be-da-xu-shop.css";

const TRY: ShopTry = {
  id: "spa_03",
  artId: "spa_03",
  name: "Dép lông",
  price: 5000,
  setName: "Spa Sáng Sớm",
  layer: "shoes",
};

const PILLOW: ShopTry = {
  id: "dem_02",
  artId: "dem_02",
  name: "Gối ôm",
  price: 6500,
  setName: "Đêm Ngủ Ngon",
  layer: "held",
};

const ROBE: ShopTry = {
  id: "spa_01",
  artId: "spa_01",
  name: "Áo choàng tắm bông",
  price: 9000,
  setName: "Spa Sáng Sớm",
  layer: "outfit",
};

function tryingFor(scene: string): ShopTry | null {
  if (scene === "short") return PILLOW;
  if (scene === "owned") return ROBE;
  if (scene === "card" || scene === "gift" || scene === "full") return null;
  return TRY;
}

function dialogFor(scene: string): ShopDialog {
  if (scene === "confirm") return { kind: "confirm", itemId: "spa_03", treeType: "", name: "Dép lông", charge: 5000 };
  if (scene === "short") return { kind: "short", name: "Gối ôm", charge: 6500, balance: 4120 };
  if (scene === "owned") {
    return {
      kind: "owned",
      name: ROBE.name,
      piece: { id: ROBE.id, name: ROBE.name, layer: ROBE.layer },
    };
  }
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

const STICKER: ShopTry = {
  id: "shop_sticker_hoa",
  artId: "shop_sticker_hoa",
  name: "Nhãn dán hoa",
  price: 300,
  setName: "",
  layer: "sticker",
};

function popupShelf(scene: string): ShopShelf {
  return scene === "short" ? "stickers" : "clothes";
}

function popupTrying(scene: string): ShopTry | null {
  if (scene === "short") return STICKER;
  if (scene === "owned") return ROBE;
  if (scene === "try" || scene === "success") return TRY;
  return null;
}

/** Local screenshots. The dev layout answers 404 in production. */
export function XuShopShot() {
  const t = useTranslations("mascot");
  const [scene, setScene] = useState("full");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [popup, setPopup] = useState(false);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextPopup = params.get("popup") === "1";
    const nextLive = params.get("live") === "1";
    const nextScene = params.get("scene") || (nextPopup ? "open" : "full");
    setPopup(nextPopup);
    setScene(nextScene);
    setOpen(nextPopup && !nextLive && nextScene !== "closed");
    setTheme(params.get("theme") === "dark" ? "dark" : "light");
    setReady(true);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  }, [theme]);
  const balance = popup && scene === "short" ? 296 : scene === "short" ? 4120 : 5240;
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
  const bubbleId = scene.startsWith("bubble-") ? scene.slice("bubble-".length) : "";
  if (bubbleColour(bubbleId)) {
    return (
      <div className="beda-shop" data-theme={theme} data-testid="bubble-shot" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ width: 220 }}>
          <BeDaFigure view={player} locale="vi" />
          <p className="beda-shop-speech" style={bubbleFrameStyle(bubbleId)} data-bubble={bubbleId}>
            {t("game.bubbleWashed")}
          </p>
        </div>
      </div>
    );
  }
  const shop = (
    <BeDaXuShop
      catalog={catalog}
      locale="vi"
      gender="female"
      pending={false}
      trying={popup ? popupTrying(scene) : tryingFor(scene)}
      dialog={popup && scene !== "success" ? null : dialogFor(scene)}
      problem={null}
      player={player}
      theme={theme}
      popup={popup}
      shelf={popup ? popupShelf(scene) : undefined}
      onClose={() => setOpen(false)}
      onTry={() => undefined}
      onBuy={() => undefined}
      onConfirm={() => undefined}
      onDismiss={() => undefined}
      onWear={() => undefined}
      onCare={() => undefined}
    />
  );
  if (!popup) return shop;
  const chip = formatGameCoins(scene === "success" ? 240 : balance, "vi");
  return (
    <div className="beda-game" data-tab="care" data-sky="morning" data-ready={ready ? "1" : "0"} data-testid="beda-shop-shot">
      <div className="beda-scene" data-testid="beda-room">
        <div className="beda-room-wall" />
        <div className="beda-room-stripes" />
        <div className="beda-room-floor" />
        <div className="beda-room-planks" />
        <div className="beda-baseboard" />
        <div style={{ position: "absolute", left: "50%", bottom: "18%", width: 200, transform: "translateX(-50%)", zIndex: 2 }}>
          <BeDaFigure view={player} locale="vi" dress={gameDress(DEFAULT_GAME_LOOK)} />
        </div>
      </div>
      <div className="beda-hud">
        <button type="button" className="beda-chip" data-testid="beda-coins" onClick={() => setOpen(true)}>
          <span className="beda-chip-icon coin">
            <GameIcon name="coin" className="beda-ico-sm" />
          </span>
          {chip} <small>xu</small>
        </button>
      </div>
      <nav className="beda-nav" aria-label="Bé Da">
        <button type="button" className="beda-nav-btn is-on">
          <span className="beda-nav-orb">
            <GameIcon name="care" />
          </span>
          <span className="beda-nav-label">Chăm da</span>
        </button>
      </nav>
      {open ? (
        <XuShopPopup title={t("game.shop.title")} closeLabel={t("game.shop.back")} onClose={() => setOpen(false)}>
          {shop}
        </XuShopPopup>
      ) : null}
    </div>
  );
}
