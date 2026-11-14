"use client";

import { useRef, useState } from "react";
import type { MouseEvent } from "react";
import { useTranslations } from "next-intl";

import { BeDaFigure } from "@/components/mascot/be-da-figure";
import { BeDaActorLayer } from "@/components/mascot/game/be-da-actor-layer";
import { useSpaMotion } from "@/components/mascot/game/use-lobby-motion";
import { GameIcon } from "@/components/mascot/game/icons";
import { gameDress, type GameLook, type GamePose } from "@/lib/mascot/game/look";
import { lookArt } from "@/lib/game/core/art";
import { lobbyNeutralView, sampleFriendView, SAMPLE_LOBBY_FRIENDS } from "@/lib/mascot/game/lobby";
import {
  SPA_CODE_ALPHABET,
  SPA_ROOM_CAP,
  SPA_ROOM_CODE_LENGTH,
  SPA_ROOM_LIFE_DAYS,
  SPA_SEATS,
  SPA_YOU,
  formatRoomEndDate,
  normalizeRoomCode,
  rankCareStreaks,
  roomInviteUrl,
  roomShareChoice,
  spaFootScale,
  topCareStreak,
  zaloShareUrl,
  type RoomClock,
  type SpaBoardRow,
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
  /** Friendly name. The header uses «Phòng bạn bè» when this is empty or just the code. */
  name?: string;
  /** Days still left in the 8-day room. Null when the end is unknown. */
  daysLeft?: number | null;
  /** Set when create/join answered 409 already_in_room for a different room. */
  lock?: RoomClock | null;
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
                : notice === "already-in" || notice === "ended"
                  ? null
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
  onToggleSound,
  onWalk,
  onLoadBoard,
  inviteInitiallyOpen = false,
  onGoToRoom,
  onCreateRoom,
  creatingRoom = false,
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
  inviteInitiallyOpen?: boolean;
  onGoToRoom?: (code: string) => void;
  onCreateRoom?: () => void;
  creatingRoom?: boolean;
}) {
  const t = useTranslations("mascot");
  const [inviteOpen, setInviteOpen] = useState(inviteInitiallyOpen);
  const [endedJoin, setEndedJoin] = useState(false);
  const [endedDraft, setEndedDraft] = useState("");
  const [endedCodeBad, setEndedCodeBad] = useState(false);
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
                : room.notice === "already-in" || room.notice === "ended"
                  ? null
                : room.notice === "member"
                  ? t("game.spaMember")
                  : room.notice === "offline"
                    ? t("game.spaOffline")
                    : null;

  function onBackground(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, .beda-actions, .beda-invite-card, .beda-spa-head, .beda-room-lock")) return;
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
    if (ok) setInviteOpen(false);
  }

  function onZaloShare(event: MouseEvent<HTMLAnchorElement>) {
    const invite = roomInviteUrl(room.code);
    const popup = window.open(zaloShareUrl(invite), "_blank", "noopener,noreferrer");
    const choice = roomShareChoice(popup != null, typeof navigator.share === "function");
    if (choice === "zalo") {
      event.preventDefault();
      return;
    }
    if (choice === "web-share") {
      event.preventDefault();
      void navigator.share({ url: invite, title: t("game.spaInvite") }).catch(() => undefined);
    }
  }

  const roomTitle = room.name && room.name !== room.code ? room.name : t("game.spaRoomName");
  const memberLine = t("game.spaMembers", { count, cap });
  const dayLine =
    room.daysLeft == null ? "" : t("game.spaDaysLeft", { left: room.daysLeft, total: SPA_ROOM_LIFE_DAYS });
  const roomMeta = dayLine ? `${memberLine} · ${dayLine}` : memberLine;
  const lock = room.lock ?? null;
  const lockName = lock ? lock.name || lock.code : "";
  const lockDate = lock?.endsAt ? formatRoomEndDate(new Date(lock.endsAt), locale) : "";

  const selectedGuest = room.guests.find((guest) => guest.id === selectedId) ?? null;

  return (
    <div ref={frameRef} className="beda-spa" data-testid="beda-spa" onClick={onBackground}>
      {selectedGuest ? (
        <div className="beda-actions beda-card beda-friend-card" data-testid="beda-actions" role="group" aria-label={selectedGuest.nickname}>
          <p className="beda-card-name">{selectedGuest.nickname}</p>
          <button type="button" className="beda-hide" data-testid="beda-hide-friend" onClick={() => onHide(selectedGuest.id)}>
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
      <div ref={viewRef} className="beda-spa-view">
        <BeDaActorLayer />
      <div className="beda-spa-stage">
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
            />
          );
        })}
        {showYou ? (
          <div
            className="beda-spa-person is-you beda-pose"
            data-spa-you="you"
            data-actor=""
            data-outfit={look.outfit}
            data-hair={look.hair}
            data-pose={youPose ?? ""}
            data-art={lookArt(player, look, true).join(" ")}
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
        <button type="button" className="beda-spa-back" data-testid="beda-spa-leave" aria-label={t("game.spaLeave")} onClick={onLeave}>
          <LeaveArrow />
        </button>
        <div className="beda-spa-titlecard" data-testid="beda-spa-title">
          <strong>{roomTitle}</strong>
          <span>{roomMeta}</span>
        </div>
        {lock || room.notice === "ended" ? null : (
          <button type="button" className="beda-invite-open" data-testid="beda-invite-open" onClick={() => setInviteOpen(true)}>
            {t("game.spaInviteOpen")}
          </button>
        )}
      </header>

      <button
        type="button"
        className="beda-spa-iconbtn beda-spa-mute"
        data-testid="beda-mute"
        aria-pressed={soundOn}
        aria-label={soundOn ? t("game.soundOn") : t("game.soundOff")}
        onClick={onToggleSound}
      >
        <GameIcon name={soundOn ? "soundOn" : "soundOff"} className="beda-ico-sm" />
      </button>

      {notice ? (
        <p className="beda-spa-status" role="status">
          {notice}
        </p>
      ) : null}

      {room.notice === "ended" && !lock ? (
        <div className="beda-room-lock beda-room-ended" data-testid="beda-room-ended" role="dialog" aria-modal="true">
          <p>{t("game.spaEnded")}</p>
          <button
            type="button"
            data-testid="beda-ended-create"
            disabled={creatingRoom}
            onClick={() => onCreateRoom?.()}
          >
            {t("game.spaCreate")}
          </button>
          {endedJoin ? (
            <form
              data-testid="beda-ended-code-form"
              onSubmit={(event) => {
                event.preventDefault();
                const next = normalizeRoomCode(endedDraft);
                if (!next) {
                  setEndedCodeBad(true);
                  return;
                }
                setEndedCodeBad(false);
                onGoToRoom?.(next);
              }}
            >
              <input
                data-testid="beda-ended-code"
                aria-label={t("game.spaCodeLabel")}
                value={endedDraft}
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
                  setEndedDraft(next);
                  setEndedCodeBad(false);
                }}
              />
              <button type="submit" data-testid="beda-ended-join-submit">
                {t("game.spaJoin")}
              </button>
            </form>
          ) : (
            <button type="button" className="is-join" data-testid="beda-ended-join" onClick={() => setEndedJoin(true)}>
              {t("game.spaEnter")}
            </button>
          )}
          {endedCodeBad ? <p className="beda-ended-bad">{t("game.spaCodeBad")}</p> : null}
        </div>
      ) : null}

      {lock ? (
        <div className="beda-room-lock" data-testid="beda-room-lock" role="dialog" aria-modal="true">
          <p>
            {lockDate
              ? t("game.spaOneRoom", { name: lockName, date: lockDate })
              : t("game.spaOneRoomNoDate", { name: lockName })}
          </p>
          <button type="button" data-testid="beda-current-room" onClick={() => onGoToRoom?.(lock.code)}>
            {t("game.spaGoRoom")}
          </button>
        </div>
      ) : null}

      {inviteOpen && !lock && room.notice !== "ended" ? (
        <>
          <button
            type="button"
            className="beda-invite-back"
            data-testid="beda-invite-back"
            aria-label={t("game.spaBoardClose")}
            onClick={() => setInviteOpen(false)}
          />
          <section className="beda-invite-card" data-testid="beda-invite-card" role="dialog" aria-modal="true" aria-label={t("game.spaInvite")}>
            <h2>{t("game.spaInvite")}</h2>
            <div className="beda-spa-code" data-testid="beda-spa-code">
              {Array.from({ length: 6 }, (_, index) => (
                <b key={index}>{room.code[index] ?? ""}</b>
              ))}
            </div>
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
                  onClick={onZaloShare}
                >
                  <ShareArrow />
                  {t("game.spaZalo")}
                </a>
              ) : (
                <span className="beda-spa-zalo is-off">{t("game.spaZalo")}</span>
              )}
            </div>
          </section>
        </>
      ) : null}
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
      data-actor=""
      data-outfit={guest.outfit}
      data-hair={guest.hair}
      data-pose={guest.pose ?? ""}
      data-art={lookArt(view, { outfit: guest.outfit, hair: guest.hair, clip: guest.clip }, true).join(" ")}
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
      <path d="M19 7 10 16l9 9" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
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
