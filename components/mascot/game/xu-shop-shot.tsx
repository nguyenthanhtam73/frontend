"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { BeDaFigure } from "@/components/mascot/be-da-figure";
import { BeDaXuShop, XuShopPopup, type ShopDialog, type ShopShelf, type ShopTry } from "@/components/mascot/game/be-da-xu-shop";
import { GameIcon } from "@/components/mascot/game/icons";
import { bubbleColour, bubbleFrameStyle } from "@/lib/mascot/game/bubble-colour";
import { formatGameCoins } from "@/lib/mascot/game/coins";
import { DEFAULT_GAME_LOOK, gameDress, genderLook } from "@/lib/mascot/game/look";
import { defaultSnapshot, resolveBeDaView, type BeDaGender } from "@/lib/mascot/model";
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

const PIECES: Record<string, ShopTry> = {
  spa_01: ROBE,
  spa_03: TRY,
  lohoi_01: { id: "lohoi_01", artId: "lohoi_01", name: "Yếm xanh lá", price: 9000, setName: "Vườn Lô Hội", layer: "outfit" },
  lohoi_04: { id: "lohoi_04", artId: "lohoi_04", name: "Giày búp lá", price: 5000, setName: "Vườn Lô Hội", layer: "shoes" },
  spa_02: { id: "spa_02", artId: "spa_02", name: "Khăn quấn tóc tai thỏ", price: 6500, setName: "Spa Sáng Sớm", layer: "hat" },
  nang_01: { id: "nang_01", artId: "nang_01", name: "Áo khoác chống nắng", price: 9000, setName: "Nắng Hè Xinh", layer: "outfit" },
};

function pieceFrom(id: string | null): ShopTry {
  if (id && PIECES[id]) return PIECES[id];
  return TRY;
}

function popupTrying(scene: string, item: string | null): ShopTry | null {
  if (scene === "short") return STICKER;
  if (scene === "owned") return ROBE;
  if (scene === "open" || scene === "closed") return null;
  if (scene === "try" || scene === "success" || scene === "before" || scene === "after") return pieceFrom(item);
  return pieceFrom(item);
}

/** Local screenshots. The dev layout answers 404 in production. */
export function XuShopShot() {
  const t = useTranslations("mascot");
  const [scene, setScene] = useState("full");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [popup, setPopup] = useState(false);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [gender, setGender] = useState<BeDaGender>("female");
  const [itemId, setItemId] = useState<string | null>(null);
  const [trying, setTrying] = useState<ShopTry | null>(null);
  const [dialog, setDialog] = useState<ShopDialog>(null);
  const [balance, setBalance] = useState(5240);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextPopup = params.get("popup") === "1";
    const nextLive = params.get("live") === "1";
    const nextScene = params.get("scene") || (nextPopup ? "open" : "full");
    const nextItem = params.get("item");
    const nextGender: BeDaGender = params.get("gender") === "male" ? "male" : "female";
    const nextBalance = params.has("balance") ? Number(params.get("balance")) : nextScene === "zero" ? 0 : nextPopup && nextScene === "short" ? 296 : nextScene === "short" ? 4120 : 5240;
    setPopup(nextPopup);
    setScene(nextScene);
    setOpen(nextPopup && !nextLive && nextScene !== "closed");
    setTheme(params.get("theme") === "dark" ? "dark" : "light");
    setGender(nextGender);
    setItemId(nextItem);
    setBalance(Number.isFinite(nextBalance) ? nextBalance : 5240);
    const picked = nextPopup ? popupTrying(nextScene, nextItem) : tryingFor(nextScene);
    setTrying(picked);
    if (nextScene === "success" || nextScene === "after") {
      const piece = picked ?? pieceFrom(nextItem);
      const left = Math.max(0, (Number.isFinite(nextBalance) ? nextBalance : 5240) - piece.price);
      setBalance(left);
      setDialog({
        kind: "success",
        name: piece.name,
        charged: piece.price,
        balance: left,
        already: false,
        bonusName: "",
        piece: { id: piece.id, name: piece.name, layer: piece.layer },
      });
    } else if (nextPopup) {
      setDialog(null);
    } else {
      setDialog(dialogFor(nextScene));
    }
    setReady(true);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  }, [theme]);
  const shelf = sampleShopCatalog(balance);
  const bought = scene === "success" || scene === "after" || dialog?.kind === "success";
  const catalog = bought
    ? applyShopReceipt(shelf, {
        already: false,
        itemId: trying?.id || "spa_03",
        treeType: "",
        charged: trying?.price || 5000,
        balance,
        granted: [{ id: trying?.id || "spa_03", name: trying?.name || "Dép lông", layer: trying?.layer || "shoes" }],
        bonusGranted: [],
      })
    : shelf;
  const player = resolveBeDaView({
    snapshot: { ...defaultSnapshot(), isDefault: false, mood: "happy", gender },
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
      gender={gender}
      pending={false}
      trying={trying}
      dialog={dialog}
      problem={null}
      player={player}
      theme={theme}
      popup={popup}
      shelf={popup ? (itemId && (PIECES[itemId]?.layer === "outfit" || PIECES[itemId]?.layer === "shoes" || PIECES[itemId]?.layer === "hat") ? "clothes" : popupShelf(scene)) : undefined}
      onClose={() => setOpen(false)}
      onTry={(next) => {
        setTrying(next);
        setDialog(null);
        setScene("try");
      }}
      onBuy={(ask) => {
        if (ask.charge > balance) {
          setDialog({ kind: "short", name: ask.name, charge: ask.charge, balance });
          return;
        }
        const left = Math.max(0, balance - ask.charge);
        setBalance(left);
        setDialog({
          kind: "success",
          name: ask.name,
          charged: ask.charge,
          balance: left,
          already: false,
          bonusName: "",
          piece: { id: ask.itemId, name: ask.name, layer: trying?.layer || "outfit" },
        });
        setScene("after");
      }}
      onConfirm={() => undefined}
      onDismiss={() => setDialog(null)}
      onWear={() => setDialog(null)}
      onCare={() => undefined}
    />
  );
  if (!popup) return shop;
  const chip = formatGameCoins(catalog.balance, "vi");
  return (
    <div className="beda-game" data-tab="care" data-sky="morning" data-ready={ready ? "1" : "0"} data-testid="beda-shop-shot">
      <div className="beda-scene" data-testid="beda-room">
        <div className="beda-room-wall" />
        <div className="beda-room-stripes" />
        <div className="beda-room-floor" />
        <div className="beda-room-planks" />
        <div className="beda-baseboard" />
        <div style={{ position: "absolute", left: "50%", bottom: "18%", width: 200, transform: "translateX(-50%)", zIndex: 2 }}>
          <BeDaFigure view={player} locale="vi" dress={gameDress(genderLook(DEFAULT_GAME_LOOK, gender))} />
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
