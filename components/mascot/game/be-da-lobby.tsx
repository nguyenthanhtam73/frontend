"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { useTranslations } from "next-intl";

import { BeDaFigure } from "@/components/mascot/be-da-figure";
import { SpaProblemLine } from "@/components/mascot/game/be-da-spa-room";
import { GameIcon } from "@/components/mascot/game/icons";
import { gameDress, type GameLook } from "@/lib/mascot/game/look";
import {
  FRIEND_CARD_GAP,
  SAMPLE_LOBBY_FRIENDS,
  lobbyDepthY,
  lobbyNeutralView,
  lobbyStackZ,
  lobbyTagNudgePx,
  lobbyWalkY,
  placeFriendCard,
  sampleFriendView,
  type LobbySpot,
} from "@/lib/mascot/game/lobby";
import { sampleWander, type LobbyActor } from "@/lib/mascot/game/lobby-live";
import { SPA_CODE_ALPHABET, SPA_ROOM_CODE_LENGTH, normalizeRoomCode, type SpaNotice } from "@/lib/mascot/game/spa-room";
import type { GamePose } from "@/lib/mascot/game/look";
import type { LobbyYou } from "@/components/mascot/game/use-lobby-presence";
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
  look,
  dragLabel,
  selectedId,
  actors,
  you,
  live,
  hall,
  hallFull,
  nextHall,
  nicknameError,
  onSelect,
  onAction,
  onWalk,
  onHide,
  onNickname,
  onSwitchHall,
  onCreateRoom,
  onJoinRoom,
  creatingRoom = false,
  createProblem = null,
}: {
  sky: SkyPeriod;
  player: BeDaView;
  locale: string;
  look: GameLook;
  dragLabel: string;
  selectedId: string;
  actors: readonly LobbyActor[];
  you: LobbyYou;
  live: boolean;
  hall: number;
  hallFull: boolean;
  nextHall: number | null;
  nicknameError: boolean;
  onSelect: (id: string) => void;
  onAction: (kind: "wave" | "heart" | "outfit") => void;
  onWalk: (x: number, y: number) => void;
  onHide: (id: string) => void;
  onNickname: (value: string) => boolean;
  onSwitchHall: (lobby: number) => void;
  onCreateRoom?: () => void;
  onJoinRoom?: (code: string) => void;
  creatingRoom?: boolean;
  createProblem?: SpaNotice;
}) {
  const tLobby = useTranslations("mascot");
  const frameRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const liftRef = useRef(0);
  const seenSelect = useRef<string | null>(null);
  const dragRef = useRef<{ id: number; x: number; origin: number; moved: boolean } | null>(null);
  const [showHint, setShowHint] = useState(true);
  const [moving, setMoving] = useState(false);
  const [tick, setTick] = useState(0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(you.nickname);
  const [entering, setEntering] = useState(false);
  const [roomDraft, setRoomDraft] = useState("");
  const [roomError, setRoomError] = useState(false);
  const night = sky === "night" || sky === "evening";
  const placed = actors.map((actor) => {
    if (!actor.sample || tick === 0) return actor;
    const wandered = sampleWander(actor.id, tick * 250, actor.x, actor.y);
    return { ...actor, x: wandered.x, y: wandered.y, facing: wandered.facing, walking: true };
  });
  const spots: LobbySpot[] = [
    ...placed.map((actor) => ({ id: actor.id, x: actor.x, y: actor.y })),
    { id: "you", x: you.x, y: you.y },
  ];
  const selected = placed.find((actor) => actor.id === selectedId) ?? null;

  useEffect(() => {
    setMoving(true);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = window.setInterval(() => setTick((value) => value + 1), 250);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!nicknameError) return;
    setDraft(you.nickname);
    setEditing(true);
  }, [nicknameError, you.nickname]);

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
    if ((event.target as HTMLElement).closest("button, a, .beda-actions, .beda-nick, .beda-switch")) return;
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
    if ((event.target as HTMLElement).closest("button, a, .beda-actions, .beda-nick, .beda-switch")) return;
    const world = worldRef.current;
    if (world) {
      const box = world.getBoundingClientRect();
      const width = box.width || 1;
      const height = box.height || 1;
      const x = (event.clientX - box.left) / width;
      const depth = lobbyDepthY((event.clientY - box.top) / height);
      if (depth != null && x >= 0 && x <= 1) onWalk(Math.min(0.96, Math.max(0.04, x)), depth);
    }
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
      className={moving ? "beda-lobby is-moving" : "beda-lobby"}
      data-testid="beda-lobby"
      data-lobby-mode={live ? "live" : "sample"}
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
        {placed.map((actor) => (
          <FriendButton
            key={actor.id}
            actor={actor}
            locale={locale}
            selected={actor.id === selectedId}
            nudge={lobbyTagNudgePx(actor, spots)}
            onSelect={onSelect}
            onAction={onAction}
            onHide={onHide}
          />
        ))}
        <div
          className="beda-friend"
          data-lobby-you=""
          data-friend-id="you"
          data-testid="beda-lobby-you"
          style={{
            left: `${you.x * 100}%`,
            top: `${lobbyWalkY(you.y) * 100}%`,
            width: "calc(var(--beda-friend, 120px) * 1.2)",
            zIndex: lobbyStackZ(you.y),
            transform: "translate(-50%, -100%)",
          }}
        >
          <button
            type="button"
            className="beda-friend-hit"
            onClick={() => {
              setDraft(you.nickname);
              setEditing(true);
            }}
          >
            <span className="beda-friend-art" style={you.facing === "left" ? { transform: "scaleX(-1)" } : undefined}>
              <span className="beda-ring" />
              <BeDaFigure view={player} locale={locale} dress={gameDress(look, you.pose)} crowd className="w-full" />
            </span>
            <span
              className="beda-tag beda-tag-me"
              style={{
                transform: `translateX(${lobbyTagNudgePx({ id: "you", x: you.x, y: you.y }, spots)}px)`,
              }}
            >
              <GameIcon name="pin" className="beda-ico-sm" /> {you.nickname}
            </span>
          </button>
        </div>
      </div>
      <div className="beda-lobby-chrome">
        <div className="beda-spa-entry" data-testid="beda-spa-entry">
          <button
            type="button"
            data-testid="beda-create-room"
            disabled={creatingRoom}
            onClick={() => onCreateRoom?.()}
          >
            {tLobby("game.spaCreate")}
          </button>
          {entering ? (
            <form
              data-testid="beda-room-code-form"
              onSubmit={(event) => {
                event.preventDefault();
                const next = normalizeRoomCode(roomDraft);
                if (!next) {
                  setRoomError(true);
                  return;
                }
                setRoomError(false);
                onJoinRoom?.(next);
              }}
            >
              <input
                data-testid="beda-room-code"
                aria-label={tLobby("game.spaCodeLabel")}
                value={roomDraft}
                maxLength={SPA_ROOM_CODE_LENGTH}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => {
                  const next = event.target.value
                    .toUpperCase()
                    .split("")
                    .filter((char) => SPA_CODE_ALPHABET.includes(char))
                    .join("")
                    .slice(0, SPA_ROOM_CODE_LENGTH);
                  setRoomDraft(next);
                  setRoomError(false);
                }}
              />
              <button type="submit" data-testid="beda-join-room">
                {tLobby("game.spaJoin")}
              </button>
            </form>
          ) : (
            <button type="button" data-testid="beda-enter-code" onClick={() => setEntering(true)}>
              {tLobby("game.spaEnter")}
            </button>
          )}
          {roomError ? <p role="alert">{tLobby("game.spaCodeBad")}</p> : null}
          {createProblem ? <SpaProblemLine notice={createProblem} /> : null}
        </div>
        {hallFull && nextHall != null ? (
          <div className="beda-switch" data-testid="beda-hall-switch">
            <span>{tLobby("game.hallFullAsk", { lobby: hall })}</span>
            <button type="button" onClick={() => onSwitchHall(nextHall)}>
              {tLobby("game.hallNext", { lobby: nextHall })}
            </button>
          </div>
        ) : hallFull ? (
          <div className="beda-switch" data-testid="beda-hall-switch">
            {tLobby("game.hallsFull")}
          </div>
        ) : null}
        {editing ? (
          <form
            className="beda-nick beda-card"
            data-testid="beda-nickname"
            onSubmit={(event) => {
              event.preventDefault();
              const ok = onNickname(draft);
              if (ok) setEditing(false);
            }}
          >
            <label htmlFor="beda-nick-input">{tLobby("game.nickname")}</label>
            <input
              id="beda-nick-input"
              value={draft}
              maxLength={24}
              autoComplete="off"
              onChange={(event) => setDraft(event.target.value)}
            />
            {nicknameError ? (
              <p role="alert">{tLobby("game.nicknameRejected")}</p>
            ) : null}
            <button type="submit">{tLobby("game.nicknameSave")}</button>
          </form>
        ) : null}
        <div className="beda-mini" aria-hidden>
          <div className="beda-mini-oval" />
          {placed.map((actor) => (
            <i
              key={actor.id}
              className="beda-mini-dot"
              style={{ left: `${actor.x * 100}%`, top: `${28 + lobbyWalkY(actor.y) * 55}%` }}
            />
          ))}
          <img
            src="/mascot/icons/minimap_pin.svg"
            alt=""
            className="beda-mini-pin"
            decoding="async"
            style={{ left: `${you.x * 100}%`, top: `${28 + lobbyWalkY(you.y) * 55}%` }}
          />
          <div className="beda-mini-view" />
        </div>
        {showHint && !editing ? <div className="beda-drag-hint">{dragLabel}</div> : null}
      </div>
    </div>
  );
}

