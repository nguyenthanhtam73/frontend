"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { useTranslations } from "next-intl";

import { BeDaFigure } from "@/components/mascot/be-da-figure";
import { IconHand, IconHeart, IconDress, IconStar } from "@/components/mascot/game/icons";
import {
  LOBBY_PLAYER_SPOT,
  SAMPLE_LOBBY_FRIENDS,
  sampleFriendView,
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

export function BeDaLobby({
  sky,
  player,
  locale,
  outfitHue,
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
  outfitHue: number;
  youLabel: string;
  friendCountLabel: string;
  dragLabel: string;
  selectedId: string;
  wavingId: string | null;
  onSelect: (id: string) => void;
  onAction: (kind: "wave" | "heart" | "outfit") => void;
}) {
  const t = useTranslations("mascot");
  const frameRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
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
    world.style.transform = `translate3d(${-next}px,0,0)`;
    frame.style.setProperty("--beda-pan", max === 0 ? "0" : String(next / max));
  };

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const world = worldRef.current;
    const you = world?.querySelector<HTMLElement>("[data-lobby-you]");
    if (!frame || !world || !you) return;
    const center = you.offsetLeft + you.offsetWidth / 2;
    paint(center - frame.clientWidth / 2);
  }, []);

  useEffect(() => {
    const onResize = () => paint(offsetRef.current);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button, a")) return;
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
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    if (drag.moved) setShowHint(false);
    dragRef.current = null;
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button, a")) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    setShowHint(false);
    paint(offsetRef.current + (event.key === "ArrowLeft" ? -140 : 140));
  }

  return (
    <div
      ref={frameRef}
      className="beda-lobby"
      data-testid="beda-lobby"
      data-sky={sky}
      tabIndex={0}
      aria-label={dragLabel}
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
            onSelect={onSelect}
          />
        ))}
        <button
          type="button"
          className="beda-friend"
          data-lobby-you=""
          data-testid="beda-lobby-you"
          style={{
            left: `${LOBBY_PLAYER_SPOT.x * 100}%`,
            top: `${LOBBY_PLAYER_SPOT.y * 100}%`,
            width: "calc(var(--beda-friend, 120px) * 1.2)",
            zIndex: Math.round(LOBBY_PLAYER_SPOT.y * 100),
          }}
          onClick={() => onSelect("you")}
        >
          <span className="beda-friend-art">
            <span className="beda-ring" />
            <BeDaFigure view={player} locale={locale} outfitHue={outfitHue} className="w-full" />
          </span>
          <span className="beda-tag beda-tag-me">
            <IconStar className="beda-ico-sm" /> {youLabel}
          </span>
        </button>
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
              style={{ left: `${friend.x * 100}%`, top: `${28 + friend.y * 55}%` }}
            />
          ))}
          <i
            className="beda-mini-dot is-you"
            style={{ left: `${LOBBY_PLAYER_SPOT.x * 100}%`, top: `${28 + LOBBY_PLAYER_SPOT.y * 55}%` }}
          />
          <div className="beda-mini-view" />
        </div>
        {showHint ? <div className="beda-drag-hint">{dragLabel}</div> : null}
        {selected ? (
          <div className="beda-actions beda-card" data-testid="beda-actions">
            <strong>{selected.nickname}</strong>
            <button type="button" className="beda-action is-wave" onClick={() => onAction("wave")}>
              <IconHand />
              {t("game.wave")}
            </button>
            <button type="button" className="beda-action" onClick={() => onAction("heart")}>
              <IconHeart />
              {t("game.heart")}
            </button>
            <button type="button" className="beda-action" onClick={() => onAction("outfit")}>
              <IconDress />
              {t("game.outfit")}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FriendButton({
  friend,
  locale,
  selected,
  waving,
  onSelect,
}: {
  friend: SampleLobbyFriend;
  locale: string;
  selected: boolean;
  waving: boolean;
  onSelect: (id: string) => void;
}) {
  const view = sampleFriendView(friend);
  return (
    <button
      type="button"
      className={selected ? "beda-friend is-selected" : "beda-friend"}
      data-sample="true"
      data-testid={`beda-friend-${friend.id}`}
      style={{
        left: `${friend.x * 100}%`,
        top: `${friend.y * 100}%`,
        width: `calc(var(--beda-friend, 110px) * ${0.78 + friend.y * 0.4})`,
        zIndex: Math.round(friend.y * 100),
      }}
      onClick={() => onSelect(friend.id)}
    >
      <span
        className="beda-friend-art"
        style={friend.hue ? { filter: `hue-rotate(${friend.hue}deg) saturate(1.08)` } : undefined}
      >
        <BeDaFigure view={view} locale={locale} className="w-full" />
        {waving ? <IconHand className="beda-hand" /> : null}
      </span>
      <span className="beda-ring" />
      <span className="beda-tag">{friend.nickname}</span>
    </button>
  );
}
