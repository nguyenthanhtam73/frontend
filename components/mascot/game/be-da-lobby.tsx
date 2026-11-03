"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { useTranslations } from "next-intl";

import { BeDaFigure } from "@/components/mascot/be-da-figure";
import { GameIcon } from "@/components/mascot/game/icons";
import { gameDress, type GameLook } from "@/lib/mascot/game/look";
import {
  FRIEND_CARD_GAP,
  LOBBY_PLAYER_SPOT,
  SAMPLE_LOBBY_FRIENDS,
  lobbyStackZ,
  lobbyTagNudgePx,
  lobbyWalkY,
  placeFriendCard,
  sampleFriendView,
  type LobbySpot,
  type SampleLobbyFriend,
} from "@/lib/mascot/game/lobby";
import type { SkyPeriod } from "@/lib/mascot/game/sky";
import type { BeDaView } from "@/lib/mascot/model";

const TREES = [
  { x: 4, y: 44, s: 0.8 },
  { x: 16, y: 38, s: 0.7 },
  { x: 30, y: 40, s: 0.85 },
  { x: 70, y: 38, s: 0.9 },
  { x: 84, y: 42, s: 0.75 },
  { x: 96, y: 48, s: 1 },
  { x: 8, y: 88, s: 1.1 },
  { x: 98, y: 86, s: 1.05 },
];

const FLOWERS = [
  { x: 12, y: 90 },
  { x: 26, y: 93 },
  { x: 64, y: 91 },
  { x: 80, y: 94 },
];

const LOBBY_SPOTS: readonly LobbySpot[] = [
  ...SAMPLE_LOBBY_FRIENDS.map((friend) => ({ id: friend.id, x: friend.x, y: friend.y })),
  { id: "you", x: LOBBY_PLAYER_SPOT.x, y: LOBBY_PLAYER_SPOT.y },
];

