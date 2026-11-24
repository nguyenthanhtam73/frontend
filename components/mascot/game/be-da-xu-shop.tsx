"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { BeDaFigure } from "@/components/mascot/be-da-figure";
import { DEFAULT_GAME_LOOK, gameDress, genderLook } from "@/lib/mascot/game/look";
import { useRouter } from "@/i18n/navigation";
import { ApiError } from "@/lib/api-client";
import { mascotAssetUrl } from "@/lib/mascot/asset-url";
import { BUBBLE_COLOURS, bubbleColour, bubbleFrameStyle } from "@/lib/mascot/game/bubble-colour";
import { pushLoiEvent } from "@/lib/mascot/loi-noi";
import { formatGameCoins } from "@/lib/mascot/game/coins";
import { wearShopPiece } from "@/lib/mascot/game/mascot-wear";
import type { BeDaGender, BeDaView } from "@/lib/mascot/model";
import {
  applyShopReceipt,
  buyShopItem,
  getXuShop,
  readShopError,
  reusePurchaseAttempt,
  shopArtId,
  shopIconSrc,
  shopLayerSrc,
  shopNextStep,
  shopRetrySameKey,
  shopTryPiece,
  shopWearId,
  xuShortfall,
  XU_SHOP_QUERY_KEY,
  type PurchaseAttempt,
  type ShopCatalog,
  type ShopClosetItem,
  type ShopPiece,
} from "@/lib/mascot/game/xu-shop";

export type ShopTry = {
  id: string;
  artId: string;
  name: string;
  price: number;
  setName: string;
  layer: string;
};

export type ShopDialog =
  | null
  | { kind: "confirm"; itemId: string; treeType: string; name: string; charge: number }
  | { kind: "short"; name: string; charge: number; balance: number }
  | {
      kind: "success";
      name: string;
      charged: number;
      balance: number;
      already: boolean;
      bonusName: string;
      piece: { id: string; name: string; layer: string } | null;
    }
  | { kind: "locked"; streak: number; need: number }
  | { kind: "owned"; name: string; piece: { id: string; name: string; layer: string } | null };

type BuyAsk = {
  itemId: string;
  treeType: string;
  name: string;
  charge: number;
  locked: boolean;
  purchasable: boolean;
  streak: number;
  streakRequired: number | null;
};

export type ShopShelf = "clothes" | "accessories" | "stickers" | "seeds";

const SHELVES: readonly ShopShelf[] = ["clothes", "accessories", "stickers", "seeds"];

const SEED_ART: Record<string, string> = {
  cherry: "/mascot/seeds/petal_anh_dao.svg",
  aloe: "/mascot/seeds/petal_lo_hoi.svg",
  sunflower: "/mascot/seeds/petal_huong_duong.svg",
};

type ShelfCard = {
  id: string;
  itemId: string;
  treeType: string;
  name: string;
  artId: string;
  src: string;
  layer: string;
  price: number;
  charge: number;
  owned: boolean;
  locked: boolean;
  purchasable: boolean;
  streak: number | null;
  streakRequired: number | null;
  setName: string;
  kind: "piece" | "colour" | "seed";
};

function pieceOwned(catalog: ShopCatalog, id: string): boolean {
  for (const set of catalog.sets) {
    if (set.pieces.some((piece) => piece.id === id && piece.owned)) return true;
    if (set.bonus?.id === id && set.bonus.owned) return true;
  }
  return [...catalog.accessories, ...catalog.daily].some((piece) => piece.id === id && piece.owned);
}

function xu(locale: string, amount: number): string {
  return `${formatGameCoins(amount, locale)} xu`;
}

function cardFromPiece(piece: ShopPiece, setName = ""): ShelfCard {
  const artId = shopArtId(piece.id, piece.artId);
  return {
    id: piece.id,
    itemId: piece.id,
    treeType: "",
    name: piece.name,
    artId,
    src: shopIconSrc(artId),
    layer: piece.layer,
    price: piece.price,
    charge: piece.charge,
    owned: piece.owned,
    locked: piece.locked,
    purchasable: piece.purchasable,
    streak: piece.streak,
    streakRequired: piece.streakRequired,
    setName,
    kind: "piece",
  };
}

/** Clothes you actually wear. Held props and jewellery stay out of this shelf. */
const CLOTHES_LAYERS = new Set(["outfit", "shoes", "hat"]);
const STICKER_LAYERS = new Set(["sticker", "name_frame", "bubble"]);

