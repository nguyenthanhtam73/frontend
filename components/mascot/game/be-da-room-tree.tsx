"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import { GameIcon } from "@/components/mascot/game/icons";
import { SeedDrawDialog } from "@/components/mascot/game/be-da-seed-bag";
import { TreeGiftBox } from "@/components/mascot/game/be-da-gift-box";
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
  treeBloomMissesRoom,
  treeDaysUntilBloom,
  treeProgressPercent,
  treeReveal,
  watersUntilLevel,
  type RoomTree,
  type TreeFrame,
  type TreeMotion,
  type TreeReward,
} from "@/lib/mascot/game/room-tree";
import { useQuery } from "@tanstack/react-query";
import { fetchMascot, mascotQueryKey } from "@/lib/api/mascot";
import { isTreeWearClip, TREE_CLOSET } from "@/lib/mascot/game/room-tree";
import type { RoomTreePanel } from "@/components/mascot/game/use-room-tree";

const CHIP_COLORS = ["#ffd1dc", "#c9f3d6", "#ffe7b8", "#d7e6ff", "#f3d4f6"];

type TreeChrome = {
  plant: ReactNode;
  dock: ReactNode;
};

const TreeChromeContext = createContext<TreeChrome>({ plant: null, dock: null });

/** Shares one watering clock between the pot on the floor and the bar on the screen. */
export function RoomTreeProvider({
  panel,
  locale,
  startOpen = false,
  roomCode = null,
  daysLeft = null,
  onOpenBag,
  children,
}: {
  panel: RoomTreePanel | null;
  locale: string;
  startOpen?: boolean;
  roomCode?: string | null;
  /** Days until the room ends. Null when the server did not send an end. */
  daysLeft?: number | null;
  onOpenBag?: () => void;
  children: ReactNode;
}) {
  const chrome = useTreeChrome(panel, locale, startOpen, roomCode, onOpenBag, daysLeft);
  return <TreeChromeContext.Provider value={chrome}>{children}</TreeChromeContext.Provider>;
}

export function RoomTreePlant() {
  return useContext(TreeChromeContext).plant;
}

export function RoomTreeDock() {
  return useContext(TreeChromeContext).dock;
}

/** Markup tests render the pot and the bar together. */
export function RoomTreePreview({
  panel,
  locale,
  startOpen = false,
  daysLeft = null,
}: {
  panel: RoomTreePanel;
  locale: string;
  startOpen?: boolean;
  daysLeft?: number | null;
}) {
  return (
    <RoomTreeProvider panel={panel} locale={locale} startOpen={startOpen} daysLeft={daysLeft}>
      <RoomTreePlant />
      <RoomTreeDock />
    </RoomTreeProvider>
  );
}

function useTreeChrome(
  panel: RoomTreePanel | null,
  locale: string,
  startOpen: boolean,
  roomCode: string | null,
  onOpenBag: (() => void) | undefined,
  daysLeft: number | null,
): TreeChrome {
  const t = useTranslations("mascot");
  const [open, setOpen] = useState(startOpen);
  const [drawOpen, setDrawOpen] = useState(false);
  const tree = panel?.visible ? panel.tree : null;
  const motion = panel?.motion ?? null;
  const light = useLightMotion(panel?.reduced ?? null);
  const ms = useMotionMs(motion, panel?.level === true, light, panel?.animMs ?? null, panel?.onMotionEnd ?? noop);
  if (!panel || !tree) return { plant: null, dock: null };
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
  const bloomedNow = shown.bloomed || shown.reason === "bloomed";
  const bloomDays = treeDaysUntilBloom(shown.stage, bloomedNow);
  const bloomLate = bloomDays != null && treeBloomMissesRoom(bloomDays, daysLeft);
  return {
    plant: (
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
        open={open}
        onOpen={() => setOpen(true)}
        openLabel={t("game.tree.title")}
        gift={shown.bloomed ? <TreeGiftBox tree={tree} locale={locale} /> : null}
        status={
          bloomDays == null || open ? null : (
            <TreeWaterLine
              count={t("game.tree.statusLine", { waters: shown.waters, required: shown.required })}
              rest={bloomLate ? t("game.tree.bloomLate") : t("game.tree.bloomIn", { days: bloomDays })}
              late={bloomLate}
            />
          )
        }
      />
    ),
    dock: (
      <>
        <TreeDock
          tree={shown}
          locale={locale}
          open={open}
          watering={panel.watering}
          busy={motion === "water" && !countReady}
          onWater={panel.onWater}
          onToggle={() => setOpen((value) => !value)}
        />
        {popupOn && panel.popup ? (
          <TreeGiftPopup
            rewards={panel.popup}
            stage={tree.stage}
            stageName={tree.stageName}
            imageKey={tree.imageKey}
            friends={rewardCount(panel.popup)}
            locale={locale}
            light={light}
            canDraw={tree.canDraw && !tree.myShard && !!roomCode}
            onTake={() => {
              if (tree.canDraw && !tree.myShard && roomCode) {
                setDrawOpen(true);
                return;
              }
              panel.onTakeGift();
            }}
          />
        ) : null}
        {drawOpen && roomCode ? (
          <SeedDrawDialog code={roomCode} draws={tree.draws} onClose={() => { setDrawOpen(false); panel.onTakeGift(); }} />
        ) : null}
        {onOpenBag && tree.bloomed ? (
          <button type="button" className="beda-seed-bag-open" data-testid="beda-seed-bag-open" onClick={onOpenBag}>
            {t("game.seeds.bag")}
          </button>
        ) : null}
      </>
    ),
  };
}