export function BeDaLobby({
  sky,
  player,
  locale,
  look,
  youLabel,
  friendCountLabel,
  dragLabel,
  selectedId,
  wavingId,
  onSelect,
  onAction,
}: {
  sky: SkyPeriod;
  player: BeDaView;
  locale: string;
  look: GameLook;
  youLabel: string;
  friendCountLabel: string;
  dragLabel: string;
  selectedId: string;
  wavingId: string | null;
  onSelect: (id: string) => void;
  onAction: (kind: "wave" | "heart" | "outfit") => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const liftRef = useRef(0);
  const seenSelect = useRef<string | null>(null);
  const dragRef = useRef<{ id: number; x: number; origin: number; moved: boolean } | null>(null);
  const [showHint, setShowHint] = useState(true);
  const night = sky === "night" || sky === "evening";
  const selected = SAMPLE_LOBBY_FRIENDS.find((friend) => friend.id === selectedId) ?? null;

  const paint = (offset: number) => {
    const frame = frameRef.current;
    const world = worldRef.current;
    if (!frame || !world) return;
    const max = Math.max(0, world.offsetWidth - frame.clientWidth);
    const next = Math.min(max, Math.max(0, offset));
    offsetRef.current = next;
    const lift = liftRef.current;
    world.style.transform = `translate3d(${-next}px, ${-lift}px, 0)`;
    frame.style.setProperty("--beda-pan", max === 0 ? "0" : String(next / max));
  };

  const revealSelected = () => {
    const frame = frameRef.current;
    const world = worldRef.current;
    if (!frame || !world || !selected) return;
    const el = world.querySelector<HTMLElement>(`[data-friend-id="${selected.id}"]`);
    if (!el) return;
    const frameBox = frame.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    if (box.left >= frameBox.left + 12 && box.right <= frameBox.right - 12) return;
    const dx = box.left + box.width / 2 - (frameBox.left + frameBox.width / 2);
    paint(offsetRef.current + dx);
  };

  const settleLift = () => {
    const frame = frameRef.current;
    const world = worldRef.current;
    if (!frame || !world) return;
    const nav = frame.closest(".beda-game")?.querySelector<HTMLElement>(".beda-nav");
    if (!nav) return;
    const navTop = nav.getBoundingClientRect().top;
    let extra = Number.NEGATIVE_INFINITY;
    world.querySelectorAll<HTMLElement>(".beda-friend").forEach((el) => {
      const bottom = el.getBoundingClientRect().bottom + 6;
      extra = Math.max(extra, bottom - (navTop - 2));
    });
    if (!Number.isFinite(extra)) return;
    const current = liftRef.current;
    let next = current;
    if (extra > 0.5) next = current + Math.ceil(extra);
    else if (extra < -2) next = Math.max(0, current + Math.floor(extra));
    next = Math.min(next, Math.round(frame.clientHeight * 0.45));
    if (next === current) return;
    liftRef.current = next;
    paint(offsetRef.current);
  };

  const placeCard = () => {
    const frame = frameRef.current;
    if (!frame || !selected) return;
    const card = frame.querySelector<HTMLElement>("[data-testid='beda-actions']");
    const friend = card?.closest<HTMLElement>(".beda-friend");
    if (!card || !friend) return;
    const nav = frame.closest(".beda-game")?.querySelector<HTMLElement>(".beda-nav");
    const frameBox = frame.getBoundingClientRect();
    const friendBox = friend.getBoundingClientRect();
    const navTop = (nav?.getBoundingClientRect().top ?? frameBox.bottom) - frameBox.top;
    const cardWidth = card.offsetWidth;
    const cardHeight = card.offsetHeight;
    const placement = placeFriendCard({
      frameWidth: frame.clientWidth,
      frameHeight: frame.clientHeight,
      friendTop: friendBox.top - frameBox.top,
      friendLeft: friendBox.left - frameBox.left,
      friendWidth: friendBox.width,
      friendHeight: friendBox.height,
      cardWidth,
      cardHeight,
      navTop,
      gap: FRIEND_CARD_GAP,
    });
    const naturalTop = friendBox.top - frameBox.top - cardHeight - FRIEND_CARD_GAP;
    const naturalLeft = friendBox.left - frameBox.left + friendBox.width / 2 - cardWidth / 2;
    card.style.setProperty("--beda-card-dx", `${Math.round(placement.left - naturalLeft)}px`);
    card.style.setProperty("--beda-card-dy", `${Math.round(placement.top - naturalTop)}px`);
    card.dataset.placement = placement.flipped ? "below" : "above";
  };

  const syncRef = useRef<() => void>(() => {});
  const placeCardRef = useRef<() => void>(() => {});
  syncRef.current = () => {
    if (seenSelect.current !== selectedId) {
      seenSelect.current = selectedId;
      revealSelected();
    }
    settleLift();
    placeCard();
  };
  placeCardRef.current = placeCard;

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const world = worldRef.current;
    const you = world?.querySelector<HTMLElement>("[data-lobby-you]");
    if (!frame || !world || !you) return;
    const frameBox = frame.getBoundingClientRect();
    const box = you.getBoundingClientRect();
    const dx = box.left + box.width / 2 - (frameBox.left + frameBox.width / 2);
    paint(offsetRef.current + dx);
  }, []);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const world = worldRef.current;
    if (!frame || !world) return;
    const run = () => syncRef.current();
    run();
    const nav = frame.closest(".beda-game")?.querySelector<HTMLElement>(".beda-nav");
    const observer = new ResizeObserver(run);
    observer.observe(frame);
    observer.observe(world);
    if (nav) observer.observe(nav);
    window.addEventListener("resize", run);
    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", run);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", run);
      viewport?.removeEventListener("resize", run);
    };
  }, [selectedId]);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button, a, .beda-actions")) return;
    dragRef.current = {
      id: event.pointerId,
      x: event.clientX,
      origin: offsetRef.current,
      moved: false,
    };
    frameRef.current?.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    if (Math.abs(dx) > 8) drag.moved = true;
    paint(drag.origin - dx);
    placeCardRef.current();
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const moved = drag.moved;
    dragRef.current = null;
    if (moved) {
      setShowHint(false);
      placeCardRef.current();
      return;
    }
    if ((event.target as HTMLElement).closest("button, a, .beda-actions")) return;
    onSelect("");
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button, a")) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    setShowHint(false);
    paint(offsetRef.current + (event.key === "ArrowLeft" ? -140 : 140));
    placeCardRef.current();
  }

  return (
    <div
      ref={frameRef}
      className="beda-lobby"
      data-testid="beda-lobby"
      data-sky={sky}
      tabIndex={0}
      aria-label={dragLabel}
      style={{ ["--beda-ground-end" as string]: night ? "#6f9474" : "#9fd48e" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
    >
      <div ref={worldRef} className="beda-lobby-world">
        <div className={`beda-lobby-sky beda-sky beda-sky-${sky}`} />
        <div
          className="beda-hill"
          style={{ left: "-8%", width: "48%", background: night ? "#7d739e" : "#a9dcc4" }}
        />
        <div
          className="beda-hill"
          style={{ left: "40%", width: "62%", background: night ? "#9486b0" : "#b9e5cf" }}
        />
        <div
          className="beda-ground"
          style={{
            background: night
              ? "linear-gradient(#8eae8c, #6f9474)"
              : "linear-gradient(#bfe6a8, #9fd48e)",
          }}
        />
        <div className="beda-plaza" />
        <div className="beda-plaza-inner" />
        {TREES.map((tree) => (
          <div
            key={`${tree.x}-${tree.y}`}
            className="beda-tree"
            style={{
              left: `${tree.x}%`,
              top: `${tree.y}%`,
              transform: `translate(-50%, -100%) scale(${tree.s})`,
              zIndex: 1,
            }}
          >
            <i />
            <b />
          </div>
        ))}
        <div className="beda-fountain" style={{ zIndex: 3 }}>
          <div className="beda-fountain-arc" />
          <div className="beda-fountain-stem" />
          <div className="beda-fountain-top" />
          <div className="beda-fountain-basin" />
          <div className="beda-fountain-water" />
          <i className="beda-spark" style={{ left: "18%", top: "20%" }} />
          <i className="beda-spark" style={{ right: "16%", top: "28%", animationDelay: "0.6s" }} />
          <i className="beda-spark" style={{ left: "46%", top: "6%", animationDelay: "1.1s" }} />
        </div>
        {FLOWERS.map((flower) => (
          <i
            key={`${flower.x}-${flower.y}`}
            className="beda-spark"
            style={{
              left: `${flower.x}%`,
              top: `${flower.y}%`,
              background: "#ffb7c9",
              boxShadow: "none",
              width: 10,
              height: 10,
            }}
          />
        ))}
        <i className="beda-butterfly" style={{ left: "24%", top: "30%" }} />
        <i className="beda-butterfly" style={{ left: "58%", top: "26%", animationDelay: "0.8s" }} />
        <i className="beda-butterfly" style={{ left: "80%", top: "32%", animationDelay: "1.4s" }} />
        {SAMPLE_LOBBY_FRIENDS.map((friend) => (
          <FriendButton
            key={friend.id}
            friend={friend}
            locale={locale}
            selected={friend.id === selectedId}
            waving={friend.id === wavingId}
            nudge={lobbyTagNudgePx(friend, LOBBY_SPOTS)}
            onSelect={onSelect}
            onAction={onAction}
          />
        ))}
        <div
          className="beda-friend"
          data-lobby-you=""
          data-friend-id="you"
          data-testid="beda-lobby-you"
          style={{
            left: `${LOBBY_PLAYER_SPOT.x * 100}%`,
            top: `${lobbyWalkY(LOBBY_PLAYER_SPOT.y) * 100}%`,
            width: "calc(var(--beda-friend, 120px) * 1.2)",
            zIndex: lobbyStackZ(LOBBY_PLAYER_SPOT.y),
            transform: "translate(-50%, -100%)",
          }}
        >
          <button type="button" className="beda-friend-hit" onClick={() => onSelect("you")}>
            <span className="beda-friend-art">
              <span className="beda-ring" />
              <BeDaFigure view={player} locale={locale} dress={gameDress(look)} className="w-full" />
            </span>
            <span
              className="beda-tag beda-tag-me"
              style={{
                transform: `translateX(${lobbyTagNudgePx(
                  { id: "you", x: LOBBY_PLAYER_SPOT.x, y: LOBBY_PLAYER_SPOT.y },
                  LOBBY_SPOTS,
                )}px)`,
              }}
            >
              <GameIcon name="pin" className="beda-ico-sm" /> {youLabel}
            </span>
          </button>
        </div>
      </div>
      <div className="beda-lobby-chrome">
        <div className="beda-count">
          <i className="beda-dot" />
          {friendCountLabel}
        </div>
        <div className="beda-mini" aria-hidden>
          <div className="beda-mini-oval" />
          {SAMPLE_LOBBY_FRIENDS.map((friend) => (
            <i
              key={friend.id}
              className="beda-mini-dot"
              style={{ left: `${friend.x * 100}%`, top: `${28 + lobbyWalkY(friend.y) * 55}%` }}
            />
          ))}
          <img
            src="/mascot/icons/minimap_pin.svg"
            alt=""
            className="beda-mini-pin"
            decoding="async"
            style={{ left: `${LOBBY_PLAYER_SPOT.x * 100}%`, top: `${28 + lobbyWalkY(LOBBY_PLAYER_SPOT.y) * 55}%` }}
          />
          <div className="beda-mini-view" />
        </div>
        {showHint ? <div className="beda-drag-hint">{dragLabel}</div> : null}
      </div>
    </div>
  );
}

function FriendButton({
  friend,
  locale,
  selected,
  waving,
  nudge,
  onSelect,
  onAction,
}: {
  friend: SampleLobbyFriend;
  locale: string;
  selected: boolean;
  waving: boolean;
  nudge: number;
  onSelect: (id: string) => void;
  onAction: (kind: "wave" | "heart" | "outfit") => void;
}) {
  const t = useTranslations("mascot");
  const view = sampleFriendView(friend);
  const dress = gameDress(
    { outfit: friend.outfit, hair: friend.hair, clip: friend.clip },
    waving ? "wave" : null,
  );
  return (
    <div
      className={selected ? "beda-friend is-selected" : "beda-friend"}
      data-sample="true"
      data-friend-id={friend.id}
      data-testid={`beda-friend-${friend.id}`}
      style={{
        left: `${friend.x * 100}%`,
        top: `${lobbyWalkY(friend.y) * 100}%`,
        width: `calc(var(--beda-friend, 110px) * ${0.78 + friend.y * 0.4})`,
        zIndex: lobbyStackZ(friend.y),
        transform: "translate(-50%, -100%)",
      }}
    >
      {selected ? (
        <div className="beda-actions beda-card" data-testid="beda-actions" role="group" aria-label={friend.nickname}>
          <button type="button" className="beda-action is-wave" onClick={() => onAction("wave")}>
            <GameIcon name="wave" />
            {t("game.wave")}
          </button>
          <button type="button" className="beda-action" onClick={() => onAction("heart")}>
            <GameIcon name="heart" />
            {t("game.heart")}
          </button>
          <button type="button" className="beda-action" onClick={() => onAction("outfit")}>
            <GameIcon name="outfit" />
            {t("game.outfit")}
          </button>
        </div>
      ) : null}
      <button type="button" className="beda-friend-hit" onClick={() => onSelect(friend.id)}>
        <span className="beda-friend-art">
          <span className="beda-ring" />
          <BeDaFigure view={view} locale={locale} dress={dress} imageLoading="lazy" className="w-full" />
        </span>
        <span className="beda-tag" style={{ transform: `translateX(${nudge}px)` }}>
          {friend.nickname}
        </span>
      </button>
    </div>
  );
}
