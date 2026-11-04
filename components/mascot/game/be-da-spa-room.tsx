"use client";

import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { useTranslations } from "next-intl";

import { BeDaFigure } from "@/components/mascot/be-da-figure";
import { useSpaMotion } from "@/components/mascot/game/use-lobby-motion";
import { GameIcon } from "@/components/mascot/game/icons";
import { gameDress, type GameLook, type GamePose } from "@/lib/mascot/game/look";
import { lobbyNeutralView, sampleFriendView, SAMPLE_LOBBY_FRIENDS } from "@/lib/mascot/game/lobby";
import {
  SPA_ROOM_CAP,
  SPA_SEATS,
  SPA_YOU,
  rankCareStreaks,
  roomInviteUrl,
  spaFootScale,
  topCareStreak,
  type SpaBoardRow,
  zaloShareUrl,
  type SpaGuest,
  type SpaNotice,
} from "@/lib/mascot/game/spa-room";
import type { BeDaView } from "@/lib/mascot/model";

export type SpaRoomState = {
  code: string;
  count: number;
  cap: number;
  guests: readonly SpaGuest[];
  notice: SpaNotice;
  /** My last server position, when the room has sent one. */
  you?: { x: number; y: number } | null;
  youStreak?: number;
};

export function SpaProblemLine({ notice }: { notice: SpaNotice }) {
  const t = useTranslations("mascot");
  const text =
    notice === "full"
      ? t("game.spaFull")
      : notice === "missing"
        ? t("game.spaMissing")
        : notice === "bad-code"
          ? t("game.spaCodeBad")
          : notice === "name"
            ? t("game.nicknameRejected")
            : notice === "rate"
              ? t("game.spaRate")
              : notice === "too-many"
                ? t("game.spaTooMany")
                : notice === "member"
                  ? t("game.spaMember")
                  : notice === "offline"
                    ? t("game.spaOffline")
                    : null;
  if (!text) return null;
  return (
    <p role="alert" data-testid="beda-room-problem">
      {text}
    </p>
  );
}

