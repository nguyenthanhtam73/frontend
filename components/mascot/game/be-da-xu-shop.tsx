"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { BeDaFigure } from "@/components/mascot/be-da-figure";
import { useRouter } from "@/i18n/navigation";
import { ApiError } from "@/lib/api-client";
import { mascotAssetUrl } from "@/lib/mascot/asset-url";
import { BUBBLE_COLOURS, bubbleColour, bubbleFrameStyle } from "@/lib/mascot/game/bubble-colour";
import { formatGameCoins } from "@/lib/mascot/game/coins";
import { wearShopPiece } from "@/lib/mascot/game/mascot-wear";
import type { BeDaGender, BeDaView } from "@/lib/mascot/model";
import {
  applyShopReceipt,
  buyShopItem,
  getXuShop,
  readShopError,
  reusePurchaseAttempt,
  shopAccFilter,
  shopArtId,
  shopClosetItems,
  shopIconSrc,
  shopLayerSrc,
  shopNextStep,
  shopRetrySameKey,
  shopTryPiece,
  shopWearId,
  xuDaysRange,
  xuShortfall,
  XU_SHOP_QUERY_KEY,
  type PurchaseAttempt,
  type ShopAccFilter,
  type ShopCatalog,
  type ShopClosetItem,
  type ShopPiece,
  type ShopSet,
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
  | { kind: "locked"; streak: number; need: number };

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

const FILTERS: ShopAccFilter[] = ["all", "kinh", "toc", "tay", "co", "tai", "tui"];

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
  onClose,
  onGender,
  onTry,
  onClearTry,
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
  onClose: () => void;
  onGender: (gender: BeDaGender) => void;
  onTry: (next: ShopTry) => void;
  onClearTry: () => void;
  onBuy: (ask: BuyAsk) => void;
  onConfirm: () => void;
  onDismiss: () => void;
  onWear: () => void;
  onCare: () => void;
}) {
  const t = useTranslations("mascot");
  const [filter, setFilter] = useState<ShopAccFilter>("all");
  const [tree, setTree] = useState(catalog.seeds.trees.find((row) => row.purchasable)?.key ?? "");
  const wearArt = trying ? shopWearId(trying.artId, gender) : "";
  const tryingOwned = trying ? pieceOwned(catalog, trying.id) : false;
  const layer = wearArt ? shopLayerSrc(wearArt) : "";
  const shown = player ? { ...player, gender } : null;
  const accessories = catalog.accessories.filter((item) => filter === "all" || shopAccFilter(item.id) === filter);

  function tryPiece(piece: ShopPiece, setName = "") {
    onTry({
      id: piece.id,
      artId: shopArtId(piece.id, piece.artId),
      name: piece.name,
      price: piece.price,
      setName,
      layer: piece.layer,
    });
  }

  function buyPiece(piece: ShopPiece) {
    onBuy({
      itemId: piece.id,
      treeType: "",
      name: piece.name,
      charge: piece.charge,
      locked: piece.locked,
      purchasable: piece.purchasable,
      streak: piece.streak ?? catalog.streak,
      streakRequired: piece.streakRequired,
    });
  }

  return (
    <div
      className={overlay ? "beda-shop is-overlay" : "beda-shop"}
      data-theme={theme}
      data-testid="beda-xu-shop"
    >
      <header className="beda-shop-bar">
        <button type="button" className="beda-shop-icon-btn" onClick={onClose} aria-label={t("game.shop.back")}>
          ‹
        </button>
        <h1 className="beda-shop-title">{t("game.shop.title")}</h1>
        <div className="beda-shop-pills">
          <span className="beda-shop-pill" data-testid="beda-xu-balance" aria-live="polite">
            <b aria-hidden>●</b>
            {xu(locale, catalog.balance)}
          </span>
          <span className="beda-shop-pill" data-testid="beda-xu-streak">
            {t("game.shop.streak", { count: catalog.streak })}
          </span>
        </div>
      </header>
      {problem ? (
        <p className="beda-shop-problem" role="alert">
          {problem}
        </p>
      ) : null}
      <div className="beda-shop-layout">
        <section className="beda-shop-stage" aria-label={t("game.shop.tryFree")}>
          <div className="beda-shop-stage-top">
            <p className="beda-shop-kicker">{t("game.shop.tryFree")}</p>
            <div className="beda-shop-genders" role="group" aria-label={t("game.shop.tryFree")}>
              <button type="button" className={gender === "female" ? "beda-shop-chip is-on" : "beda-shop-chip"} aria-pressed={gender === "female"} onClick={() => onGender("female")}>
                {t("game.shop.female")}
              </button>
              <button type="button" className={gender === "male" ? "beda-shop-chip is-on" : "beda-shop-chip"} aria-pressed={gender === "male"} onClick={() => onGender("male")}>
                {t("game.shop.male")}
              </button>
            </div>
          </div>
          <div className="beda-shop-hero">
            {shown ? <BeDaFigure view={shown} locale={locale} /> : null}
            {layer ? <img className="beda-shop-wear" src={mascotAssetUrl(layer)} alt="" /> : null}
          </div>
          {trying && bubbleColour(trying.id) ? (
            <p className="beda-shop-speech" style={bubbleFrameStyle(trying.id)} data-testid="beda-xu-sample-bubble">
              {t("game.shop.bubbleHello")}
            </p>
          ) : null}
          {trying ? (
            <div className="beda-shop-trying">
              <img src={mascotAssetUrl(shopIconSrc(wearArt || trying.artId))} alt="" />
              <div>
                <p className="beda-shop-kicker">{t("game.shop.trying")}</p>
                <strong>{trying.name}</strong>
                {trying.price > 0 ? <p className="beda-shop-price">{xu(locale, trying.price)}</p> : null}
                {trying.setName ? <p className="beda-shop-muted">{trying.setName}</p> : null}
              </div>
            </div>
          ) : (
            <p className="beda-shop-note">{t("game.shop.previewEmpty")}</p>
          )}
          <div className="beda-shop-actions">
            <button type="button" className="beda-shop-ghost" onClick={onClearTry} disabled={!trying}>
              {t("game.shop.clearTry")}
            </button>
            {trying && tryingOwned ? (
              <button type="button" className="beda-shop-buy" data-testid="beda-xu-wear" disabled={pending} onClick={onWear}>
                {t("game.shop.tryOn")}
              </button>
            ) : null}
          </div>
          <p className="beda-shop-note">{t("game.shop.skinNote")}</p>
        </section>
        <div className="beda-shop-main">
          <section className="beda-shop-group" data-testid="beda-xu-group-sets" aria-label={t("game.shop.groups.sets")}>
            <div className="beda-shop-group-head">
              <h2>{t("game.shop.groups.sets")}</h2>
            </div>
            {catalog.sets.map((set) => (
              <SetBlock
                key={set.id}
                set={set}
                locale={locale}
                tryingId={trying?.id ?? ""}
                pending={pending}
                onPiece={(piece) => tryPiece(piece, set.name)}
                onBuyPiece={buyPiece}
                onSet={() =>
                  onBuy({
                    itemId: set.id,
                    treeType: "",
                    name: set.name,
                    charge: set.charge,
                    locked: set.locked,
                    purchasable: set.purchasable,
                    streak: set.streak ?? catalog.streak,
                    streakRequired: set.streakRequired,
                  })
                }
              />
            ))}
          </section>
          <section className="beda-shop-group" data-testid="beda-xu-group-accessories" aria-label={t("game.shop.groups.accessories")}>
            <div className="beda-shop-group-head">
              <h2>{t("game.shop.groups.accessories")}</h2>
            </div>
            <p className="beda-shop-note">{t("game.shop.accNote")}</p>
            <div className="beda-shop-filters" role="group" aria-label={t("game.shop.groups.accessories")}>
              {FILTERS.map((id) => (
                <button key={id} type="button" className={filter === id ? "beda-shop-chip is-on" : "beda-shop-chip"} aria-pressed={filter === id} onClick={() => setFilter(id)}>
                  {t(`game.shop.filters.${id}`)}
                </button>
              ))}
            </div>
            <p className="beda-shop-muted">{t("game.shop.withAny")}</p>
            <div className="beda-shop-grid">
              {accessories.map((piece) => (
                <PieceCard key={piece.id} piece={piece} locale={locale} trying={trying?.id === piece.id} pending={pending} onTry={() => tryPiece(piece)} onBuy={() => buyPiece(piece)} />
              ))}
            </div>
          </section>
          <section className="beda-shop-group" data-testid="beda-xu-group-seeds" aria-label={t("game.shop.groups.seeds")}>
            <div className="beda-shop-group-head">
              <h2>{t("game.shop.groups.seeds")}</h2>
              <span className="beda-shop-price">{xu(locale, catalog.seeds.price)}</span>
            </div>
            <p className="beda-shop-note">{t("game.shop.seedNote")}</p>
            <div className="beda-shop-filters" role="group" aria-label={t("game.shop.seedPick")}>
              {catalog.seeds.trees.map((row) => (
                <button key={row.key} type="button" className={tree === row.key ? "beda-shop-chip is-on" : "beda-shop-chip"} aria-pressed={tree === row.key} onClick={() => setTree(row.key)}>
                  {row.name}
                </button>
              ))}
            </div>
            <div className="beda-shop-actions">
              <button
                type="button"
                className="beda-shop-buy"
                data-testid="beda-xu-seed-buy"
                disabled={pending || !tree || !catalog.seeds.purchasable}
                onClick={() => {
                  const picked = catalog.seeds.trees.find((row) => row.key === tree);
                  if (!picked) return;
                  onBuy({
                    itemId: catalog.seeds.itemId,
                    treeType: picked.key,
                    name: picked.name,
                    charge: picked.price,
                    locked: false,
                    purchasable: picked.purchasable && catalog.seeds.purchasable,
                    streak: catalog.streak,
                    streakRequired: null,
                  });
                }}
              >
                {t("game.shop.buy")} {xu(locale, catalog.seeds.price)}
              </button>
            </div>
          </section>
          <section className="beda-shop-group" data-testid="beda-xu-group-daily" aria-label={t("game.shop.groups.daily")}>
            <div className="beda-shop-group-head">
              <h2>{t("game.shop.groups.daily")}</h2>
            </div>
            <p className="beda-shop-note">{t("game.shop.dailyNote")}</p>
            <div className="beda-shop-grid">
              {catalog.daily.map((piece) => (
                <PieceCard key={piece.id} piece={piece} locale={locale} trying={trying?.id === piece.id} pending={pending} onTry={() => tryPiece(piece)} onBuy={() => buyPiece(piece)} />
              ))}
            </div>
            <div data-testid="beda-xu-bubble-colours">
            <h3 className="beda-shop-kicker">{t("game.shop.bubbleColours")}</h3>
            <div className="beda-shop-grid">
              {BUBBLE_COLOURS.map((colour) => (
                <button
                  key={colour.id}
                  type="button"
                  className={trying?.id === colour.id ? "beda-shop-piece is-on" : "beda-shop-piece"}
                  data-testid={`beda-xu-colour-${colour.id}`}
                  aria-pressed={trying?.id === colour.id}
                  onClick={() =>
                    tryPiece({
                      id: colour.id,
                      name: colour.name,
                      layer: "bubble",
                      artId: colour.id,
                      price: 0,
                      charge: 0,
                      owned: false,
                      locked: false,
                      purchasable: false,
                      lockReason: "",
                      streak: null,
                      streakRequired: null,
                    })
                  }
                >
                  <span className="beda-shop-swatch" style={bubbleFrameStyle(colour.id)}>
                    {t("game.shop.bubbleHello")}
                  </span>
                  <span className="beda-shop-piece-name">{colour.name}</span>
                </button>
              ))}
            </div>
            </div>
          </section>
          <section className="beda-shop-season" data-testid="beda-xu-seasonal">
            <h2>{t("game.shop.seasonalTitle")}</h2>
            <p className="beda-shop-note">{t("game.shop.seasonalBody")}</p>
          </section>
          <ShopClosetTabs
            items={shopClosetItems(catalog)}
            wearingId={null}
            onWear={(item) =>
              tryPiece({
                id: item.id,
                name: item.name,
                layer: item.layer,
                artId: item.artId,
                price: 0,
                charge: 0,
                owned: true,
                locked: false,
                purchasable: false,
                lockReason: "",
                streak: null,
                streakRequired: null,
              })
            }
          />
        </div>
      </div>
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

function SetBlock({
  set,
  locale,
  tryingId,
  pending,
  onPiece,
  onBuyPiece,
  onSet,
}: {
  set: ShopSet;
  locale: string;
  tryingId: string;
  pending: boolean;
  onPiece: (piece: ShopPiece) => void;
  onBuyPiece: (piece: ShopPiece) => void;
  onSet: () => void;
}) {
  const t = useTranslations("mascot");
  const have = set.pieces.filter((piece) => piece.owned).length;
  const total = set.pieces.length;
  const left = total - have;
  return (
    <article className="beda-shop-set" data-testid={`beda-xu-set-${set.id}`}>
      <div className="beda-shop-set-head">
        <h3>{set.name}</h3>
        <span className="beda-shop-price">
          {t("game.shop.setPrice")} {xu(locale, set.price)}
        </span>
      </div>
      <p className="beda-shop-muted">{t("game.shop.collected", { have, total })}</p>
      <div className="beda-shop-bar-line" aria-hidden>
        <span style={{ width: total === 0 ? "0%" : `${(have / total) * 100}%` }} />
      </div>
      {set.locked ? <p className="beda-shop-lock">{t("game.shop.locked")}</p> : null}
      <div className="beda-shop-pieces">
        {set.pieces.map((piece) => (
          <PieceCard key={piece.id} piece={piece} locale={locale} trying={tryingId === piece.id} pending={pending} onTry={() => onPiece(piece)} onBuy={() => onBuyPiece(piece)} />
        ))}
      </div>
      {set.bonus ? (
        <div className="beda-shop-bonus">
          <img src={mascotAssetUrl(shopIconSrc(shopArtId(set.bonus.id, set.bonus.artId)))} alt="" />
          <div>
            <p className="beda-shop-muted">{t("game.shop.bonus", { total })}</p>
            <strong>{set.bonus.name}</strong>
            {set.bonus.owned ? <p className="beda-shop-owned">{t("game.shop.owned")}</p> : <p className="beda-shop-muted">{t("game.shop.bonusLeft", { count: left })}</p>}
          </div>
        </div>
      ) : null}
      {set.locked ? (
        <p className="beda-shop-note">{t("game.shop.lockedBody", { need: set.streakRequired ?? 30, streak: set.streak ?? 0 })}</p>
      ) : set.purchasable ? (
        <div className="beda-shop-actions">
          <button type="button" className="beda-shop-buy" data-testid={`beda-xu-buy-${set.id}`} disabled={pending} onClick={onSet}>
            {have > 0 ? t("game.shop.setRest", { charge: formatGameCoins(set.charge, locale) }) : t("game.shop.setBuy", { charge: formatGameCoins(set.charge, locale) })}
          </button>
        </div>
      ) : (
        <p className="beda-shop-owned">{t("game.shop.owned")}</p>
      )}
    </article>
  );
}

function PieceCard({
  piece,
  locale,
  trying,
  pending,
  onTry,
  onBuy,
}: {
  piece: ShopPiece;
  locale: string;
  trying: boolean;
  pending: boolean;
  onTry: () => void;
  onBuy: () => void;
}) {
  const t = useTranslations("mascot");
  const art = shopArtId(piece.id, piece.artId);
  const colour = bubbleColour(piece.id) ?? bubbleColour(piece.artId);
  return (
    <div
      className={["beda-shop-piece", trying ? "is-on" : "", piece.owned ? "is-owned" : ""].filter(Boolean).join(" ")}
      data-testid={`beda-xu-card-${piece.id}`}
    >
      <button type="button" className="beda-shop-piece-try" aria-pressed={trying} onClick={onTry}>
        {colour ? (
          <span className="beda-shop-swatch" style={bubbleFrameStyle(colour.id)}>
            {t("game.shop.bubbleHello")}
          </span>
        ) : (
          <img src={mascotAssetUrl(shopIconSrc(art))} alt="" />
        )}
        <span className="beda-shop-piece-name">{piece.name}</span>
        <span className="beda-shop-price">{xu(locale, piece.price)}</span>
        {trying ? <span className="beda-shop-kicker">{t("game.shop.trying")}</span> : null}
      </button>
      {piece.owned ? <span className="beda-shop-owned">{t("game.shop.owned")}</span> : null}
      {piece.locked ? <span className="beda-shop-lock">{t("game.shop.locked")}</span> : null}
      {piece.purchasable && !piece.locked ? (
        <button type="button" className="beda-shop-buy" data-testid={`beda-xu-buy-${piece.id}`} disabled={pending} onClick={onBuy}>
          {t("game.shop.buy")}
        </button>
      ) : null}
    </div>
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
          : t("game.shop.locked");
  const short = dialog.kind === "short" ? xuShortfall(dialog.balance, dialog.charge) : 0;
  const days = xuDaysRange(short);
  const fill = dialog.kind === "short" && dialog.charge > 0 ? Math.min(100, (dialog.balance / dialog.charge) * 100) : 0;
  return (
    <div className="beda-shop-shade" role="presentation">
      <section className="beda-shop-dialog" role="dialog" aria-modal="true" aria-label={title} data-testid={`beda-xu-${dialog.kind}`}>
        {dialog.kind === "success" ? (
          <div className="beda-shop-pop" aria-hidden>
            <i /><i /><i /><i />
          </div>
        ) : null}
        <h2>{title}</h2>
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
            {days ? (
              <p>
                {days.min === days.max
                  ? t("game.shop.shortLeftSame", { short: formatGameCoins(short, locale), days: days.min })
                  : t("game.shop.shortLeft", { short: formatGameCoins(short, locale), min: days.min, max: days.max })}
              </p>
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
                  {t("game.shop.tryOn")}
                </button>
              ) : null}
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
}: {
  locale: string;
  gender: BeDaGender | null;
  player: BeDaView | null;
  onClose: () => void;
}) {
  const t = useTranslations("mascot");
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: XU_SHOP_QUERY_KEY, queryFn: getXuShop, staleTime: 15_000 });
  const [catalog, setCatalog] = useState<ShopCatalog | null>(null);
  const [who, setWho] = useState<BeDaGender>(gender === "male" ? "male" : "female");
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

  useEffect(() => {
    if (gender === "male" || gender === "female") setWho(gender);
  }, [gender]);

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
        setProblem(t("game.shop.successAlready"));
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
    const piece = dialog?.kind === "success" ? dialog.piece : trying;
    if (!piece) return;
    setPending(true);
    try {
      await wearShopPiece(queryClient, piece.id, piece.layer, who);
      setProblem(null);
    } catch {
      setProblem(t("game.shop.wearFailed"));
    } finally {
      setPending(false);
    }
  }

  if (!catalog) {
    return (
      <div className="beda-shop is-overlay" data-testid="beda-xu-shop">
        <header className="beda-shop-bar">
          <button type="button" className="beda-shop-icon-btn" onClick={onClose} aria-label={t("game.shop.back")}>‹</button>
          <h1 className="beda-shop-title">{t("game.shop.title")}</h1>
        </header>
        <p className="beda-shop-note" role="status">{query.isError ? t("game.shop.loadFailed") : t("game.shop.loading")}</p>
        {query.isError ? (
          <button type="button" className="beda-shop-buy" onClick={() => void query.refetch()}>{t("game.shop.retry")}</button>
        ) : null}
      </div>
    );
  }

  return (
    <BeDaXuShop
      catalog={catalog}
      locale={locale}
      gender={who}
      pending={pending}
      trying={trying}
      dialog={dialog}
      problem={problem}
      player={player}
      overlay
      onClose={onClose}
      onGender={setWho}
      onTry={setTrying}
      onClearTry={() => setTrying(null)}
      onBuy={onBuy}
      onConfirm={() => {
        if (dialog?.kind === "confirm") void purchase(dialog.itemId, dialog.treeType);
      }}
      onDismiss={() => setDialog(null)}
      onWear={() => void wear()}
      onCare={() => router.push("/check-in")}
    />
  );
}