function shelfFor(card: Pick<ShelfCard, "kind" | "layer">): ShopShelf {
  if (card.kind === "seed" || card.layer === "seed") return "seeds";
  if (card.kind === "colour" || STICKER_LAYERS.has(card.layer)) return "stickers";
  if (CLOTHES_LAYERS.has(card.layer)) return "clothes";
  return "accessories";
}

function shelfCards(catalog: ShopCatalog): Record<ShopShelf, ShelfCard[]> {
  const shelves: Record<ShopShelf, ShelfCard[]> = { clothes: [], accessories: [], stickers: [], seeds: [] };
  for (const set of catalog.sets) {
    for (const piece of set.pieces) {
      const card = cardFromPiece(piece, set.name);
      shelves[shelfFor(card)].push(card);
    }
  }
  for (const piece of catalog.accessories) {
    const card = cardFromPiece(piece);
    shelves[shelfFor(card)].push(card);
  }
  for (const piece of catalog.daily) {
    const card = cardFromPiece(piece);
    shelves[shelfFor(card)].push(card);
  }
  for (const colour of BUBBLE_COLOURS) {
    shelves.stickers.push({
      id: colour.id,
      itemId: colour.id,
      treeType: "",
      name: colour.name,
      artId: colour.id,
      src: "",
      layer: "bubble",
      price: 0,
      charge: 0,
      owned: false,
      locked: false,
      purchasable: false,
      streak: null,
      streakRequired: null,
      setName: "",
      kind: "colour" as const,
    });
  }
  for (const tree of catalog.seeds.trees) {
    shelves.seeds.push({
    id: `seed_${tree.key}`,
    itemId: catalog.seeds.itemId,
    treeType: tree.key,
    name: tree.name,
    artId: tree.key,
    src: SEED_ART[tree.key] ?? "",
    layer: "seed",
    price: tree.price,
    charge: tree.purchasable && catalog.seeds.purchasable ? tree.price : 0,
    owned: false,
    locked: false,
    purchasable: tree.purchasable && catalog.seeds.purchasable,
    streak: null,
    streakRequired: null,
    setName: "",
    kind: "seed" as const,
    });
  }
  return shelves;
}

const WORN_LAYERS = new Set([
  "outfit",
  "hat",
  "shoes",
  "glasses",
  "hair_acc",
  "earring",
  "necklace",
  "scarf",
  "gloves",
  "bracelet",
  "bag",
  "held",
]);

function wearsOnBody(card: ShelfCard | null): boolean {
  return card != null && card.kind === "piece" && WORN_LAYERS.has(card.layer);
}

/** Where a small piece sits, so the preview can lean in. Outfits stay full-body. */
function focusZone(card: ShelfCard | null): "shoes" | "head" | "face" | "hand" | null {
  if (!card || !wearsOnBody(card) || card.layer === "outfit") return null;
  if (card.layer === "shoes") return "shoes";
  if (card.layer === "hat" || card.layer === "hair_acc") return "head";
  if (card.layer === "glasses" || card.layer === "earring") return "face";
  return "hand";
}

function cardCost(card: ShelfCard): number {
  if (card.charge > 0) return card.charge;
  return card.price > 0 ? card.price : 0;
}

function cardShort(balance: number, card: ShelfCard): number {
  if (card.owned || card.locked || card.kind === "colour" || !card.purchasable) return 0;
  return xuShortfall(balance, cardCost(card));
}

function wornPiece(player: BeDaView | null, card: ShelfCard, gender: BeDaGender): boolean {
  if (!player || card.kind === "colour" || card.kind === "seed") return false;
  const wear = shopWearId(card.artId || card.id, gender);
  const loadout = player.loadout;
  if (card.layer === "outfit") return loadout.outfit.id === wear || loadout.outfit.id === card.id;
  if (card.layer === "room") return loadout.roomItems.some((item) => item.id === wear || item.id === card.id);
  const field = {
    hat: loadout.hat,
    shoes: loadout.shoes,
    held: loadout.held,
    glasses: loadout.glasses,
    necklace: loadout.necklace,
    scarf: loadout.scarf,
    hair_acc: loadout.hairAcc,
    earring: loadout.earring,
    bag: loadout.bag,
    gloves: loadout.gloves,
    bracelet: loadout.bracelet,
    name_frame: loadout.nameFrame,
    sticker: loadout.sticker,
    bubble: loadout.bubble,
    fx: loadout.fx,
  }[card.layer];
  return field === wear || field === card.id;
}

