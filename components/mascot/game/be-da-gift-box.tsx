"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { mascotAssetUrl } from "@/lib/mascot/asset-url";
import { fetchMascot, mascotQueryKey } from "@/lib/api/mascot";
import {
  bpsLabel,
  getGiftRates,
  giftBoxSrc,
  giftIconSrc,
  giftOpenArt,
  giftRateGroups,
  isCoinPrize,
  listGiftBoxes,
  openGiftBox,
  type GiftOpenResult,
  type GiftRateCard,
} from "@/lib/mascot/game/gift-box";
import { wearGiftPieces } from "@/lib/mascot/game/mascot-wear";
import { giftLoiTrigger, pushLoiEvent } from "@/lib/mascot/loi-noi";
import type { RoomTree } from "@/lib/mascot/game/room-tree";

function boxIdFromTree(tree: RoomTree): string {
  const rows = [...tree.justGranted, ...tree.unseenRewards, ...tree.myRewards, ...tree.rewards];
  return rows.find((row) => row.giftBox && row.boxId)?.boxId ?? "";
}

export function TreeGiftBox({ tree, locale }: { tree: RoomTree; locale: string }) {
  const [boxId, setBoxId] = useState(boxIdFromTree(tree));
  const [mode, setMode] = useState<"idle" | "prompt" | "rates" | "opening" | "result">("idle");
  const [rates, setRates] = useState<GiftRateCard[] | null>(null);
  const [result, setResult] = useState<GiftOpenResult | null>(null);
  const [error, setError] = useState("");
  const opened = useRef(new Set<string>());
  const queryClient = useQueryClient();
  const t = useTranslations("mascot");
  const fromTree = boxIdFromTree(tree);
  useEffect(() => {
    if (fromTree && !opened.current.has(fromTree)) {
      setBoxId(fromTree);
      return;
    }
    if (!tree.bloomed || fromTree) return;
    let cancel = false;
    void listGiftBoxes()
      .then((boxes) => {
        const next = boxes.find((box) => !opened.current.has(box.id));
        if (!cancel && next) setBoxId(next.id);
      })
      .catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, [fromTree, tree.bloomed, tree.treeType]);
  if (!tree.bloomed || !boxId) return null;
  return (
    <>
      <button type="button" className="beda-gift-spot" data-testid="beda-gift-box" onClick={() => setMode("prompt")}>
        <img src={mascotAssetUrl(giftBoxSrc("closed"))} alt="" />
      </button>
      <button
        type="button"
        className="beda-gift-info"
        data-testid="beda-gift-info"
        aria-label={t("game.gift.rates")}
        onClick={() => {
          setMode("rates");
          if (!rates) {
            void getGiftRates(tree.treeType)
              .then(setRates)
              .catch(() => setError(t("game.gift.failed")));
          }
        }}
      >
        i
      </button>
      {mode === "prompt" ? (
        <GiftPrompt
          onLater={() => setMode("idle")}
          onOpen={() => {
            setMode("opening");
            setError("");
            void openGiftBox(boxId)
              .then((openedBox) => {
                opened.current.add(boxId);
                setResult(openedBox);
                setMode("result");
                setBoxId("");
                void queryClient.invalidateQueries({ queryKey: mascotQueryKey });
              })
              .catch(() => {
                setError(t("game.gift.failed"));
                setMode("prompt");
              });
          }}
        />
      ) : null}
      {mode === "opening" ? <GiftShake /> : null}
      {mode === "rates" ? <GiftRates cards={rates} locale={locale} error={error} onClose={() => setMode("idle")} /> : null}
      {mode === "result" && result ? (
        <GiftResult result={result} locale={locale} onClose={() => setMode("idle")} />
      ) : null}
    </>
  );
}

function GiftPrompt({ onOpen, onLater }: { onOpen: () => void; onLater: () => void }) {
  const t = useTranslations("mascot");
  return (
    <div className="beda-tree-shade" role="dialog" aria-modal="true" data-testid="beda-gift-prompt">
      <div className="beda-tree-popup beda-gift-card">
        <p className="beda-tree-popbanner">{t("game.tree.bloomTitle")}</p>
        <h2>{t("game.gift.got")}</h2>
        <p>{t("game.gift.gotBody")}</p>
        <img className="beda-gift-art" src={mascotAssetUrl(giftBoxSrc("closed"))} alt="" />
        <div className="beda-gift-actions">
          <button type="button" onClick={onLater}>{t("game.gift.later")}</button>
          <button type="button" data-testid="beda-gift-open" onClick={onOpen}>{t("game.gift.open")}</button>
        </div>
        <small>{t("game.gift.keep")}</small>
      </div>
    </div>
  );
}

function GiftShake() {
  return (
    <div className="beda-tree-shade" data-testid="beda-gift-shake">
      <img className="beda-gift-art is-shake" src={mascotAssetUrl(giftBoxSrc("shake"))} alt="" />
    </div>
  );
}

export function GiftRates({
  cards,
  locale,
  error,
  onClose,
}: {
  cards: GiftRateCard[] | null;
  locale: string;
  error: string;
  onClose: () => void;
}) {
  const t = useTranslations("mascot");
  const card = cards?.[0];
  return (
    <div className="beda-tree-shade" role="dialog" aria-modal="true" data-testid="beda-gift-rates">
      <div className="beda-tree-popup beda-gift-card">
        <h2>{t("game.gift.rates")}</h2>
        {error ? <p role="alert">{error}</p> : null}
        {card
          ? giftRateGroups(card).map((group) => (
              <section key={group.key} data-testid={`beda-gift-group-${group.key}`}>
                <p data-testid={`beda-gift-tier-${group.key}`}>
                  <strong>{group.name}</strong> {bpsLabel(group.weightBps, locale)}%
                </p>
                <ul className="beda-gift-prizes">
                  {group.rows.map((row) => (
                    <li key={row.id}>
                      {row.name}
                      <b>{bpsLabel(row.weightBps, locale)}%</b>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          : null}
        <button type="button" className="beda-tree-take" onClick={onClose}>{t("game.seeds.close")}</button>
      </div>
    </div>
  );
}

function GiftResult({ result, locale, onClose }: { result: GiftOpenResult; locale: string; onClose: () => void }) {
  const t = useTranslations("mascot");
  const queryClient = useQueryClient();
  const [worn, setWorn] = useState(false);
  useEffect(() => {
    const coins = isCoinPrize(result.prize);
    const trigger = giftLoiTrigger(result.prize.rarity, coins);
    if (trigger) pushLoiEvent(trigger);
  }, [result]);
  const art = giftOpenArt(result.prize.rarity);
  const label = result.prize.rarityName || result.prize.rarity;
  const coins = isCoinPrize(result.prize);
  return (
    <div className="beda-tree-shade" role="dialog" aria-modal="true" data-testid="beda-gift-result" data-rarity={result.prize.rarity} data-kind={coins ? "coins" : result.prize.kind}>
      <div className="beda-tree-popup beda-gift-card">
        <p className="beda-gift-banner">{result.duplicate ? t("game.gift.dupeBanner") : t("game.gift.won")}</p>
        <img className="beda-gift-art" src={mascotAssetUrl(giftBoxSrc(coins ? "thuong" : art))} alt="" />
        {coins ? <CoinBurst /> : <p className="beda-gift-rarity">{label}</p>}
        <h2 data-testid={coins ? "beda-gift-coins" : undefined}>
          {coins ? t("game.gift.plus", { count: result.prize.coins }) : result.prize.name}
        </h2>
        {coins ? null : result.duplicate ? (
          <p data-testid="beda-gift-dupe">{t("game.gift.dupe", { count: result.dupeCoins })}</p>
        ) : (
          <ul className="beda-gift-items">
            {result.granted.map((piece) => (
              <li key={piece.id}>
                <img src={mascotAssetUrl(giftIconSrc(piece.artId || piece.id))} alt="" />
                {piece.name}
              </li>
            ))}
          </ul>
        )}
        <div className={coins || result.duplicate ? "beda-gift-actions is-one" : "beda-gift-actions"}>
          {coins || result.duplicate ? (
            <button type="button" data-testid="beda-gift-take" onClick={onClose}>
              {t("game.gift.close")}
            </button>
          ) : (
            <>
              <button type="button" onClick={onClose}>{t("game.gift.later")}</button>
              <button
                type="button"
                data-testid="beda-gift-wear"
                disabled={worn}
                onClick={() => {
                  void wearGiftPieces(queryClient, result.granted).then(() => setWorn(true));
                }}
              >
                {worn ? t("game.wearing") : t("game.gift.wear")}
              </button>
            </>
          )}
        </div>
        <span className="sr-only">{locale}</span>
      </div>
    </div>
  );
}

function CoinBurst() {
  return (
    <div className="beda-gift-burst" aria-hidden>
      {Array.from({ length: 5 }, (_, index) => (
        <i key={index} className="beda-gift-coin" style={{ ["--i" as string]: String(index) }} />
      ))}
    </div>
  );
}

const GIFT_LAYERS = new Set(["top", "bottom", "hair_acc", "hat", "earring", "glasses", "cheek", "bracelet", "bag"]);

export function GiftClosetSection() {
  const t = useTranslations("mascot");
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: mascotQueryKey, queryFn: fetchMascot, staleTime: 30_000 });
  const loadout = query.data?.loadout;
  const worn = new Set(
    [loadout?.top, loadout?.bottom, loadout?.hairAcc, loadout?.hat, loadout?.earring, loadout?.glasses, loadout?.cheek, loadout?.bracelet, loadout?.bag].filter(
      (id): id is string => Boolean(id),
    ),
  );
  const items = (query.data?.ownedItems ?? []).filter(
    (item) => GIFT_LAYERS.has(item.layer) || item.id === "tree_clip_la_xanh",
  );
  if (items.length === 0) return null;
  return (
    <div className="beda-gift-closet" data-testid="beda-gift-closet">
      <p>{t("game.gift.closet")}</p>
      <div className="beda-picks">
        {items.map((item) => {
          const slot = GIFT_LAYERS.has(item.layer) ? item.layer : "hair_acc";
          const artId = item.id === "tree_clip_la_xanh" ? "acc_kep_toc_la_xanh" : item.id;
          const on = worn.has(item.id);
          return (
            <button
              key={item.id}
              type="button"
              className={on ? "beda-pick is-on" : "beda-pick"}
              data-testid={`beda-gift-wear-${item.id}`}
              aria-pressed={on}
              onClick={() => {
                void wearGiftPieces(queryClient, [{ id: on ? "" : item.id, slot }]);
              }}
            >
              <span className="beda-gift-thumb">
                <img src={mascotAssetUrl(giftIconSrc(artId))} alt="" />
              </span>
              {item.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function coinPrize(id: string, amount: number, weightBps: number) {
  return {
    id,
    name: `${amount} xu`,
    rarity: "coins",
    rarityName: "Xu",
    kind: "coins",
    weightBps,
    dupeCoins: 0,
    coins: amount,
    items: [] as [],
  };
}

function clothPrize(id: string, name: string, rarity: string, rarityName: string, weightBps: number, dupeCoins: number) {
  return { id, name, rarity, rarityName, kind: "set", weightBps, dupeCoins, coins: 0, items: [] as [] };
}

export function GiftPreview({
  scene,
  locale,
  rates,
}: {
  scene: "box" | "rates" | "prize" | "dupe" | "coins";
  locale: string;
  rates?: GiftRateCard[] | null;
}) {
  if (scene === "rates") {
    return (
      <GiftRates
        locale={locale}
        error=""
        onClose={() => undefined}
        cards={rates && rates.length > 0 ? rates : [
          {
            treeType: "leaf",
            name: "Hộp quà Lá xanh",
            treeName: "Cây lá xanh",
            tiers: [
              { key: "coins", name: "Xu", weightBps: 5000, prizeCount: 4, perPrizeBps: 0, dupeCoins: 0 },
              { key: "thuong", name: "Thường", weightBps: 4790, prizeCount: 10, perPrizeBps: 479, dupeCoins: 8 },
              { key: "hiem", name: "Hiếm", weightBps: 200, prizeCount: 4, perPrizeBps: 50, dupeCoins: 88 },
              { key: "sieu", name: "Siêu hiếm", weightBps: 10, prizeCount: 2, perPrizeBps: 5, dupeCoins: 188 },
            ],
            prizes: [
              coinPrize("xu_8", 8, 2000),
              coinPrize("xu_18", 18, 1500),
              coinPrize("xu_28", 28, 1000),
              coinPrize("xu_88", 88, 500),
              clothPrize("set_la_non", "Bộ Lá Non", "thuong", "Thường", 479, 8),
              clothPrize("set_suong_som", "Bộ Sương Sớm", "thuong", "Thường", 479, 8),
              clothPrize("set_co_la", "Bộ Cổ Lá Xinh", "thuong", "Thường", 479, 8),
              clothPrize("set_ke_la", "Bộ Kẻ Lá Me", "thuong", "Thường", 479, 8),
              clothPrize("set_dao_vuon", "Bộ Dạo Vườn", "thuong", "Thường", 479, 8),
              clothPrize("acc_kep", "Kẹp tóc lá xanh", "thuong", "Thường", 479, 8),
              clothPrize("acc_ma", "Sticker má Lá Nhỏ", "thuong", "Thường", 479, 8),
              clothPrize("acc_kinh", "Kính tròn Lá Mạ", "thuong", "Thường", 479, 8),
              clothPrize("acc_vong", "Vòng tay Hạt Lá", "thuong", "Thường", 479, 8),
              clothPrize("acc_no", "Nơ Lá Xanh", "thuong", "Thường", 479, 8),
              clothPrize("set_giot", "Bộ Giọt Sương Mai", "hiem", "Hiếm", 50, 88),
              clothPrize("set_rung", "Bộ Rừng Nhỏ", "hiem", "Hiếm", 50, 88),
              clothPrize("acc_tai", "Khuyên tai Giọt Sương", "hiem", "Hiếm", 50, 88),
              clothPrize("acc_tui", "Túi Lá Biếc", "hiem", "Hiếm", 50, 88),
              clothPrize("set_ngoc", "Bộ Công Chúa Lá Ngọc", "sieu", "Siêu hiếm", 5, 188),
              clothPrize("acc_mu", "Vương miện Lá Ngọc", "sieu", "Siêu hiếm", 5, 188),
            ],
          },
        ]}
      />
    );
  }
  if (scene === "coins") {
    return (
      <div className="beda-game is-spa">
        <GiftResult
          locale={locale}
          onClose={() => undefined}
          result={{
            already: false,
            box: { id: "box-1", treeType: "leaf", artKey: "la_xanh", name: "Hộp quà Lá xanh", treeName: "Cây lá xanh", roomCode: "DA7K2M", opened: true },
            prize: coinPrize("xu_18", 18, 1500),
            granted: [],
            duplicate: false,
            partial: false,
            dupeCoins: 0,
            balance: 38,
          }}
        />
      </div>
    );
  }
  if (scene === "prize" || scene === "dupe") {
    const duplicate = scene === "dupe";
    return (
      <div className="beda-game is-spa">
        <GiftResult
          locale={locale}
          onClose={() => undefined}
          result={{
            already: false,
            box: { id: "box-1", treeType: "leaf", artKey: "la_xanh", name: "Hộp quà Lá xanh", treeName: "Cây lá xanh", roomCode: "DA7K2M", opened: true },
            prize: {
              id: duplicate ? "ke_la" : "suong",
              name: duplicate ? "Bộ Kẻ Lá Me" : "Bộ Sương Sớm",
              rarity: "common",
              rarityName: "Thường",
              kind: "set",
              weightBps: 479,
              dupeCoins: 8,
              coins: 0,
              items: [],
            },
            granted: duplicate
              ? []
              : [
                  { id: "top_ao_len_suong_som", artId: "top_ao_len_suong_som", name: "Áo len Sương Sớm", slot: "top", set: "suong" },
                  { id: "bottom_vay_xep_ly_ma_non", artId: "bottom_vay_xep_ly_ma_non", name: "Váy xếp ly Mạ Non", slot: "bottom", set: "suong" },
                ],
            duplicate,
            partial: false,
            dupeCoins: duplicate ? 8 : 0,
            balance: 28,
          }}
        />
      </div>
    );
  }
  return (
    <div className="beda-game is-spa beda-gift-shot" data-testid="beda-gift-shot">
      <div className="beda-tree-spot">
        <img className="beda-tree-plant" alt="" src={mascotAssetUrl("/mascot/tree/layer_plant_7.svg")} />
        <img className="beda-tree-pot" alt="" src={mascotAssetUrl("/mascot/tree/layer_pot_soil.svg")} />
        <button type="button" className="beda-gift-spot" data-testid="beda-gift-box">
          <img src={mascotAssetUrl(giftBoxSrc("closed"))} alt="" />
        </button>
        <button type="button" className="beda-gift-info" data-testid="beda-gift-info">i</button>
      </div>
    </div>
  );
}