function noop() {
  /* The room is closed. */
}

/** Two short lines so the longest stage name fits a narrow phone. */
function railLines(name: string): [string, string] {
  const parts = name.split(" ");
  if (parts.length <= 2) return [parts[0] ?? name, parts.slice(1).join(" ")];
  const mid = Math.ceil(parts.length / 2);
  return [parts.slice(0, mid).join(" "), parts.slice(mid).join(" ")];
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

/** One cream line under the pot. The second half drops to its own line when the room is too narrow. */
function TreeWaterLine({ count, rest, late }: { count: string; rest: string; late: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [wrapped, setWrapped] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const room = el.closest(".beda-spa-floor");
      const limit = Math.max(0, (room?.clientWidth ?? 0) - 12);
      const countEl = el.querySelector<HTMLElement>("[data-part='count']");
      const restEl = el.querySelector<HTMLElement>("[data-part='rest']");
      const need = (countEl?.scrollWidth ?? 0) + (restEl?.scrollWidth ?? 0) + 18;
      const next = limit > 0 && need > limit;
      setWrapped((prev) => (prev === next ? prev : next));
    };
    measure();
    const room = el.closest(".beda-spa-floor");
    const obs = new ResizeObserver(measure);
    if (room) obs.observe(room);
    window.addEventListener("resize", measure);
    return () => {
      obs.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [count, rest]);
  return (
    <span
      ref={ref}
      className="beda-tree-status"
      data-testid="beda-tree-status"
      data-late={late ? "1" : "0"}
      data-wrap={wrapped ? "1" : "0"}
    >
      <span data-part="count" className="beda-tree-status-count">
        {count}
      </span>
      {wrapped ? null : (
        <span className="beda-tree-status-sep" aria-hidden>
          {" · "}
        </span>
      )}
      <span
        data-part="rest"
        className={late ? "beda-tree-status-rest is-late" : "beda-tree-status-rest"}
        data-testid={late ? "beda-tree-late" : "beda-tree-bloom-in"}
      >
        {rest}
      </span>
    </span>
  );
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
  open,
  onOpen,
  openLabel,
  status,
  gift,
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
  open: boolean;
  onOpen: () => void;
  openLabel: string;
  status: ReactNode;
  gift?: ReactNode;
}) {
  const plant = frame?.plant ?? { scaleX: 1, scaleY: 1, opacity: 1 };
  const showNext = frame != null && frame.nextPlant.opacity > 0.02 && nextStage !== stage;
  return (
    <div className="beda-tree-spot" data-testid="beda-tree-spot" data-stage={stage} data-open={open ? "1" : "0"} data-bloom={sparkle || softGlow ? "1" : "0"}>
      {toast && toastOpacity > 0.02 ? (
        <p className="beda-tree-toast" data-testid="beda-tree-toast" style={{ opacity: toastOpacity }}>
          {toast}
        </p>
      ) : null}
      <button
        type="button"
        className="beda-tree-hit"
        data-testid="beda-tree-open"
        aria-expanded={open}
        aria-label={openLabel}
        onClick={onOpen}
      >
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
      </button>
      {status}
      {gift}
    </div>
  );
}

function TreeDock({
  tree,
  locale,
  open,
  watering,
  busy,
  onWater,
  onToggle,
}: {
  tree: RoomTree;
  locale: string;
  open: boolean;
  watering: boolean;
  busy: boolean;
  onWater: () => void;
  onToggle: () => void;
}) {
  if (!open) return null;
  return <TreeDetail tree={tree} locale={locale} watering={watering} busy={busy} onWater={onWater} onClose={onToggle} />;
}