export function XuShopPopup({
  title,
  closeLabel,
  onClose,
  onEscape,
  children,
}: {
  title: string;
  closeLabel: string;
  onClose: () => void;
  /** Return true when Escape should stay inside the shop (a confirm sheet, for example). */
  onEscape?: () => boolean;
  children: ReactNode;
}) {
  const closeRef = useRef(onClose);
  const escapeRef = useRef(onEscape);
  closeRef.current = onClose;
  escapeRef.current = onEscape;
  const requestClose = useRef<() => void>(() => undefined);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.dataset.bedaShop = "open";
    let closed = false;
    const finish = () => {
      if (closed) return;
      closed = true;
      closeRef.current();
    };
    const prior = history.state as { bedaShop?: boolean } | null;
    if (!prior?.bedaShop) history.pushState({ ...(history.state as object | null), bedaShop: true }, "");
    requestClose.current = () => {
      if (closed) return;
      const marked = (history.state as { bedaShop?: boolean } | null)?.bedaShop === true;
      if (marked) history.back();
      else finish();
    };
    const onPop = () => finish();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (escapeRef.current?.()) return;
      requestClose.current();
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      delete document.body.dataset.bedaShop;
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const popup = (
    <div className="beda-shop-popup" data-testid="beda-xu-popup">
      <button
        type="button"
        className="beda-shop-popup-backdrop"
        data-testid="beda-xu-backdrop"
        aria-label={closeLabel}
        onClick={() => requestClose.current()}
      />
      <div className="beda-shop-popup-panel" role="dialog" aria-modal="true" aria-label={title}>
        <button
          type="button"
          className="beda-shop-popup-x"
          data-testid="beda-xu-close"
          aria-label={closeLabel}
          onClick={() => requestClose.current()}
        >
          <svg viewBox="0 0 32 32" aria-hidden>
            <path d="M9 9l14 14M23 9 9 23" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
  if (typeof document === "undefined") return popup;
  return createPortal(popup, document.body);
}

export function BeDaXuShop({
  catalog,
  locale,
  gender,
  pending,
  trying,
  dialog,
  problem,
  player = null,
  theme = "light",
  overlay = false,
  popup = false,
  shelf,
  onClose,
  onTry,
  onBuy,
  onConfirm,
  onDismiss,
  onWear,
  onCare,
}: {
  catalog: ShopCatalog;
  locale: string;
  gender: BeDaGender;
  pending: boolean;
  trying: ShopTry | null;
  dialog: ShopDialog;
  problem: string | null;
  player?: BeDaView | null;
  theme?: "light" | "dark";
  overlay?: boolean;
  popup?: boolean;
  shelf?: ShopShelf;
  onClose: () => void;
  onTry: (next: ShopTry) => void;
  onBuy: (ask: BuyAsk) => void;
  onConfirm: () => void;
  onDismiss: () => void;
  onWear: () => void;
  onCare: () => void;
}) {
  const t = useTranslations("mascot");
  const shelves = shelfCards(catalog);
  const openShelves = SHELVES.filter((id) => shelves[id].length > 0);
  const [tab, setTab] = useState<ShopShelf>(shelf && openShelves.includes(shelf) ? shelf : (openShelves[0] ?? "clothes"));
  const who: BeDaGender = (player?.gender ?? gender) === "male" ? "male" : "female";
  const cards = shelves[tab] ?? [];
  const selected =
    (trying ? cards.find((card) => card.id === trying.id) : null) ??
    (trying ? SHELVES.flatMap((id) => shelves[id]).find((card) => card.id === trying.id) ?? null : null);
  const wearArt = trying ? shopWearId(trying.artId, who) : "";
  const wornOnBody = wearsOnBody(selected);
  const focus = focusZone(selected);
  const layer = wornOnBody && wearArt ? shopLayerSrc(wearArt) : "";
  const shown = player ? { ...player, gender: who } : null;
  const wearing = selected ? wornPiece(player, selected, who) : false;
  const missing = selected ? cardShort(catalog.balance, selected) : 0;
  const cost = selected ? cardCost(selected) : 0;

  function choose(card: ShelfCard) {
    onTry({
      id: card.id,
      artId: card.kind === "piece" ? card.artId : card.id,
      name: card.name,
      price: card.price,
      setName: card.setName,
      layer: card.layer,
    });
  }

  function buySelected() {
    if (!selected || pending) return;
    onBuy({
      itemId: selected.itemId,
      treeType: selected.treeType,
      name: selected.name,
      charge: cost,
      locked: selected.locked,
      purchasable: selected.purchasable,
      streak: selected.streak ?? catalog.streak,
      streakRequired: selected.streakRequired,
    });
  }

  const frame = popup ? "beda-shop is-popup" : overlay ? "beda-shop is-overlay" : "beda-shop";
  const ownedTrying = trying ? pieceOwned(catalog, trying.id) || selected?.owned === true : false;
  const showWear = Boolean(selected && (selected.owned || ownedTrying) && selected.kind === "piece");
  const showBuy = Boolean(selected && selected.purchasable && !selected.owned && !selected.locked && missing <= 0 && selected.kind !== "colour");
  const showBlock = Boolean(selected && !showWear && !showBuy && selected.kind !== "colour");

  return (
    <div className={frame} data-theme={theme} data-testid="beda-xu-shop" data-popup={popup ? "1" : "0"}>
      <header className="beda-shop-bar">
        {popup ? null : (
          <button type="button" className="beda-shop-icon-btn" onClick={onClose} aria-label={t("game.shop.back")}>
            ‹
          </button>
        )}
        <h1 className="beda-shop-title">{t("game.shop.title")}</h1>
        <div className="beda-shop-pills">
          <span className="beda-shop-pill" data-testid="beda-xu-balance" aria-live="polite">
            <b aria-hidden>●</b>
            {xu(locale, catalog.balance)}
          </span>
        </div>
      </header>
      {problem ? (
        <p className="beda-shop-problem" role="alert">
          {problem}
        </p>
      ) : null}
      <div className="beda-shop-tabs" role="tablist" aria-label={t("game.shop.title")}>
        {openShelves.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            className={tab === id ? "beda-shop-tab is-on" : "beda-shop-tab"}
            aria-selected={tab === id}
            data-testid={`beda-xu-tab-${id}`}
            onClick={() => setTab(id)}
          >
            {t(`game.shop.tabs.${id}`)}
          </button>
        ))}
      </div>
      <section className="beda-shop-stage" data-testid="beda-xu-preview" aria-label={t("game.shop.tryFree")}>
        <div
          className={["beda-shop-hero", focus ? `is-zoom is-zoom-${focus}` : "", !wornOnBody && trying ? "is-decor" : ""].filter(Boolean).join(" ")}
          data-testid="beda-xu-hero"
          data-zoom={focus ?? ""}
        >
          <div className="beda-shop-hero-frame">
            {shown ? (
              <BeDaFigure
                view={shown}
                locale={locale}
                dress={gameDress(genderLook(DEFAULT_GAME_LOOK, who))}
                crowd
                marks
              />
            ) : null}
            {layer ? <img className="beda-shop-wear" src={mascotAssetUrl(layer)} alt="" data-testid="beda-xu-wear-layer" /> : null}
          </div>
          {(focus || (!wornOnBody && trying)) && selected?.src ? (
            <img className="beda-shop-decor" src={mascotAssetUrl(selected.src)} alt="" data-testid="beda-xu-decor" />
          ) : null}
        </div>
        {trying && bubbleColour(trying.id) ? (
          <p className="beda-shop-speech" style={bubbleFrameStyle(trying.id)} data-testid="beda-xu-sample-bubble">
            {t("game.shop.bubbleHello")}
          </p>
        ) : null}
        {trying ? (
          <div className="beda-shop-trying">
            <div>
              <p className="beda-shop-kicker">{wornOnBody ? t("game.shop.trying") : t("game.shop.decor")}</p>
              <strong>{trying.name}</strong>
              {trying.price > 0 ? <p className="beda-shop-price">{xu(locale, trying.price)}</p> : null}
              {wornOnBody ? null : <p className="beda-shop-note">{t("game.shop.decorNote")}</p>}
            </div>
          </div>
        ) : (
          <p className="beda-shop-note">{t("game.shop.previewEmpty")}</p>
        )}
        {dialog ? null : <p className="beda-shop-note">{t("game.shop.skinNote")}</p>}
      </section>
      <div className="beda-shop-scroll">
        <div className="beda-shop-grid" data-testid="beda-xu-grid" data-shelf={tab}>
          {cards.map((card) => (
            <ShelfButton
              key={card.id}
              card={card}
              locale={locale}
              balance={catalog.balance}
              picked={trying?.id === card.id}
              wearing={wornPiece(player, card, who)}
              onChoose={() => choose(card)}
            />
          ))}
        </div>
        <section className="beda-shop-season" data-testid="beda-xu-seasonal">
          <h2>{t("game.shop.seasonalTitle")}</h2>
          <p className="beda-shop-note">{t("game.shop.seasonalBody")}</p>
        </section>
      </div>
      {selected && selected.kind !== "colour" ? (
        <div className="beda-shop-dock" data-testid="beda-xu-dock">
          {showWear ? (
            <button
              type="button"
              className="beda-shop-buy"
              data-testid="beda-xu-wear"
              disabled={pending || wearing}
              onClick={onWear}
            >
              {wearing ? t("game.shop.wearing") : t("game.shop.wearNow")}
            </button>
          ) : null}
          {showBuy ? (
            <button
              type="button"
              className="beda-shop-buy"
              data-testid={`beda-xu-buy-${selected.id}`}
              disabled={pending}
              onClick={buySelected}
            >
              {t("game.shop.dockBuy", { charge: formatGameCoins(cost, locale) })}
            </button>
          ) : null}
          {showBlock ? (
            <button
              type="button"
              className="beda-shop-buy"
              data-testid={selected.locked ? "beda-xu-locked" : `beda-xu-buy-${selected.id}`}
              disabled
            >
              {selected.locked
                ? t("game.shop.locked")
                : missing > 0
                  ? t("game.shop.shortCard", { count: formatGameCoins(missing, locale) })
                  : t("game.shop.notForSale")}
            </button>
          ) : null}
        </div>
      ) : null}
      {dialog ? (
        <ShopDialogView
          dialog={dialog}
          locale={locale}
          balance={catalog.balance}
          pending={pending}
          onConfirm={onConfirm}
          onDismiss={onDismiss}
          onWear={onWear}
          onCare={onCare}
        />
      ) : null}
    </div>
  );
}

