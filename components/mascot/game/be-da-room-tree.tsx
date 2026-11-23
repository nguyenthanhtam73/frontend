"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

import { GameIcon } from "@/components/mascot/game/icons";
import { Link } from "@/i18n/navigation";
import { mascotAssetUrl } from "@/lib/mascot/asset-url";
import { formatRoomCoins } from "@/lib/mascot/game/room-shared";
import {
  TREE_STAGE_NAMES,
  nextTreeReward,
  prefersLightMotion,
  stageMark,
  treeClosetArt,
  treeFrame,
  treeMotionMs,
  treePlantSrc,
  treePotSrc,
  treeProgressPercent,
  treeReveal,
  watersUntilLevel,
  type RoomTree,
  type TreeFrame,
  type TreeMotion,
  type TreeReward,
} from "@/lib/mascot/game/room-tree";
import {
  currentTreeGifts,
  currentWornTreeClip,
  saveWornTreeClip,
  subscribeTreeCloset,
  type TreeGift,
} from "@/lib/mascot/game/tree-closet";
import type { RoomTreePanel } from "@/components/mascot/game/use-room-tree";

const CHIP_COLORS = ["#ffd1dc", "#c9f3d6", "#ffe7b8", "#d7e6ff", "#f3d4f6"];

export function RoomTreeCard({
  panel,
  locale,
}: {
  panel: RoomTreePanel;
  locale: string;
}) {
  const t = useTranslations("mascot");
  const tree = panel.tree;
  const motion = panel.motion;
  const light = useLightMotion(panel.reduced);
  const ms = useMotionMs(motion, panel.level, light, panel.animMs, panel.onMotionEnd);
  if (!panel.visible || !tree) return null;
  const reveal = revealed(ms, motion, panel.level, light);
  const before = panel.before;
  const countReady = !motion || !before || reveal.count;
  const stageReady = !motion || !before || reveal.stage;
  const shown: RoomTree = {
    ...tree,
    waters: countReady ? tree.waters : before.waters,
    required: countReady ? tree.required : before.required,
    progress: countReady ? tree.progress : before.progress,
    watered: countReady ? tree.watered : before.watered,
    canWater: countReady ? tree.canWater : before.canWater,
    reason: countReady ? tree.reason : before.reason,
    stage: stageReady ? tree.stage : before.stage,
    stageName: stageReady ? tree.stageName : before.stageName,
    bloomed: stageReady ? tree.bloomed : before.bloomed,
  };
  const frame = motion ? treeFrame(ms, motion, panel.level, light) : null;
  const popupOn = panel.popup != null && panel.popup.length > 0 && (!motion || reveal.popup);
  const toast = panel.toastName && motion === "other" ? t("game.tree.other", { name: panel.toastName }) : "";
  return (
    <>
      <TreeArt
        stage={shown.stage}
        nextStage={tree.stage}
        frame={frame}
        motion={motion}
        toast={toast}
        plusLabel={t("game.tree.plusTurn")}
        toastOpacity={frame?.toast ?? (toast ? 1 : 0)}
        sparkle={shown.bloomed && shown.reason !== "room_ended" && !light}
        softGlow={shown.bloomed && shown.reason !== "room_ended" && light}
      />
      <TreeSheet tree={shown} locale={locale} watering={panel.watering} busy={motion === "water" && !countReady} onWater={panel.onWater} />
      {popupOn && panel.popup ? (
        <TreeGiftPopup
          rewards={panel.popup}
          stage={tree.stage}
          stageName={tree.stageName}
          imageKey={tree.imageKey}
          friends={Math.max(tree.required, tree.watered.length, 1)}
          locale={locale}
          light={light}
          onTake={panel.onTakeGift}
        />
      ) : null}
    </>
  );
}

function revealed(ms: number, motion: TreeMotion | null, level: boolean, light: boolean): { count: boolean; stage: boolean; popup: boolean } {
  if (!motion) return { count: true, stage: true, popup: true };
  if (motion === "other") {
    const at = light ? 200 : 1000;
    return { count: ms >= at, stage: !level || ms >= (light ? 700 : 1800), popup: !level || ms >= (light ? 900 : 3400) };
  }
  return treeReveal(ms, level, light);
}

