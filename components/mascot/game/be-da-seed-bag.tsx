"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { GameIcon } from "@/components/mascot/game/icons";
import { ApiError } from "@/lib/api-client";
import { mascotAssetUrl } from "@/lib/mascot/asset-url";
import { formatRoomCoins } from "@/lib/mascot/game/room-shared";
import {
  buySeedShard,
  drawTreeLeaf,
  getSeedBag,
  seedBlankSlots,
  seedCardSrc,
  seedIdempotencyKey,
  seedPetalSrc,
  seedRetrySameKey,
  seedRingSrc,
  tradeSeedShards,
  type SeedBag,
  type SeedCatalogItem,
  type SeedDrawResult,
} from "@/lib/mascot/game/seed-bag";
import type { TreeMemberDraw } from "@/lib/mascot/game/room-tree";

export function seedProblem(err: unknown, t: (key: string) => string): string {
  const code = err instanceof ApiError ? err.code : "";
  if (code === "not_enough_coins") return t("game.seeds.needCoins");
  if (code === "not_enough_shards") return t("game.seeds.needShards");
  if (code === "mystery_not_tradable") return t("game.seeds.mysteryNoTrade");
  if (code === "mystery_not_for_sale") return t("game.seeds.mysteryNoBuy");
  if (code === "need_seed") return t("game.seeds.needSeed");
  if (code === "draw_unavailable") return t("game.seeds.drawUnavailable");
  if (code === "bad_pick") return t("game.seeds.badPick");
  if (code === "idempotency_conflict") return t("game.seeds.conflict");
  if (code === "already-in" || code === "too_many_rooms") return t("game.seeds.alreadyRoom");
  return t("game.seeds.failed");
}

export function SeedBagSheet({
  bag,
  locale,
  busy,
  error,
  planting,
  onClose,
  onTrade,
  onBuy,
  onPlant,
}: {
  bag: SeedBag;
  locale: string;
  busy: boolean;
  error: string | null;
  planting: string | null;
  onClose: () => void;
  onTrade: (offer: string, want: string) => void;
  onBuy: (typeKey: string) => void;
  onPlant: (typeKey: string) => void;
}) {
  const t = useTranslations("mascot");
  const [trade, setTrade] = useState<{ offer: string; want: string } | null>(null);
  const [buy, setBuy] = useState<string | null>(null);
  const commons = bag.catalog.filter((item) => item.available && !item.comingSoon);
  const canTrade = bag.rules.tradeInCount != null && bag.rules.tradeInCount > 0;
  const price = bag.rules.shardBuyPrice;
  const blanks = seedBlankSlots(bag);
  const offerItem = commons.find((item) => item.typeKey === trade?.offer) ?? null;
  const wantItem = commons.find((item) => item.typeKey === trade?.want) ?? null;
  const buyItem = commons.find((item) => item.typeKey === buy) ?? null;
  return (
    <div className="beda-seed-shade" role="dialog" aria-modal="true" data-testid="beda-seed-bag" aria-label={t("game.seeds.bag")}>
      <section className="beda-seed-sheet">
        <header className="beda-seed-head">
          <button type="button" onClick={onClose} aria-label={t("game.back")}>
            ←
          </button>
          <h2>{t("game.seeds.bag")}</h2>
          <span data-testid="beda-seed-balance">
            <GameIcon name="coin" />
            {formatRoomCoins(bag.balance, locale)}
          </span>
        </header>
        <MysteryBanner bag={bag} planting={planting} onPlant={bag.mysterySeeds > 0 ? onPlant : null} />
        <div className="beda-seed-actions">
          <button type="button" data-testid="beda-seed-trade" disabled={!canTrade || busy} onClick={() => setTrade({ offer: "", want: "" })}>
            {t("game.seeds.trade")}
          </button>
          <button type="button" data-testid="beda-seed-buy" disabled={price == null || busy} onClick={() => setBuy("")}>
            {t("game.seeds.buy")}
          </button>
        </div>
        {error ? <p className="beda-seed-error" role="alert">{error}</p> : null}
        <div className="beda-seed-grid">
          {bag.catalog.map((item) => (
            <SeedSlot key={item.typeKey} item={item} bag={bag} planting={planting} onPlant={onPlant} />
          ))}
          {Array.from({ length: blanks }, (_, index) => (
            <div key={`soon-${index}`} className="beda-seed-slot is-soon" data-testid="beda-seed-soon">
              <b aria-hidden>🔒</b>
              <span>{t("game.seeds.soon")}</span>
            </div>
          ))}
        </div>
      </section>
      {trade ? (
        <TradeDialog
          bag={bag}
          commons={commons}
          offer={offerItem}
          want={wantItem}
          offerKey={trade.offer}
          wantKey={trade.want}
          busy={busy}
          onOffer={(typeKey) => setTrade({ offer: typeKey, want: trade.want === typeKey ? "" : trade.want })}
          onWant={(typeKey) => setTrade({ ...trade, want: typeKey })}
          onClose={() => setTrade(null)}
          onConfirm={() => {
            if (!offerItem || !wantItem) return;
            onTrade(offerItem.typeKey, wantItem.typeKey);
          }}
        />
      ) : null}
      {buy != null ? (
        <BuyDialog
          bag={bag}
          locale={locale}
          commons={commons}
          item={buyItem}
          selected={buy}
          busy={busy}
          onSelect={setBuy}
          onClose={() => setBuy(null)}
          onConfirm={() => {
            if (!buyItem || price == null) return;
            onBuy(buyItem.typeKey);
          }}
        />
      ) : null}
    </div>
  );
}