export function BeDaSpaRoom({
  locale,
  player,
  look,
  soundOn,
  selectedId,
  youPose,
  room,
  onSelect,
  onAction,
  onHide,
  onLeave,
  onLobby,
  onToggleSound,
  onWalk,
  onLoadBoard,
}: {
  locale: string;
  player: BeDaView;
  look: GameLook;
  soundOn: boolean;
  selectedId: string;
  youPose: GamePose | null;
  room: SpaRoomState;
  onSelect: (id: string) => void;
  onAction: (kind: "wave" | "heart" | "outfit") => void;
  onHide: (id: string) => void;
  onLeave: () => void;
  onLobby: () => void;
  onToggleSound: () => void;
  onWalk?: (x: number, y: number, pace?: "walk" | "idle") => void;
  onLoadBoard?: () => Promise<readonly SpaBoardRow[]>;
}) {
  const t = useTranslations("mascot");
  const [copied, setCopied] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);
  const [boardRows, setBoardRows] = useState<readonly SpaBoardRow[]>([]);
  const frameRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const placed = room.guests.filter(
    (guest): guest is SpaGuest & { x: number; y: number } => guest.x != null && guest.y != null,
  );
  const motion = useSpaMotion({
    frameRef,
    viewRef,
    stageRef,
    guests: placed.map((guest) => ({ id: guest.id, x: guest.x, y: guest.y, facing: guest.facing })),
    you: room.you ?? null,
    onWalk,
  });
  const cap = room.cap || SPA_ROOM_CAP;
  const count = Math.min(cap, Math.max(0, room.count));
  const left = Math.max(0, cap - count);
  const showYou = room.notice !== "full";
  const youStreak = room.youStreak ?? 0;
  const topStreak = topCareStreak([youStreak, ...room.guests.map((guest) => guest.careStreak)]);
  const crowned = (streak: number | undefined) => topStreak > 0 && (streak ?? 0) === topStreak;
  const takenSeats = new Set(room.guests.map((guest) => guest.seat).filter((seat) => seat != null));
  const notice =
    room.notice === "full"
      ? t("game.spaFull")
      : room.notice === "missing"
        ? t("game.spaMissing")
        : room.notice === "bad-code"
          ? t("game.spaCodeBad")
          : room.notice === "name"
            ? t("game.nicknameRejected")
            : room.notice === "rate"
              ? t("game.spaRate")
              : room.notice === "too-many"
                ? t("game.spaTooMany")
                : room.notice === "member"
                  ? t("game.spaMember")
                  : room.notice === "offline"
                    ? t("game.spaOffline")
                    : null;

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(id);
  }, [copied]);

  function onBackground(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, .beda-actions, .beda-spa-invite")) return;
    onSelect("");
  }

  async function openBoard() {
    setBoardOpen(true);
    if (onLoadBoard) {
      try {
        setBoardRows(await onLoadBoard());
        return;
      } catch {
        /* Fall back to whoever is already in the room. */
      }
    }
    setBoardRows(
      rankCareStreaks([
        { nickname: t("game.you"), careStreak: youStreak },
        ...room.guests.map((guest) => ({ nickname: guest.nickname, careStreak: guest.careStreak ?? 0 })),
      ]),
    );
  }

  async function onCopy() {
    if (room.code.length !== 6) return;
    const ok = await copyText(room.code);
    if (ok) setCopied(true);
  }

  return (
    <div ref={frameRef} className="beda-spa" data-testid="beda-spa" onClick={onBackground}>
      <div ref={viewRef} className="beda-spa-view">
      <div className="beda-spa-wall" />
      <div className="beda-spa-stripes" />
      <div className="beda-spa-wood" />
      <div className="beda-spa-planks" />
      <div className="beda-spa-glow" aria-hidden />
      <div className="beda-spa-lamp" aria-hidden>
        <i />
        <b />
      </div>
      <div className="beda-spa-shelf" aria-hidden>
        <i className="beda-spa-jar" style={{ background: "#8fd9cf" }} />
        <i className="beda-spa-jar is-short" style={{ background: "#f7b7c9" }} />
        <i className="beda-spa-jar" style={{ background: "#fff1c9" }} />
        <i className="beda-spa-jar is-tall" style={{ background: "#f3c4ae" }} />
      </div>
      <div className="beda-spa-candles" aria-hidden>
        <i />
        <i />
      </div>
      <Plant className="is-left" />
      <Plant className="is-right" />

      <div className="beda-spa-stage">
        <div className="beda-spa-mat" aria-hidden>
          <i className="beda-spa-cucumber" />
        </div>
        {SPA_SEATS.map((seat) =>
          takenSeats.has(seat.id) ? null : (
            <i
              key={seat.id}
              className={seat.id === "back" ? "beda-spa-open is-far" : "beda-spa-open"}
              data-testid={`beda-spa-open-${seat.id}`}
              style={{ left: `${seat.x}%`, top: `${seat.y}%` }}
            />
          ),
        )}
        {room.guests.map((guest) => {
          const x = guest.x;
          const y = guest.y;
          if (x != null && y != null) return null;
          const seat = SPA_SEATS.find((item) => item.id === guest.seat) ?? null;
          return (
            <SpaPerson
              key={guest.id}
              guest={guest}
              locale={locale}
              selected={guest.id === selectedId}
              seatX={seat?.x ?? 50}
              seatY={seat?.y ?? 70}
              scale={seat?.scale ?? 1}
              standing={false}
              crown={crowned(guest.careStreak)}
              onSelect={onSelect}
              onAction={onAction}
              onHide={onHide}
            />
          );
        })}
      </div>
      <div ref={stageRef} className="beda-spa-floor" data-testid="beda-spa-floor">
        {room.guests.map((guest) => {
          const x = guest.x;
          const y = guest.y;
          if (x == null || y == null) return null;
          return (
            <SpaPerson
              key={guest.id}
              guest={guest}
              locale={locale}
              selected={guest.id === selectedId}
              seatX={x * 100}
              seatY={y * 100}
              scale={spaFootScale(y)}
              standing
              crown={crowned(guest.careStreak)}
              onSelect={onSelect}
              onAction={onAction}
              onHide={onHide}
            />
          );
        })}
        {showYou ? (
          <div
            className="beda-spa-person is-you beda-pose"
            data-spa-you=""
            data-testid="beda-spa-you"
            style={{ zIndex: 40, ["--scale" as string]: String(SPA_YOU.scale) }}
          >
            <span className="beda-spa-art">
              <Cheeks />
              <BeDaFigure view={player} locale={locale} dress={gameDress(look, youPose)} crowd className="w-full" />
            </span>
            <span className="beda-name">
              <span className="beda-tag beda-tag-me">
                {crowned(youStreak) ? <span aria-hidden>👑 </span> : null}
                <Star /> {t("game.you")}
              </span>
              <StreakFlame streak={youStreak} label={t("game.spaStreak", { count: youStreak })} />
            </span>
          </div>
        ) : null}
      </div>
      </div>

      <div className="beda-zoom" data-testid="beda-zoom">
        <button type="button" aria-label={t("game.zoomIn")} onClick={() => motion.current.zoomBy(1.2)}>
          +
        </button>
        <button type="button" aria-label={t("game.zoomOut")} onClick={() => motion.current.zoomBy(1 / 1.2)}>
          −
        </button>
        <button type="button" data-testid="beda-recenter" onClick={() => motion.current.recenter()}>
          {t("game.backToMe")}
        </button>
      </div>

      <button type="button" className="beda-spa-board" data-testid="beda-streak-board" onClick={() => void openBoard()}>
        {t("game.spaBoard")}
      </button>

      <header className="beda-spa-head">
        <button type="button" className="beda-spa-iconbtn" data-testid="beda-spa-leave" aria-label={t("game.spaLeave")} onClick={onLeave}>
          <LeaveArrow />
        </button>
        <div className="beda-spa-title" data-testid="beda-spa-title">
          <House />
          {t("game.spaTitle", { count, cap })}
        </div>
        <button
          type="button"
          className="beda-spa-iconbtn"
          data-testid="beda-mute"
          aria-pressed={soundOn}
          aria-label={soundOn ? t("game.soundOn") : t("game.soundOff")}
          onClick={onToggleSound}
        >
          <GameIcon name={soundOn ? "soundOn" : "soundOff"} className="beda-ico-sm" />
        </button>
        <div className="beda-spa-seatbar" data-testid="beda-spa-seats">
          <span>{left === 0 ? t("game.spaSeatsFull", { cap }) : t("game.spaSeats", { cap, left })}</span>
          <span className="beda-spa-dots" aria-hidden>
            {Array.from({ length: cap }, (_, index) => (
              <i key={index} className={index < count ? "beda-spa-dot is-on" : "beda-spa-dot"} />
            ))}
          </span>
        </div>
      </header>

      <button type="button" className="beda-spa-lobby" data-testid="beda-spa-lobby" onClick={onLobby}>
        <PersonMark />
        {t("game.spaToLobby")}
      </button>

      <section className="beda-spa-invite" data-testid="beda-spa-invite" aria-label={t("game.spaInvite")}>
        <h2>{t("game.spaInvite")}</h2>
        <div className="beda-spa-code" data-testid="beda-spa-code">
          {Array.from({ length: 6 }, (_, index) => (
            <b key={index}>{room.code[index] ?? ""}</b>
          ))}
        </div>
        {notice ? (
          <p className="beda-spa-notice" role="status">
            {notice}
          </p>
        ) : null}
        {copied ? (
          <p className="beda-spa-copied" role="status">
            {t("game.spaCopied")}
          </p>
        ) : null}
        <div className="beda-spa-share">
          <button type="button" className="beda-spa-copy" data-testid="beda-spa-copy" onClick={() => void onCopy()}>
            <Clipboard />
            {t("game.spaCopy")}
          </button>
          {room.code.length === 6 ? (
            <a
              className="beda-spa-zalo"
              data-testid="beda-spa-zalo"
              href={zaloShareUrl(roomInviteUrl(room.code))}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ShareArrow />
              {t("game.spaZalo")}
            </a>
          ) : (
            <span className="beda-spa-zalo is-off">{t("game.spaZalo")}</span>
          )}
        </div>
      </section>
      {boardOpen ? (
        <div className="beda-board-sheet" role="dialog" aria-modal="true" aria-label={t("game.spaBoard")} data-testid="beda-streak-sheet">
          <button type="button" className="beda-board-back" aria-label={t("game.spaBoardClose")} onClick={() => setBoardOpen(false)} />
          <div className="beda-board-card">
            <div className="beda-board-head">
              <h2>{t("game.spaBoard")}</h2>
              <button type="button" onClick={() => setBoardOpen(false)}>
                {t("game.spaBoardClose")}
              </button>
            </div>
            {boardRows.length === 0 ? (
              <p className="beda-board-empty">{t("game.spaBoardEmpty")}</p>
            ) : (
              <ol>
                {boardRows.map((row, index) => (
                  <li key={`${row.nickname}-${index}`}>
                    <span>
                      {topCareStreak(boardRows.map((item) => item.careStreak)) === row.careStreak && row.careStreak > 0
                        ? "👑 "
                        : null}
                      {row.nickname}
                    </span>
                    {row.careStreak > 0 ? <b>🔥{row.careStreak}</b> : null}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SpaPerson({
  guest,
  locale,
  selected,
  seatX,
  seatY,
  scale,
  standing,
  crown,
  onSelect,
  onAction,
  onHide,
}: {
  guest: SpaGuest;
  locale: string;
  selected: boolean;
  seatX: number;
  seatY: number;
  scale: number;
  standing: boolean;
  crown: boolean;
  onSelect: (id: string) => void;
  onAction: (kind: "wave" | "heart" | "outfit") => void;
  onHide: (id: string) => void;
}) {
  const t = useTranslations("mascot");
  const sample = guest.sample ? SAMPLE_LOBBY_FRIENDS.find((friend) => friend.id === guest.id) : undefined;
  const view = sample ? sampleFriendView(sample) : lobbyNeutralView();
  const dress = gameDress({ outfit: guest.outfit, hair: guest.hair, clip: guest.clip }, guest.pose);
  return (
    <div
      className={
        standing
          ? selected
            ? "beda-spa-person beda-pose is-selected"
            : "beda-spa-person beda-pose"
          : selected
            ? "beda-spa-person is-selected"
            : "beda-spa-person"
      }
      data-sample={guest.sample ? "true" : "false"}
      data-friend-id={guest.id}
      data-testid={`beda-spa-guest-${guest.id}`}
      style={
        standing
          ? { ["--scale" as string]: String(scale) }
          : {
              left: `${seatX}%`,
              top: `${seatY}%`,
              zIndex: 10 + Math.round(seatY),
              ["--scale" as string]: String(scale),
            }
      }
    >
      {selected ? (
        <div className="beda-actions beda-card" data-testid="beda-actions" role="group" aria-label={guest.nickname}>
          <p className="beda-card-name">{guest.nickname}</p>
          <button type="button" className="beda-hide" data-testid="beda-hide-friend" onClick={() => onHide(guest.id)}>
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
      <button type="button" className="beda-spa-hit" onClick={() => onSelect(guest.id)}>
        <span className="beda-spa-art">
          <Cheeks />
          <BeDaFigure view={view} locale={locale} dress={dress} imageLoading="lazy" crowd className="w-full" />
        </span>
        <span className="beda-name">
          <span className="beda-tag">
            {crown ? <span aria-hidden>👑 </span> : null}
            {guest.nickname}
          </span>
          <StreakFlame streak={guest.careStreak ?? 0} label={t("game.spaStreak", { count: guest.careStreak ?? 0 })} />
        </span>
      </button>
    </div>
  );
}

function StreakFlame({ streak, label }: { streak: number; label: string }) {
  if (streak <= 0) return null;
  return (
    <span className="beda-fire" data-testid="beda-streak" aria-label={label}>
      🔥{streak}
    </span>
  );
}

function Cheeks() {
  return (
    <span className="beda-cheeks" aria-hidden>
      <i className="beda-cuke is-left" />
      <i className="beda-cuke is-right" />
    </span>
  );
}

function Plant({ className }: { className: string }) {
  return (
    <div className={`beda-spa-plant ${className}`} aria-hidden>
      <i />
      <i />
      <i />
      <b />
    </div>
  );
}

function House() {
  return (
    <svg className="beda-spa-house" viewBox="0 0 32 32" aria-hidden>
      <path d="M6 15 16 7l10 8v10a2 2 0 0 1-2 2h-5v-7h-6v7H8a2 2 0 0 1-2-2Z" fill="#fff" />
    </svg>
  );
}

function Star() {
  return (
    <svg className="beda-spa-star" viewBox="0 0 32 32" aria-hidden>
      <path d="m16 4 3.2 7.4 8 .8-6 5.2 1.8 7.8L16 21.2 9 25.2 10.8 17.4 4.8 12.2l8-.8Z" fill="#ffd15c" />
    </svg>
  );
}

function LeaveArrow() {
  return (
    <svg className="beda-ico-sm" viewBox="0 0 32 32" aria-hidden>
      <path d="M16 8a8 8 0 1 0 6.8 3.8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M16 4.5V9h4.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PersonMark() {
  return (
    <svg className="beda-spa-personmark" viewBox="0 0 32 32" aria-hidden>
      <circle cx="16" cy="11" r="5" fill="#2f9e96" />
      <path d="M7 26c1.4-5 4.6-7.5 9-7.5S23.6 21 25 26" fill="#2f9e96" />
    </svg>
  );
}

function Clipboard() {
  return (
    <svg className="beda-ico-sm" viewBox="0 0 32 32" aria-hidden>
      <rect x="8" y="7" width="16" height="20" rx="3" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path d="M12 7.5h8v3H12z" fill="currentColor" />
      <path d="M12 16h8M12 20h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ShareArrow() {
  return (
    <svg className="beda-ico-sm" viewBox="0 0 32 32" aria-hidden>
      <path d="M8 16h12M16 10l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      const input = document.createElement("textarea");
      input.value = value;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.left = "-999px";
      document.body.appendChild(input);
      input.select();
      const ok = document.execCommand("copy");
      input.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