function TreeDetail({
  tree,
  locale,
  watering,
  busy,
  onWater,
  onClose,
}: {
  tree: RoomTree;
  locale: string;
  watering: boolean;
  busy: boolean;
  onWater: () => void;
  onClose: () => void;
}) {
  const t = useTranslations("mascot");
  const next = nextTreeReward(tree);
  const left = watersUntilLevel(tree);
  const fill = treeProgressPercent(tree.progress);
  return (
    <section className="beda-tree-card is-open" data-testid="beda-tree-card" data-open="1" aria-label={t("game.tree.title")}>
      <div className="beda-tree-head">
        <h2 data-testid="beda-tree-count">{t("game.tree.watered", { waters: tree.waters, required: tree.required })}</h2>
        <button type="button" className="beda-tree-collapse" data-testid="beda-tree-collapse" onClick={onClose}>
          {t("game.spaBoardClose")}
        </button>
      </div>
      <p className="beda-tree-stage" data-testid="beda-tree-stage">
        {t("game.tree.stage", { stage: tree.stage, name: tree.stageName })}
      </p>
      <ol className="beda-tree-rail" data-testid="beda-tree-rail">
        {TREE_STAGE_NAMES.slice(1).map((name, index) => {
          const stage = index + 1;
          const mark = stageMark(stage, tree.stage, tree.bloomed);
          const [line1, line2] = railLines(name);
          return (
            <li key={name} data-mark={mark}>
              <b>{mark === "done" ? "✓" : stage}</b>
              <span title={name}>
                <span className="beda-tree-rail-full">{name}</span>
                {line1}
                {line2 ? <br /> : null}
                {line2}
              </span>
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
  canDraw = false,
  onTake,
}: {
  rewards: readonly TreeReward[];
  stage: number;
  stageName: string;
  imageKey: string;
  friends: number | null;
  locale: string;
  light: boolean;
  canDraw?: boolean;
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
        {friends != null && friends > 0 ? (
          <p className="beda-tree-everyone" data-image={imageKey}>
            {t("game.tree.everyone", { count: friends })}
          </p>
        ) : null}
        {bloom ? <p className="beda-tree-stage">{t("game.tree.stage", { stage, name: stageName })}</p> : null}
        <button type="button" className="beda-tree-take" data-testid="beda-tree-take" onClick={onTake}>
          {bloom && canDraw ? t("game.seeds.pick") : t("game.tree.take")}
        </button>
      </div>
    </div>
  );
}

export function TreeClosetSection({
  selectedId = null,
  onSelect,
}: {
  selectedId?: string | null;
  onSelect?: (clipId: string | null) => void;
}) {
  const t = useTranslations("mascot");
  const query = useQuery({ queryKey: mascotQueryKey, queryFn: fetchMascot, staleTime: 30_000 });
  const gifts = (query.data?.ownedItems ?? [])
    .filter((item) => item.id.startsWith("tree_"))
    .map((item) => ({
      ...item,
      name: TREE_CLOSET.find((row) => row.id === item.id)?.name ?? item.name,
    }));
  if (gifts.length === 0) return null;
  return (
    <div className="beda-tree-closet" data-testid="beda-tree-closet">
      <p>{t("game.tree.gifts")}</p>
      <div className="beda-picks">
        {gifts.map((gift) => {
          const art = <img src={mascotAssetUrl(treeClosetArt(gift.id))} alt="" />;
          if (gift.previewOnly || !isTreeWearClip(gift.id)) {
            return (
              <div key={gift.id} className="beda-pick is-preview" data-testid={`beda-tree-gift-${gift.id}`} data-preview="only">
                <span className="beda-pick-art is-clip">{art}</span>
                {gift.name}
                <small>{t("game.tree.preview")}</small>
              </div>
            );
          }
          const on = selectedId === gift.id;
          return (
            <button
              key={gift.id}
              type="button"
              className={on ? "beda-pick is-on" : "beda-pick"}
              data-testid={`beda-tree-gift-${gift.id}`}
              aria-pressed={on}
              onClick={() => onSelect?.(on ? null : gift.id)}
            >
              <span className="beda-pick-art is-clip">{art}</span>
              {gift.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function rewardCount(rewards: readonly TreeReward[] | null): number | null {
  for (const reward of rewards ?? []) {
    if (reward.rewardedCount != null && reward.rewardedCount > 0) return reward.rewardedCount;
  }
  return null;
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