export function SeedBagLoader({
  locale,
  onClose,
  onPlant,
}: {
  locale: string;
  onClose: () => void;
  onPlant: (typeKey: string) => Promise<void>;
}) {
  const t = useTranslations("mascot");
  const [bag, setBag] = useState<SeedBag | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [planting, setPlanting] = useState<string | null>(null);
  const tradeKey = useRef<string | null>(null);
  const buyKey = useRef<string | null>(null);
  useEffect(() => {
    let cancel = false;
    void getSeedBag()
      .then((next) => {
        if (!cancel) setBag(next);
      })
      .catch((err: unknown) => {
        if (!cancel) setError(seedProblem(err, t));
      });
    return () => {
      cancel = true;
    };
  }, []);
  if (!bag) {
    return (
      <div className="beda-seed-shade" role="dialog" aria-modal="true" data-testid="beda-seed-bag">
        <section className="beda-seed-sheet">
          <p>{error ?? t("game.seeds.loading")}</p>
          <button type="button" onClick={onClose}>{t("game.back")}</button>
        </section>
      </div>
    );
  }
  return (
    <SeedBagSheet
      bag={bag}
      locale={locale}
      busy={busy}
      error={error}
      planting={planting}
      onClose={onClose}
      onTrade={(offer, want) => {
        const count = bag.rules.tradeInCount;
        if (count == null || busy) return;
        if (!tradeKey.current) tradeKey.current = seedIdempotencyKey();
        const key = tradeKey.current;
        setBusy(true);
        setError(null);
        void tradeSeedShards(offer, count, want, key)
          .then((next) => {
            tradeKey.current = null;
            setBag(next);
          })
          .catch((err: unknown) => {
            if (!seedRetrySameKey(err)) tradeKey.current = null;
            setError(seedProblem(err, t));
          })
          .finally(() => setBusy(false));
      }}
      onBuy={(typeKey) => {
        if (busy) return;
        if (!buyKey.current) buyKey.current = seedIdempotencyKey();
        const key = buyKey.current;
        setBusy(true);
        setError(null);
        void buySeedShard(typeKey, key)
          .then((next) => {
            buyKey.current = null;
            setBag(next);
          })
          .catch((err: unknown) => {
            if (!seedRetrySameKey(err)) buyKey.current = null;
            setError(seedProblem(err, t));
          })
          .finally(() => setBusy(false));
      }}
      onPlant={(typeKey) => {
        if (planting) return;
        setPlanting(typeKey);
        setError(null);
        void onPlant(typeKey)
          .catch((err: unknown) => setError(seedProblem(err, t)))
          .finally(() => setPlanting(null));
      }}
    />
  );
}