function useLightMotion(forced: boolean | null): boolean {
  const [light, setLight] = useState(forced ?? false);
  useEffect(() => {
    if (forced != null) {
      setLight(forced);
      return;
    }
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setLight(prefersLightMotion(window));
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [forced]);
  return light;
}

function useMotionMs(
  motion: TreeMotion | null,
  level: boolean,
  light: boolean,
  animMs: number | null,
  onEnd: () => void,
): number {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (animMs != null || !motion) {
      setElapsed(animMs ?? 0);
      return;
    }
    const start = performance.now();
    const limit = treeMotionMs(motion, level, light);
    let frame = 0;
    const tick = (now: number) => {
      const next = now - start;
      setElapsed(next);
      if (next < limit) frame = window.requestAnimationFrame(tick);
      else onEnd();
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [animMs, level, light, motion, onEnd]);
  return animMs ?? elapsed;
}

function TreeArt({
  stage,
  nextStage,
  frame,
  motion,
  toast,
  plusLabel,
  toastOpacity,
  sparkle,
  softGlow,
}: {
  stage: number;
  nextStage: number;
  frame: TreeFrame | null;
  motion: TreeMotion | null;
  toast: string;
  plusLabel: string;
  toastOpacity: number;
  sparkle: boolean;
  softGlow: boolean;
}) {
  const plant = frame?.plant ?? { scaleX: 1, scaleY: 1, opacity: 1 };
  const showNext = frame != null && frame.nextPlant.opacity > 0.02 && nextStage !== stage;
  return (
    <div className="beda-tree-spot" data-testid="beda-tree-spot" data-stage={stage} data-bloom={sparkle || softGlow ? "1" : "0"}>
      {toast && toastOpacity > 0.02 ? (
        <p className="beda-tree-toast" data-testid="beda-tree-toast" style={{ opacity: toastOpacity }}>
          {toast}
        </p>
      ) : null}
      <div className={sparkle ? "beda-tree-art is-bloom" : "beda-tree-art"} aria-hidden>
        <span className="beda-tree-backglow" style={{ opacity: softGlow ? 0.55 : (frame?.glow ?? 0) }} />
        <img
          className="beda-tree-plant"
          alt=""
          src={mascotAssetUrl(treePlantSrc(stage))}
          style={{
            opacity: plant.opacity,
            transform: `scale(${plant.scaleX}, ${plant.scaleY})`,
          }}
        />
        {showNext ? (
          <img
            className="beda-tree-plant is-next"
            alt=""
            src={mascotAssetUrl(treePlantSrc(nextStage))}
            style={{
              opacity: frame.nextPlant.opacity,
              transform: `scale(${frame.nextPlant.scale})`,
            }}
          />
        ) : null}
        <img className="beda-tree-pot" alt="" src={mascotAssetUrl(treePotSrc())} />
        {frame && frame.flash > 0.02 ? <span className="beda-tree-flash" style={{ opacity: frame.flash }} /> : null}
        {(frame?.ripples ?? []).map((ripple, index) => (
          <span
            key={`ripple-${index}`}
            className="beda-tree-ripple"
            style={{ width: ripple.w, height: ripple.h, opacity: ripple.opacity }}
          />
        ))}
        {(frame?.drops ?? []).map((drop, index) => (
          <span key={`drop-${index}`} className="beda-tree-drop" style={{ opacity: drop.opacity, transform: `translate(${drop.x}px, ${drop.y}px)` }}>
            <Drop />
          </span>
        ))}
        {frame && frame.can.opacity > 0.02 && motion !== "other" ? (
          <span
            className="beda-tree-can"
            style={{
              opacity: frame.can.opacity,
              transform: `translate(${frame.can.x}px, ${frame.can.y}px) rotate(${frame.can.rotate}deg)`,
            }}
          >
            <Can />
          </span>
        ) : null}
        {frame && frame.plus.opacity > 0.02 ? (
          <span className="beda-tree-plus" data-testid="beda-tree-plus" style={{ opacity: frame.plus.opacity, transform: `translateY(${frame.plus.y}px)` }}>
            {plusLabel}
          </span>
        ) : null}
        {sparkle
          ? Array.from({ length: 8 }, (_, index) => (
              <i key={index} className="beda-tree-spark" style={{ ["--i" as string]: String(index) }} />
            ))
          : null}
        {(frame?.sparkles ?? []).map((bit, index) => (
          <i key={`fx-${index}`} className="beda-tree-spark is-fx" style={{ ["--i" as string]: String(index), opacity: bit.opacity, transform: `scale(${bit.scale})` }} />
        ))}
        {(frame?.stars ?? []).map((star, index) => (
          <i key={`star-${index}`} className="beda-tree-star" style={{ ["--i" as string]: String(index), opacity: star.opacity, transform: `translateY(${star.y}px)` }} />
        ))}
      </div>
    </div>
  );
}

function TreeSheet({
  tree,
  locale,
  watering,
  busy,
  onWater,
}: {
  tree: RoomTree;
  locale: string;
  watering: boolean;
  busy: boolean;
  onWater: () => void;
}) {
  const t = useTranslations("mascot");
  const next = nextTreeReward(tree);
  const left = watersUntilLevel(tree);
  const fill = treeProgressPercent(tree.progress);
  return (
    <section className="beda-tree-card" data-testid="beda-tree-card" aria-label={t("game.tree.title")}>
      <div className="beda-tree-head">
        <h2 data-testid="beda-tree-count">{t("game.tree.watered", { waters: tree.waters, required: tree.required })}</h2>
        <span data-testid="beda-tree-stage">{t("game.tree.stage", { stage: tree.stage, name: tree.stageName })}</span>
      </div>
      <ol className="beda-tree-rail" data-testid="beda-tree-rail">
        {TREE_STAGE_NAMES.slice(1).map((name, index) => {
          const stage = index + 1;
          const mark = stageMark(stage, tree.stage, tree.bloomed);
          return (
            <li key={name} data-mark={mark}>
              <b>{mark === "done" ? "✓" : stage}</b>
              <span>{name}</span>
              {mark === "soon" ? <small>{t("game.tree.soon")}</small> : null}
              {mark === "done" && stage > 1 ? <small>{t("game.tree.got")}</small> : null}
            </li>
          );
        })}
      </ol>
      <ul className="beda-tree-names" data-testid="beda-tree-names">
        {tree.watered.map((name, index) => (
          <li key={`${name}-${index}`}>
            <span className="beda-tree-face is-done" style={{ background: CHIP_COLORS[index % CHIP_COLORS.length] }}>
              {name.slice(0, 1)}
            </span>
            {name}
          </li>
        ))}
        {tree.canWater || tree.reason === "needs_skin_check" ? (
          <li data-testid="beda-tree-you-waiting">
            <span className="beda-tree-face">?</span>
            {t("game.tree.youNotYet")}
          </li>
        ) : null}
        <li className="is-ai" data-testid="beda-tree-ai">
          <span className="beda-tree-face">AI</span>
          {t("game.tree.ai")}
        </li>
      </ul>
      {left === 1 && !tree.bloomed ? (
        <p className="beda-tree-hint" data-testid="beda-tree-hint">
          {t("game.tree.oneMore", { stage: tree.stage + 1 })}
        </p>
      ) : left != null && left > 1 ? (
        <p className="beda-tree-hint" data-testid="beda-tree-hint">
          {t("game.tree.moreLeft", { count: left, stage: tree.stage + 1 })}
        </p>
      ) : null}
      <div className="beda-tree-bar" data-testid="beda-tree-bar" aria-hidden>
        <span style={{ width: `${fill}%` }} />
      </div>
      {next ? (
        <p className="beda-tree-next" data-testid="beda-tree-next">
          <img src={mascotAssetUrl("/mascot/tree/gift_box.svg")} alt="" />
          {t("game.tree.nextGift", { stage: next.stage })}{" "}
          {next.coins > 0 ? <b>{t("game.tree.coins", { count: formatRoomCoins(next.coins, locale) })}</b> : null}
          {next.itemName ? <em>{next.itemName}</em> : null}
        </p>
      ) : null}
      <p className="beda-tree-wallet">
        {t("game.tree.yourCoins")}{" "}
        <strong data-testid="beda-tree-coins">{formatRoomCoins(tree.balance, locale)}</strong>{" "}
        <small>{t("game.coinsUnit")}</small>
      </p>
      <TreeWater tree={tree} watering={watering} busy={busy} onWater={onWater} />
    </section>
  );
}

function TreeWater({
  tree,
  watering,
  busy,
  onWater,
}: {
  tree: RoomTree;
  watering: boolean;
  busy: boolean;
  onWater: () => void;
}) {
  const t = useTranslations("mascot");
  if (tree.reason === "needs_skin_check") {
    return (
      <Link href="/check-in" className="beda-tree-water is-lock" data-testid="beda-tree-skin">
        <Lock />
        {t("game.tree.skin")}
      </Link>
    );
  }
  if (tree.reason === "already_watered" || (busy === false && !tree.canWater && tree.reason == null && tree.waters > 0 && !tree.bloomed)) {
    return (
      <button type="button" className="beda-tree-water is-done" data-testid="beda-tree-done" disabled>
        {t("game.tree.done")}
      </button>
    );
  }
  if (tree.bloomed || tree.reason === "bloomed") {
    return <p className="beda-tree-bloomnote" data-testid="beda-tree-bloomed">{t("game.tree.bloomed")}</p>;
  }
  if (tree.reason === "room_ended") {
    return (
      <button type="button" className="beda-tree-water is-done" disabled>
        {t("game.tree.ended")}
      </button>
    );
  }
  return (
    <button
      type="button"
      className={watering || busy ? "beda-tree-water is-busy" : "beda-tree-water"}
      data-testid="beda-tree-water"
      disabled={watering || busy || !tree.canWater}
      onClick={onWater}
    >
      <Can />
      {t("game.tree.water")}
    </button>
  );
}

function TreeGiftPopup({
  rewards,
  stage,
  stageName,
  imageKey,
  friends,
  locale,
  light,
  onTake,
}: {
  rewards: readonly TreeReward[];
  stage: number;
  stageName: string;
  imageKey: string;
  friends: number;
  locale: string;
  light: boolean;
  onTake: () => void;
}) {
  const t = useTranslations("mascot");
  const bloom = stage >= 7;
  return (
    <div className="beda-tree-shade" role="dialog" aria-modal="true" data-testid="beda-tree-popup" aria-label={bloom ? t("game.tree.bloomTitle") : t("game.tree.levelTitle", { stage })}>
      {!light ? <i className="beda-tree-confetti" aria-hidden /> : null}
      <div className="beda-tree-popup">
        <p className="beda-tree-popbanner">{bloom ? t("game.tree.bloomTitle") : t("game.tree.levelTitle", { stage })}</p>
        <img className="beda-tree-popplant" alt="" src={mascotAssetUrl(treePlantSrc(stage))} />
        <img className="beda-tree-poppot" alt="" src={mascotAssetUrl(treePotSrc())} />
        <h2>
          {stage === 2
            ? t("game.tree.line2")
            : stage === 3
              ? t("game.tree.line3")
              : stage === 4
                ? t("game.tree.line4")
                : stage === 5
                  ? t("game.tree.line5")
                  : stage === 6
                    ? t("game.tree.line6")
                    : stage === 7
                      ? t("game.tree.line7")
                      : stageName}
        </h2>
        <p>{t("game.tree.thanks")}</p>
        <div className="beda-tree-gifts">
          {rewards.map((reward) => (
            <div key={reward.stage} className="beda-tree-giftrow">
              {reward.coins > 0 ? (
                <div data-testid="beda-tree-gift-coins">
                  <GameIcon name="coin" />
                  <strong>{t("game.tree.plusCoins", { count: formatRoomCoins(reward.coins, locale) })}</strong>
                </div>
              ) : null}
              {reward.itemName ? (
                <div data-testid="beda-tree-gift-item">
                  <img src={mascotAssetUrl(treeClosetArt(reward.itemId))} alt="" />
                  <strong>{reward.itemName}</strong>
                  {!reward.previewOnly ? <small>{t("game.tree.shop")}</small> : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <p className="beda-tree-everyone" data-image={imageKey}>
          {t("game.tree.everyone", { count: friends })}
        </p>
        {bloom ? <p className="beda-tree-stage">{t("game.tree.stage", { stage, name: stageName })}</p> : null}
        <button type="button" className="beda-tree-take" data-testid="beda-tree-take" onClick={onTake}>
          {t("game.tree.take")}
        </button>
      </div>
    </div>
  );
}

export function TreeClosetSection() {
  const t = useTranslations("mascot");
  const gifts = useSyncExternalStore(subscribeTreeCloset, currentTreeGifts, emptyGifts);
  const worn = useSyncExternalStore(subscribeTreeCloset, currentWornTreeClip, () => null);
  if (gifts.length === 0) return null;
  return (
    <div className="beda-tree-closet" data-testid="beda-tree-closet">
      <p>{t("game.tree.gifts")}</p>
      <div className="beda-picks">
        {gifts.map((gift) => (
          <TreeGiftTile key={gift.id} gift={gift} worn={worn === gift.id} />
        ))}
      </div>
    </div>
  );
}

function TreeGiftTile({ gift, worn }: { gift: TreeGift; worn: boolean }) {
  const t = useTranslations("mascot");
  const art = <img src={mascotAssetUrl(treeClosetArt(gift.id))} alt="" />;
  if (gift.previewOnly) {
    return (
      <div className="beda-pick is-preview" data-testid={`beda-tree-gift-${gift.id}`} data-preview="only">
        <span className="beda-pick-art is-clip">{art}</span>
        {gift.name}
        <small>{t("game.tree.preview")}</small>
      </div>
    );
  }
  return (
    <button
      type="button"
      className={worn ? "beda-pick is-on" : "beda-pick"}
      data-testid={`beda-tree-gift-${gift.id}`}
      aria-pressed={worn}
      onClick={() => saveWornTreeClip(worn ? null : gift.id)}
    >
      <span className="beda-pick-art is-clip">{art}</span>
      {gift.name}
      <small>{worn ? t("game.wearing") : t("game.wear")}</small>
    </button>
  );
}

export function useTreeWornClip(): string | null {
  return useSyncExternalStore(subscribeTreeCloset, currentWornTreeClip, () => null);
}

function emptyGifts(): TreeGift[] {
  return [];
}

function Can() {
  return (
    <svg className="beda-tree-can-svg" viewBox="0 0 150 120" aria-hidden>
      <path d="M18 46c18-22 46-22 58-4" fill="none" stroke="#7ec8c2" strokeWidth="8" strokeLinecap="round" />
      <path d="M112 28c16 2 24 16 18 28" fill="none" stroke="#8fd0ea" strokeWidth="7" strokeLinecap="round" />
      <rect x="34" y="40" width="78" height="46" rx="16" fill="#8fe0d8" stroke="#2f6f74" strokeWidth="4" />
      <path d="M46 52h40" stroke="#e9fffb" strokeWidth="5" strokeLinecap="round" />
      <path d="M108 58h18l8 10-8 8h-18" fill="#b7ecf6" stroke="#2f6f74" strokeWidth="4" strokeLinejoin="round" />
    </svg>
  );
}

function Drop() {
  return (
    <svg viewBox="0 0 16 22" aria-hidden>
      <path d="M8 1c4 6 7 9 7 13a7 7 0 1 1-14 0C1 10 4 7 8 1z" fill="#8fd0f5" stroke="#2f6f74" strokeWidth="1.4" />
    </svg>
  );
}

function Lock() {
  return (
    <svg className="beda-tree-lock" viewBox="0 0 24 24" aria-hidden>
      <rect x="5" y="10" width="14" height="10" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8 10V8a4 4 0 0 1 8 0v2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