function ShelfButton({
  card,
  locale,
  balance,
  picked,
  wearing,
  onChoose,
}: {
  card: ShelfCard;
  locale: string;
  balance: number;
  picked: boolean;
  wearing: boolean;
  onChoose: () => void;
}) {
  const t = useTranslations("mascot");
  const colour = card.kind === "colour" ? bubbleColour(card.id) : null;
  const missing = cardShort(balance, card);
  const faded = card.locked || missing > 0;
  return (
    <button
      type="button"
      className={["beda-shop-piece", picked ? "is-on" : "", card.owned || wearing ? "is-owned" : "", faded ? "is-short" : ""]
        .filter(Boolean)
        .join(" ")}
      data-testid={card.kind === "colour" ? `beda-xu-colour-${card.id}` : `beda-xu-card-${card.id}`}
      data-short={missing > 0 ? "1" : "0"}
      aria-pressed={picked}
      onClick={onChoose}
    >
      {colour ? (
        <span className="beda-shop-swatch beda-shop-art" style={bubbleFrameStyle(colour.id)}>
          {t("game.shop.bubbleHello")}
        </span>
      ) : card.src ? (
        <img className="beda-shop-art" src={mascotAssetUrl(card.src)} alt="" />
      ) : (
        <span className="beda-shop-art beda-shop-art-empty" aria-hidden />
      )}
      <span className="beda-shop-piece-name">{card.name}</span>
      {card.price > 0 ? <span className="beda-shop-price">{xu(locale, card.price)}</span> : null}
      {wearing ? <span className="beda-shop-owned">{t("game.shop.wearing")}</span> : null}
      {card.owned && !wearing ? <span className="beda-shop-owned">{t("game.shop.owned")}</span> : null}
      {card.locked ? <span className="beda-shop-lock">{t("game.shop.locked")}</span> : null}
      {missing > 0 ? (
        <span className="beda-shop-miss" data-testid={`beda-xu-miss-${card.id}`}>
          {t("game.shop.shortCard", { count: formatGameCoins(missing, locale) })}
        </span>
      ) : null}
    </button>
  );
}