function MysteryBanner({
  bag,
  planting,
  onPlant,
}: {
  bag: SeedBag;
  planting: string | null;
  onPlant: ((typeKey: string) => void) | null;
}) {
  const t = useTranslations("mascot");
  const src = seedRingSrc("mystery", bag.mysteryShards);
  const merge = bag.rules.mergeCount;
  return (
    <div className="beda-seed-mystery" data-testid="beda-seed-mystery">
      {src ? <img src={mascotAssetUrl(src)} alt="" /> : null}
      <div>
        <strong>
          {bag.mysteryShardName || t("game.seeds.mystery")}
          {merge != null ? ` ${bag.mysteryShards}/${merge}` : ""}
        </strong>
        <p>{t("game.seeds.mysteryNoTrade")}</p>
        {bag.mysterySeeds > 0 ? <small>{t("game.seeds.seedCount", { count: bag.mysterySeeds })}</small> : null}
        {onPlant && bag.mysterySeeds > 0 ? (
          <button type="button" data-testid="beda-seed-plant-mystery" disabled={planting != null} onClick={() => onPlant("mystery")}>
            {planting === "mystery" ? t("game.seeds.planting") : t("game.seeds.plant")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function SeedSlot({
  item,
  bag,
  planting,
  onPlant,
}: {
  item: SeedCatalogItem;
  bag: SeedBag;
  planting: string | null;
  onPlant: (typeKey: string) => void;
}) {
  const t = useTranslations("mascot");
  if (item.comingSoon || !item.available) {
    return (
      <div className="beda-seed-slot is-soon" data-testid={`beda-seed-${item.typeKey}`}>
        <b aria-hidden>🔒</b>
        <span>{item.nameVi}</span>
        <small>{t("game.seeds.soon")}</small>
      </div>
    );
  }
  const src = seedRingSrc(item.typeKey, item.shards);
  const merge = bag.rules.mergeCount;
  return (
    <div className="beda-seed-slot" data-testid={`beda-seed-${item.typeKey}`}>
      {src ? <img src={mascotAssetUrl(src)} alt="" /> : null}
      <span>{item.nameVi}</span>
      <strong>{t("game.seeds.seedCount", { count: item.seeds })}</strong>
      {merge != null ? <small>{t("game.seeds.shardCount", { count: item.shards, total: merge })}</small> : null}
      {item.seeds > 0 ? (
        <button type="button" data-testid={`beda-seed-plant-${item.typeKey}`} disabled={planting != null} onClick={() => onPlant(item.typeKey)}>
          {planting === item.typeKey ? t("game.seeds.planting") : t("game.seeds.plant")}
        </button>
      ) : null}
    </div>
  );
}

function TradeDialog({
  bag,
  commons,
  offer,
  want,
  offerKey,
  wantKey,
  busy,
  onOffer,
  onWant,
  onClose,
  onConfirm,
}: {
  bag: SeedBag;
  commons: SeedCatalogItem[];
  offer: SeedCatalogItem | null;
  want: SeedCatalogItem | null;
  offerKey: string;
  wantKey: string;
  busy: boolean;
  onOffer: (typeKey: string) => void;
  onWant: (typeKey: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const t = useTranslations("mascot");
  const count = bag.rules.tradeInCount ?? 0;
  const ready = offer != null && want != null && offer.typeKey !== want.typeKey && offer.shards >= count;
  return (
    <div className="beda-seed-dialog" role="dialog" aria-modal="true" data-testid="beda-seed-trade-dialog">
      <h3>{t("game.seeds.tradeTitle")}</h3>
      <p>{t("game.seeds.tradeHint", { count })}</p>
      <div className="beda-seed-picks">
        {commons.map((item) => (
          <button key={item.typeKey} type="button" data-offer={offerKey === item.typeKey ? "1" : "0"} disabled={item.shards < count} onClick={() => onOffer(item.typeKey)}>
            {item.nameVi}
            <small>{t("game.seeds.haveShards", { count: item.shards })}</small>
          </button>
        ))}
      </div>
      <p>{t("game.seeds.tradeWant")}</p>
      <div className="beda-seed-picks">
        {commons.filter((item) => item.typeKey !== offerKey).map((item) => (
          <button key={item.typeKey} type="button" data-want={wantKey === item.typeKey ? "1" : "0"} onClick={() => onWant(item.typeKey)}>
            {item.nameVi}
          </button>
        ))}
      </div>
      {ready && offer && want ? (
        <p data-testid="beda-seed-trade-confirm">
          {t("game.seeds.tradeAsk", { count, offer: offer.nameVi, want: want.nameVi })}
        </p>
      ) : null}
      <div className="beda-seed-dialog-actions">
        <button type="button" onClick={onClose}>{t("game.seeds.cancel")}</button>
        <button type="button" data-testid="beda-seed-trade-yes" disabled={!ready || busy} onClick={onConfirm}>
          {t("game.seeds.tradeYes")}
        </button>
      </div>
    </div>
  );
}

function BuyDialog({
  bag,
  locale,
  commons,
  item,
  selected,
  busy,
  onSelect,
  onClose,
  onConfirm,
}: {
  bag: SeedBag;
  locale: string;
  commons: SeedCatalogItem[];
  item: SeedCatalogItem | null;
  selected: string;
  busy: boolean;
  onSelect: (typeKey: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const t = useTranslations("mascot");
  const price = bag.rules.shardBuyPrice ?? 0;
  const left = bag.balance - price;
  const petal = item ? seedPetalSrc(item.typeKey) : null;
  return (
    <div className="beda-seed-dialog" role="dialog" aria-modal="true" data-testid="beda-seed-buy-dialog">
      <h3>{t("game.seeds.buyTitle")}</h3>
      <div className="beda-seed-picks">
        {commons.map((row) => (
          <button key={row.typeKey} type="button" data-buy={selected === row.typeKey ? "1" : "0"} onClick={() => onSelect(row.typeKey)}>
            {row.nameVi}
          </button>
        ))}
      </div>
      {item && petal ? <img className="beda-seed-petal" src={mascotAssetUrl(petal)} alt="" /> : null}
      {item ? (
        <p data-testid="beda-seed-buy-confirm">
          {t("game.seeds.buyAsk", { name: item.nameVi, price: formatRoomCoins(price, locale) })}
        </p>
      ) : null}
      <p>
        {t("game.seeds.balanceNow", { count: formatRoomCoins(bag.balance, locale) })}
        {item ? ` · ${t("game.seeds.balanceAfter", { count: formatRoomCoins(Math.max(0, left), locale) })}` : ""}
      </p>
      <div className="beda-seed-dialog-actions">
        <button type="button" onClick={onClose}>{t("game.seeds.cancel")}</button>
        <button type="button" data-testid="beda-seed-buy-yes" disabled={!item || left < 0 || busy} onClick={onConfirm}>
          {t("game.seeds.buyYes")}
        </button>
      </div>
    </div>
  );
}

export function SeedDrawDialog({
  code,
  draws,
  onClose,
}: {
  code: string;
  draws: readonly TreeMemberDraw[];
  onClose: () => void;
}) {
  const t = useTranslations("mascot");
  const [result, setResult] = useState<SeedDrawResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const keys = useRef<(string | null)[]>([null, null, null]);
  function flip(pick: number) {
    if (busy || result) return;
    if (!keys.current[pick]) keys.current[pick] = seedIdempotencyKey();
    const key = keys.current[pick]!;
    setBusy(true);
    setError(null);
    void drawTreeLeaf(code, pick, key)
      .then((drawn) => {
        setResult(drawn);
      })
      .catch((err: unknown) => {
        if (!seedRetrySameKey(err)) keys.current[pick] = null;
        setError(seedProblem(err, t));
      })
      .finally(() => setBusy(false));
  }
  return (
    <SeedDrawView
      draws={draws}
      result={result}
      error={error}
      busy={busy}
      onFlip={flip}
      onClose={onClose}
    />
  );
}

export function SeedDrawView({
  draws,
  result,
  error,
  busy,
  gift = null,
  onFlip,
  onClose,
}: {
  draws: readonly TreeMemberDraw[];
  result: SeedDrawResult | null;
  error: string | null;
  busy: boolean;
  gift?: string | null;
  onFlip: (pick: number) => void;
  onClose: () => void;
}) {
  const t = useTranslations("mascot");
  const petal = result ? seedPetalSrc(result.typeKey, result.mystery) : null;
  return (
    <div className="beda-tree-shade" role="dialog" aria-modal="true" data-testid="beda-seed-draw" aria-label={t("game.seeds.drawTitle")}>
      <div className="beda-tree-popup beda-seed-draw">
        <p className="beda-tree-popbanner">{t("game.seeds.drawBanner")}</p>
        <h2>{result ? result.nameVi || t("game.seeds.mystery") : t("game.seeds.drawTitle")}</h2>
        <p>{t("game.seeds.drawBody")}</p>
        {gift ? <p data-testid="beda-seed-gift">{gift}</p> : null}
        {result ? (
          <div className="beda-seed-reveal" data-mystery={result.mystery ? "1" : "0"} data-testid="beda-seed-reveal">
            <img src={mascotAssetUrl(seedCardSrc(result.mystery ? "mystery" : "front"))} alt="" />
            {petal ? <img className="beda-seed-reveal-petal" src={mascotAssetUrl(petal)} alt="" /> : null}
            <strong>{result.nameVi}</strong>
          </div>
        ) : (
          <div className="beda-seed-cards">
            {[0, 1, 2].map((pick) => (
              <button key={pick} type="button" data-testid={`beda-seed-leaf-${pick}`} disabled={busy} onClick={() => onFlip(pick)}>
                <img src={mascotAssetUrl(seedCardSrc("back"))} alt="" />
              </button>
            ))}
          </div>
        )}
        {error ? <p className="beda-seed-error" role="alert">{error}</p> : null}
        <ul className="beda-seed-draws">
          {draws.map((draw) => (
            <li key={draw.name}>
              {draw.name}: {draw.pending || !draw.shard ? t("game.seeds.notFlipped") : draw.shard.nameVi}
            </li>
          ))}
        </ul>
        <p>{t("game.seeds.mergeHint")}</p>
        <button type="button" className="beda-tree-take" data-testid="beda-seed-draw-close" onClick={onClose}>
          {t("game.seeds.close")}
        </button>
      </div>
    </div>
  );
}