function FriendButton({
  actor,
  locale,
  selected,
  nudge,
  onSelect,
  onAction,
  onHide,
}: {
  actor: LobbyActor;
  locale: string;
  selected: boolean;
  nudge: number;
  onSelect: (id: string) => void;
  onAction: (kind: "wave" | "heart" | "outfit") => void;
  onHide: (id: string) => void;
}) {
  const t = useTranslations("mascot");
  const sample = SAMPLE_LOBBY_FRIENDS.find((friend) => friend.id === actor.id);
  const view = actor.sample && sample ? sampleFriendView(sample) : lobbyNeutralView();
  const pose: GamePose | null = actor.pose;
  const dress = gameDress(actor.look, pose);
  return (
    <div
      className={selected ? "beda-friend is-selected" : "beda-friend"}
      data-sample={actor.sample ? "true" : "false"}
      data-friend-id={actor.id}
      data-testid={`beda-friend-${actor.id}`}
      style={{
        left: `${actor.x * 100}%`,
        top: `${lobbyWalkY(actor.y) * 100}%`,
        width: `calc(var(--beda-friend, 110px) * ${0.78 + actor.y * 0.4})`,
        zIndex: lobbyStackZ(actor.y),
        transform: "translate(-50%, -100%)",
      }}
    >
      {selected ? (
        <div className="beda-actions beda-card" data-testid="beda-actions" role="group" aria-label={actor.nickname}>
          <p className="beda-card-name">{actor.nickname}</p>
          <button
            type="button"
            className="beda-hide"
            data-testid="beda-hide-friend"
            onClick={() => onHide(actor.id)}
          >
            {t("game.hideFriend")}
          </button>
          <p className="beda-hide-note">{t("game.hideFriendNote")}</p>
          <div className="beda-action-row">
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
        </div>
      ) : null}
      <button type="button" className="beda-friend-hit" onClick={() => onSelect(actor.id)}>
        <span
          className="beda-friend-art"
          style={actor.facing === "left" ? { transform: "scaleX(-1)" } : undefined}
        >
          <span className="beda-ring" />
          <BeDaFigure view={view} locale={locale} dress={dress} imageLoading="lazy" crowd className="w-full" />
        </span>
        <span className="beda-tag" style={{ transform: `translateX(${nudge}px)` }}>
          {actor.nickname}
        </span>
      </button>
    </div>
  );
}