export function ShopClosetTabs({
  items,
  wearingId,
  onWear,
}: {
  items: readonly ShopClosetItem[];
  wearingId: string | null;
  onWear?: (item: ShopClosetItem) => void;
}) {
  const t = useTranslations("mascot");
  const [tab, setTab] = useState<"sets" | "accessories" | "mine">("mine");
  const shown = items.filter((item) => (tab === "mine" ? true : tab === "sets" ? item.kind === "set" : item.kind === "accessory"));
  return (
    <section className="beda-shop-closet" data-testid="beda-shop-closet-tabs">
      <div className="beda-shop-tabs" role="tablist" aria-label={t("game.wardrobe")}>
        {(["sets", "accessories", "mine"] as const).map((id) => (
          <button key={id} type="button" role="tab" className={tab === id ? "beda-shop-tab is-on" : "beda-shop-tab"} aria-selected={tab === id} onClick={() => setTab(id)}>
            {t(`game.shop.tabs.${id}`)}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="beda-shop-note">{t("game.shop.closetEmpty")}</p>
      ) : (
        <div className="beda-shop-grid">
          {shown.map((item) => (
            <button key={item.id} type="button" className="beda-shop-own" data-testid={`beda-xu-owned-${item.id}`} onClick={() => onWear?.(item)}>
              <img src={mascotAssetUrl(shopIconSrc(item.artId))} alt="" />
              <span>{item.name}</span>
              <span className="beda-shop-owned">{wearingId === item.id ? t("game.shop.wearing") : t("game.shop.owned")}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function ShopDialogView({
  dialog,
  locale,
  balance,
  pending,
  onConfirm,
  onDismiss,
  onWear,
  onCare,
}: {
  dialog: Exclude<ShopDialog, null>;
  locale: string;
  balance: number;
  pending: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
  onWear: () => void;
  onCare: () => void;
}) {
  const t = useTranslations("mascot");
  const title =
    dialog.kind === "confirm"
      ? t("game.shop.confirmTitle")
      : dialog.kind === "short"
        ? t("game.shop.shortStay")
        : dialog.kind === "success"
          ? t("game.shop.successTitle")
          : dialog.kind === "owned"
            ? t("game.shop.successAlready")
            : t("game.shop.locked");
  const short = dialog.kind === "short" ? xuShortfall(dialog.balance, dialog.charge) : 0;
  const fill = dialog.kind === "short" && dialog.charge > 0 ? Math.min(100, (dialog.balance / dialog.charge) * 100) : 0;
  return (
    <div className="beda-shop-shade" role="presentation">
      <section className="beda-shop-dialog" role="dialog" aria-modal="true" aria-label={title} data-testid={`beda-xu-${dialog.kind}`}>
        {dialog.kind === "success" ? (
          <div className="beda-shop-pop" aria-hidden>
            <i /><i /><i /><i />
          </div>
        ) : null}
        {dialog.kind === "owned" ? null : <h2>{title}</h2>}
        {dialog.kind === "confirm" ? (
          <>
            <p>{dialog.name}</p>
            <p>{t("game.shop.confirmBody", { charge: formatGameCoins(dialog.charge, locale), balance: formatGameCoins(balance, locale) })}</p>
            <div className="beda-shop-dialog-actions">
              <button type="button" className="beda-shop-ghost" onClick={onDismiss}>{t("game.shop.confirmNo")}</button>
              <button type="button" className="beda-shop-buy" data-testid="beda-xu-confirm-yes" disabled={pending} onClick={onConfirm}>
                {t("game.shop.confirmYes", { charge: formatGameCoins(dialog.charge, locale) })}
              </button>
            </div>
          </>
        ) : null}
        {dialog.kind === "short" ? (
          <>
            <p>{dialog.name}</p>
            <p>{t("game.shop.shortHave", { balance: formatGameCoins(dialog.balance, locale) })}</p>
            <p>{t("game.shop.shortNeed", { charge: formatGameCoins(dialog.charge, locale) })}</p>
            <div className="beda-shop-meter" aria-hidden><span style={{ width: `${fill}%` }} /></div>
            {short > 0 ? (
              <p>{t("game.shop.shortLeft", { short: formatGameCoins(short, locale) })}</p>
            ) : null}
            <div className="beda-shop-dialog-actions">
              <button type="button" className="beda-shop-ghost" onClick={onDismiss}>{t("game.shop.confirmNo")}</button>
              <button type="button" className="beda-shop-buy" onClick={onCare}>{t("game.shop.shortGo")}</button>
            </div>
            <p className="beda-shop-note">{t("game.shop.shortNote")}</p>
          </>
        ) : null}
        {dialog.kind === "success" ? (
          <>
            <p>{dialog.name}</p>
            <p>{t("game.shop.successWarm")}</p>
            <p>
              {dialog.already
                ? t("game.shop.successAlready")
                : t("game.shop.successCharged", { charged: formatGameCoins(dialog.charged, locale), balance: formatGameCoins(dialog.balance, locale) })}
            </p>
            {dialog.bonusName ? <p>{t("game.shop.successBonus", { name: dialog.bonusName })}</p> : null}
            <div className="beda-shop-dialog-actions">
              <button type="button" className="beda-shop-ghost" onClick={onDismiss}>{t("game.shop.successClose")}</button>
              {dialog.piece ? (
                <button type="button" className="beda-shop-buy" data-testid="beda-xu-success-wear" disabled={pending} onClick={onWear}>
                  {t("game.shop.wearNow")}
                </button>
              ) : null}
            </div>
          </>
        ) : null}
        {dialog.kind === "owned" ? (
          <>
            <p>{t("game.shop.successAlready")}</p>
            <div className="beda-shop-dialog-actions">
              <button type="button" className="beda-shop-ghost" onClick={onDismiss}>{t("game.shop.successClose")}</button>
              <button type="button" className="beda-shop-buy" data-testid="beda-xu-owned-wear" disabled={pending || !dialog.piece} onClick={onWear}>
                {t("game.shop.wearNow")}
              </button>
            </div>
          </>
        ) : null}
        {dialog.kind === "locked" ? (
          <>
            <p>{t("game.shop.lockedBody", { need: dialog.need, streak: dialog.streak })}</p>
            <div className="beda-shop-dialog-actions">
              <button type="button" className="beda-shop-buy" onClick={onDismiss}>{t("game.shop.successClose")}</button>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}

export function XuShopScreen({
  locale,
  gender,
  player,
  onClose,
  presentation = "popup",
}: {
  locale: string;
  gender: BeDaGender | null;
  player: BeDaView | null;
  onClose: () => void;
  /** Popup over the room. `page` keeps the full-page shop. */
  presentation?: "popup" | "page";
}) {
  const t = useTranslations("mascot");
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: XU_SHOP_QUERY_KEY, queryFn: getXuShop, staleTime: 15_000 });
  const [catalog, setCatalog] = useState<ShopCatalog | null>(null);
  const who: BeDaGender = (player?.gender ?? gender) === "male" ? "male" : "female";
  const [trying, setTrying] = useState<ShopTry | null>(null);
  const [dialog, setDialog] = useState<ShopDialog>(null);
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const attempt = useRef<PurchaseAttempt | null>(null);
  const pendingRef = useRef(false);
  /** Balance from the last receipt. A stale refetch must not put the old total back. */
  const receiptBalance = useRef<number | null>(null);

  useEffect(() => {
    if (!query.data) return;
    if (receiptBalance.current != null && query.data.balance !== receiptBalance.current) return;
    receiptBalance.current = null;
    setCatalog(query.data);
  }, [query.data]);

  async function purchase(itemId: string, treeType: string) {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setProblem(null);
    const next = reusePurchaseAttempt(attempt.current, itemId, treeType);
    attempt.current = next;
    try {
      const receipt = await buyShopItem(itemId, treeType, next.key);
      attempt.current = null;
      receiptBalance.current = receipt.balance;
      setCatalog((current) => (current ? applyShopReceipt(current, receipt) : current));
      void queryClient.invalidateQueries({ queryKey: XU_SHOP_QUERY_KEY });
      const piece = shopTryPiece(receipt);
      const bonus = receipt.bonusGranted[0]?.name ?? "";
      setDialog({
        kind: "success",
        name: piece?.name || receipt.itemId,
        charged: receipt.charged,
        balance: receipt.balance,
        already: receipt.already,
        bonusName: bonus,
        piece,
      });
      if (piece) {
        setTrying({
          id: piece.id,
          artId: shopArtId(piece.id),
          name: piece.name || piece.id,
          price: receipt.charged,
          setName: "",
          layer: piece.layer,
        });
      }
    } catch (err) {
      if (!shopRetrySameKey(err)) attempt.current = null;
      const info = readShopError(err);
      if (info.code === "not_enough_coins") {
        const have = info.balance ?? catalog?.balance ?? 0;
        const need = info.needed ?? 0;
        setDialog({ kind: "short", name: trying?.name ?? "", charge: need, balance: have });
      } else if (info.code === "streak_locked") {
        setDialog({ kind: "locked", streak: info.streak ?? 0, need: info.streakRequired ?? 30 });
      } else if (info.code === "already_owned") {
        setDialog({
          kind: "owned",
          name: trying?.name ?? "",
          piece: trying ? { id: trying.id, name: trying.name, layer: trying.layer } : null,
        });
        void query.refetch();
      } else if (info.code === "idempotency_conflict" || info.code === "bad_idempotency_key") {
        setProblem(t("game.shop.conflict"));
      } else if (info.code === "not_for_sale") {
        setProblem(t("game.shop.notForSale"));
      } else if (!(err instanceof ApiError) || (err.status != null && err.status < 500)) {
        setProblem(t("game.shop.failed"));
      } else {
        setProblem(t("game.shop.failed"));
      }
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  function onBuy(ask: BuyAsk) {
    if (!catalog || pendingRef.current) return;
    const step = shopNextStep({
      itemId: ask.itemId,
      charge: ask.charge,
      balance: catalog.balance,
      locked: ask.locked,
      purchasable: ask.purchasable,
      streak: ask.streak,
      streakRequired: ask.streakRequired,
    });
    if (step.type === "locked") {
      setDialog({ kind: "locked", streak: step.streak, need: step.need });
      return;
    }
    if (step.type === "short") {
      setDialog({ kind: "short", name: ask.name, charge: ask.charge, balance: catalog.balance });
      return;
    }
    if (step.type === "confirm") {
      setDialog({ kind: "confirm", itemId: ask.itemId, treeType: ask.treeType, name: ask.name, charge: ask.charge });
      return;
    }
    if (step.type === "buy") void purchase(ask.itemId, ask.treeType);
  }

  async function wear() {
    const piece =
      dialog?.kind === "success" || dialog?.kind === "owned" ? dialog.piece : trying;
    if (!piece) return;
    setPending(true);
    try {
      await wearShopPiece(queryClient, piece.id, piece.layer, who);
      pushLoiEvent("mac_do_moi");
      setProblem(null);
    } catch {
      setProblem(t("game.shop.wearFailed"));
    } finally {
      setPending(false);
    }
  }

  const popup = presentation === "popup";
  const loading = (
    <div className={popup ? "beda-shop is-popup" : "beda-shop is-overlay"} data-testid="beda-xu-shop">
      <header className="beda-shop-bar">
        {popup ? null : (
          <button type="button" className="beda-shop-icon-btn" onClick={onClose} aria-label={t("game.shop.back")}>‹</button>
        )}
        <h1 className="beda-shop-title">{t("game.shop.title")}</h1>
      </header>
      <p className="beda-shop-note" role="status">{query.isError ? t("game.shop.loadFailed") : t("game.shop.loading")}</p>
      {query.isError ? (
        <button type="button" className="beda-shop-buy" onClick={() => void query.refetch()}>{t("game.shop.retry")}</button>
      ) : null}
    </div>
  );
  const body = catalog ? (
    <BeDaXuShop
      catalog={catalog}
      locale={locale}
      gender={who}
      pending={pending}
      trying={trying}
      dialog={dialog}
      problem={problem}
      player={player}
      overlay={!popup}
      popup={popup}
      onClose={onClose}
      onTry={setTrying}
      onBuy={onBuy}
      onConfirm={() => {
        if (dialog?.kind === "confirm") void purchase(dialog.itemId, dialog.treeType);
      }}
      onDismiss={() => setDialog(null)}
      onWear={() => void wear()}
      onCare={() => router.push("/check-in")}
    />
  ) : loading;
  if (!popup) return body;
  return (
    <XuShopPopup
      title={t("game.shop.title")}
      closeLabel={t("game.shop.back")}
      onClose={onClose}
      onEscape={() => {
        if (!dialog) return false;
        setDialog(null);
        return true;
      }}
    >
      {body}
    </XuShopPopup>
  );
}
