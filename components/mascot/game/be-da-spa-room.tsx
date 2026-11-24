"use client";

import { useRef, useState } from "react";
import type { MouseEvent } from "react";
import { useTranslations } from "next-intl";

import { bubbleColour, bubbleFrameStyle } from "@/lib/mascot/game/bubble-colour";
import { BeDaFigure } from "@/components/mascot/be-da-figure";
import { BeDaActorLayer } from "@/components/mascot/game/be-da-actor-layer";
import { StreakBoard } from "@/components/mascot/game/be-da-streak-board";
import { RoomQuestCard, RoomTodayList, RoomTogetherDock } from "@/components/mascot/game/be-da-room-shared";
import { RoomTreeDock, RoomTreePlant, RoomTreeProvider } from "@/components/mascot/game/be-da-room-tree";
import type { RoomTreePanel } from "@/components/mascot/game/use-room-tree";
import { useSpaMotion } from "@/components/mascot/game/use-lobby-motion";
import { GameIcon } from "@/components/mascot/game/icons";
import type { RoomTogether } from "@/components/mascot/game/use-room-shared";
import { gameDress, type GameLook, type GamePose } from "@/lib/mascot/game/look";
import { lookArt, playerActorArt } from "@/lib/game/core/art";
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
  shouldCopyInviteLink,
  spaRoomOnlineCount,
  spaFootScale,
  spaStackZ,
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
  /** My last server position, when the room has sent one. `foot` is the landscape plate fraction. */
  you?: { x: number; y: number; foot?: number } | null;
  /** Wide viewport uses the 1600×1000 plate and its foot slots. */
  landscape?: boolean;
  youStreak?: number;
  /** My room nickname, used to mark the «Mày» row. Empty in the sample room. */
  youNickname?: string;
  /** Friendly name. The header uses «Phòng bạn bè» when this is empty or just the code. */
  name?: string;
  /** Days still left in the 8-day room. Null when the end is unknown. */
  daysLeft?: number | null;
  /** Set when create/join answered 409 already_in_room for a different room. */
  lock?: RoomClock | null;
  /** Live presence. Null until the socket says how many people are here. Hidden at 0. */
  onlineCount?: number | null;
  /** Real room codes wait here instead of showing the sample cast. */
  entry?: "loading" | "room" | "error";
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
  together = null,
  tree = null,
  treeDetailOpen = false,
  boardInitiallyOpen = false,
  previewBoard = null,
  panel: panelProp,
  onPanel,
  showActors = true,
  onRetry,
  onQuit,
  onOpenSeedBag,
}: {
  locale: string;
  player: BeDaView;
  look: GameLook;
  soundOn: boolean;
  selectedId: string;
  youPose: GamePose | null;
  room: SpaRoomState;
  onSelect: (id: string) => void;
  onAction: (kind: "wave" | "heart" | "outfit" | "cheer" | "poke") => void;
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
  /** Quest, Hôm nay, and nudges. Hidden when the mascot gate answers 404. */
  together?: RoomTogether | null;
  /** Shared tree. Hidden when the mascot gate answers 404. */
  tree?: RoomTreePanel | null;
  /** Open the 7-stage sheet on first paint. Screenshots use this. */
  treeDetailOpen?: boolean;
  /** Open the streak board on first paint. Screenshots use this. */
  boardInitiallyOpen?: boolean;
  /** Skip the board request. Screenshots pass the rows they want to show. */
  previewBoard?: readonly SpaBoardRow[] | null;
  /** Which shared panel is open. Omit to let the room remember the tap. */
  panel?: "quest" | "today" | null;
  onPanel?: (panel: "quest" | "today" | null) => void;
  /** Pixi sprites. Screenshots of the drawn gesture pass false so the SVG stays. */
  showActors?: boolean;
  onRetry?: () => void;
  /** Confirmed «Rời phòng». This is the only action that deletes membership. */
  onQuit?: () => void;
  onOpenSeedBag?: () => void;
}) {
  const t = useTranslations("mascot");
  const [inviteCopied, setInviteCopied] = useState(false);
  const inviteToastTimer = useRef(0);
  // Sharing happens on the button. The old sheet flag no longer opens a card.
  void inviteInitiallyOpen;
  const [localPanel, setLocalPanel] = useState<"quest" | "today" | null>(null);
  const panel = panelProp !== undefined ? panelProp : localPanel;
  const roomEnded = room.notice === "ended" || room.daysLeft === 0;
  function choosePanel(next: "quest" | "today" | null) {
    onPanel?.(next);
    if (panelProp === undefined) setLocalPanel(next);
  }
  const [endedJoin, setEndedJoin] = useState(false);
  const [endedDraft, setEndedDraft] = useState("");
  const [endedCodeBad, setEndedCodeBad] = useState(false);
  const [boardOpen, setBoardOpen] = useState(boardInitiallyOpen);
  const [boardRows, setBoardRows] = useState<readonly SpaBoardRow[]>(previewBoard ?? []);
  const [quitAsk, setQuitAsk] = useState(false);
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
    enabled: room.entry !== "loading" && room.entry !== "error",
    landscape: room.landscape === true,
  });
  const cap = room.cap || SPA_ROOM_CAP;
  const count = Math.min(cap, Math.max(0, room.count));
  const showYou = room.notice !== "full";
  const youStreak = room.youStreak ?? 0;
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
    if (target.closest("button, a, input, .beda-actions, .beda-invite-card, .beda-spa-head, .beda-room-lock, .beda-room-sheet, .beda-room-bar, .beda-room-dock, .beda-tree-spot, .beda-tree-chip, .beda-tree-card, .beda-tree-shade")) return;
    onSelect("");
  }

  async function openBoard() {
    setBoardOpen(true);
    if (previewBoard) {
      setBoardRows(previewBoard);
      return;
    }
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
        { nickname: room.youNickname || t("game.you"), careStreak: youStreak },
        ...room.guests
          .filter((guest) => !guest.sample)
          .map((guest) => ({ nickname: guest.nickname, careStreak: guest.careStreak ?? 0 })),
      ]),
    );
  }

  function showInviteCopied() {
    setInviteCopied(true);
    window.clearTimeout(inviteToastTimer.current);
    inviteToastTimer.current = window.setTimeout(() => setInviteCopied(false), 2400);
  }

  async function onInvite() {
    if (room.code.length !== 6) return;
    const invite = roomInviteUrl(room.code);
    let shared = false;
    let errorName: string | null = null;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ url: invite, title: t("game.spaRoomName") });
        shared = true;
      } catch (err) {
        errorName = err instanceof DOMException ? err.name : "failed";
      }
    }
    if (!shouldCopyInviteLink(shared, errorName)) return;
    const ok = await copyText(invite);
    if (ok) showInviteCopied();
  }

  const roomTitle = room.name && room.name !== room.code ? room.name : t("game.spaRoomName");
  const memberLine = t("game.spaMembers", { count, cap });
  const online = spaRoomOnlineCount(room.onlineCount);
  const onlineLine = online == null ? "" : t("game.spaOnline", { count: online });
  const dayLine =
    room.daysLeft == null ? "" : t("game.spaDaysLeft", { left: room.daysLeft, total: SPA_ROOM_LIFE_DAYS });
  const lock = room.lock ?? null;
  const lockName = lock ? lock.name || lock.code : "";
  const lockDate = lock?.endsAt ? formatRoomEndDate(new Date(lock.endsAt), locale) : "";

  const selectedGuest = room.guests.find((guest) => guest.id === selectedId) ?? null;
  if (room.entry === "loading" || room.entry === "error") {
    return (
      <div className="beda-spa" data-testid="beda-spa">
        <div className="beda-room-entry">
          {room.entry === "loading" ? (
            <p data-testid="beda-room-loading">{t("game.spaEntering")}</p>
          ) : (
            <>
              <p data-testid="beda-room-error">{room.notice === "rate" ? t("game.spaRate") : t("game.spaEnterFailed")}</p>
              <button type="button" className="beda-room-retry" data-testid="beda-room-retry" onClick={onRetry}>
                {t("game.spaRetry")}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <RoomTreeProvider panel={tree ?? null} locale={locale} startOpen={treeDetailOpen} roomCode={room.code} daysLeft={room.daysLeft ?? null} onOpenBag={onOpenSeedBag}>
    <div ref={frameRef} className={room.landscape ? "beda-spa is-landscape" : "beda-spa"} data-testid="beda-spa" onClick={onBackground}>
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
          <div className="beda-action-row is-gesture">
            <button type="button" className="beda-action is-cheer" data-testid="beda-cheer" onClick={() => onAction("cheer")}>
              {t("game.cheer")}
            </button>
            <button type="button" className="beda-action is-poke" data-testid="beda-poke" onClick={() => onAction("poke")}>
              {t("game.poke")}
            </button>
          </div>
        </div>
      ) : null}
      <div ref={viewRef} className="beda-spa-view">
        {showActors ? <BeDaActorLayer /> : null}
      <div className="beda-spa-stage">
        {room.landscape
          ? null
          : SPA_SEATS.map((seat) =>
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
              onSelect={onSelect}
            />
          );
        })}
      </div>
      <div ref={stageRef} className="beda-spa-floor" data-testid="beda-spa-floor">
        <RoomTreePlant />
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
            data-art={playerActorArt(player, look).join(" ")}
            data-testid="beda-spa-you"
            style={{
              zIndex: spaStackZ(room.you?.y ?? 0.7),
              ["--scale" as string]: String(SPA_YOU.scale),
            }}
          >
            <span className="beda-spa-art">
              <Cheeks />
              <BeDaFigure view={player} locale={locale} dress={gameDress(look, youPose)} crowd marks className="w-full" />
            </span>
            {youPose === "cheer" || youPose === "poke" ? (
              <span
                className="beda-gesture-bubble"
                data-testid="beda-gesture-bubble"
                data-bubble={bubbleColour(player.loadout.bubble)?.id}
                style={bubbleFrameStyle(player.loadout.bubble)}
              >
                {youPose === "cheer" ? t("game.cheerBubble") : t("game.pokeBubble")}
              </span>
            ) : null}
            <span className="beda-name-slot" aria-hidden />
          </div>
        ) : null}
        <div className="beda-spa-labels" data-testid="beda-spa-labels">
          {room.guests.map((guest) => {
            if (guest.x == null || guest.y == null) return null;
            return (
              <button
                key={guest.id}
                type="button"
                className="beda-spa-label"
                data-label-for={guest.id}
                onClick={() => onSelect(guest.id)}
              >
                <NamePill nickname={guest.nickname} streak={guest.careStreak ?? 0} />
              </button>
            );
          })}
          {showYou ? (
            <div className="beda-spa-label" data-label-for="you">
              <NamePill nickname={t("game.you")} streak={youStreak} mine />
            </div>
          ) : null}
        </div>
      </div>
      </div>

      <div className="beda-zoom" data-testid="beda-zoom">
        <button type="button" aria-label={t("game.zoomIn")} onClick={() => motion.current.zoomBy(1.2)}>
          +
        </button>
        <button type="button" aria-label={t("game.zoomOut")} onClick={() => motion.current.zoomBy(1 / 1.2)}>
          −
        </button>
      </div>

      <div className="beda-room-bar" data-testid="beda-room-bar">
        <button type="button" className={boardOpen ? "beda-spa-board is-on" : "beda-spa-board"} data-testid="beda-streak-board" onClick={() => void openBoard()}>
          {t("game.spaBoard")}
        </button>
        {together?.visible ? (
          <RoomTogetherDock
            questLabel={t("game.roomQuestOpen")}
            todayLabel={t("game.roomTodayOpen")}
            onQuest={() => choosePanel(panel === "quest" ? null : "quest")}
            onToday={() => choosePanel(panel === "today" ? null : "today")}
          />
        ) : null}
        <button type="button" className="beda-room-me" data-testid="beda-recenter" onClick={() => motion.current.recenter()}>
          {t("game.backToMe")}
        </button>
      </div>
      {quitAsk ? (
        <div className="beda-room-quit-shade" role="alertdialog" aria-modal="true" data-testid="beda-room-quit-dialog">
          <div className="beda-room-quit-card">
            <p>{t("game.spaLeaveConfirm")}</p>
            <div className="beda-room-quit-actions">
              <button type="button" data-testid="beda-room-quit-cancel" onClick={() => setQuitAsk(false)}>
                {t("game.spaLeaveNo")}
              </button>
              <button
                type="button"
                data-testid="beda-room-quit-yes"
                onClick={() => {
                  setQuitAsk(false);
                  onQuit?.();
                }}
              >
                {t("game.spaLeave")}
              </button>
            </div>
          </div>
        </div>
      ) : null}


      <RoomTreeDock />

      {together?.visible && panel ? (
        <div className="beda-room-sheet" data-testid="beda-room-sheet" role="dialog" aria-modal="false" aria-label={panel === "quest" ? t("game.roomQuestTitle") : t("game.roomTodayTitle")}>
          <button type="button" className="beda-room-sheet-close" data-testid="beda-room-sheet-close" onClick={() => choosePanel(null)}>
            {t("game.spaBoardClose")}
          </button>
          {panel === "quest" ? <RoomQuestCard together={together} locale={locale} /> : <RoomTodayList together={together} locale={locale} roomEnded={roomEnded} />}
        </div>
      ) : null}

      <header className="beda-spa-head">
        <button type="button" className="beda-spa-back" data-testid="beda-spa-leave" aria-label={t("game.back")} onClick={onLeave}>
          <LeaveArrow />
        </button>
        <div className="beda-spa-titlecard" data-testid="beda-spa-title">
          <strong>{roomTitle}</strong>
          <span className="beda-spa-meta" data-testid="beda-spa-meta">
            <span className="beda-spa-bit">
              {memberLine}
              {onlineLine || dayLine ? <span className="beda-spa-join"> · </span> : null}
            </span>
            {onlineLine ? (
              <span className="beda-spa-bit beda-spa-online" data-testid="beda-spa-online">
                {onlineLine}
                {dayLine ? " · " : ""}
              </span>
            ) : null}
            {dayLine ? <span className="beda-spa-bit beda-spa-days">{dayLine}</span> : null}
          </span>
        </div>
        <button type="button" className="beda-room-quit" data-testid="beda-room-quit" onClick={() => setQuitAsk(true)}>
          {t("game.spaLeave")}
        </button>
        {lock || room.notice === "ended" ? null : (
          <button type="button" className="beda-invite-open" data-testid="beda-invite-open" onClick={() => void onInvite()}>
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
          {together?.visible ? <RoomQuestCard together={together} locale={locale} /> : null}
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

      {inviteCopied ? (
        <p className="beda-invite-toast" data-testid="beda-invite-toast" role="status">
          {t("game.spaInviteCopied")}
        </p>
      ) : null}
      {boardOpen ? (
        <StreakBoard
          rows={boardRows}
          guests={room.guests}
          youNickname={room.youNickname || ""}
          youLabel={t("game.you")}
          watered={tree?.visible && tree.tree ? tree.tree.watered : []}
          player={player}
          look={look}
          locale={locale}
          onClose={() => setBoardOpen(false)}
        />
      ) : null}
    </div>
    </RoomTreeProvider>
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
  onSelect,
}: {
  guest: SpaGuest;
  locale: string;
  selected: boolean;
  seatX: number;
  seatY: number;
  scale: number;
  standing: boolean;
  onSelect: (id: string) => void;
}) {
  const t = useTranslations("mascot");
  const sample = guest.sample ? SAMPLE_LOBBY_FRIENDS.find((friend) => friend.id === guest.id) : undefined;
  const base = sample ? sampleFriendView(sample) : lobbyNeutralView();
  const view = guest.gender === "male" ? { ...base, gender: "male" as const } : base;
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
          ? {
              zIndex: spaStackZ(seatY / 100),
              ["--scale" as string]: String(scale),
            }
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
        {guest.pose === "cheer" || guest.pose === "poke" ? (
          <span
            className="beda-gesture-bubble"
            data-bubble={bubbleColour(guest.bubble)?.id}
            style={bubbleFrameStyle(guest.bubble)}
          >
            {guest.pose === "cheer" ? t("game.cheerBubble") : t("game.pokeBubble")}
          </span>
        ) : null}
        {standing ? (
          <span className="beda-name-slot" aria-hidden />
        ) : (
          <NamePill nickname={guest.nickname} streak={guest.careStreak ?? 0} />
        )}
      </button>
    </div>
  );
}

function NamePill({ nickname, streak, mine = false }: { nickname: string; streak: number; mine?: boolean }) {
  const t = useTranslations("mascot");
  return (
    <span className="beda-name">
      <span className={mine ? "beda-tag beda-tag-me" : "beda-tag"}>
        {mine ? <Star /> : null}
        <span className="beda-tag-label">{nickname}</span>
      </span>
      <StreakFlame streak={streak} label={t("game.spaStreak", { count: streak })} />
    </span>
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
  return <span className="beda-cheeks" aria-hidden />;
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
