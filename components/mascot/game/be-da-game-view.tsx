"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { BeDaFigure } from "@/components/mascot/be-da-figure";
import { BeDaLobby } from "@/components/mascot/game/be-da-lobby";
import { BeDaSpaRoom, type SpaRoomState } from "@/components/mascot/game/be-da-spa-room";
import type { SpaNotice } from "@/lib/mascot/game/spa-room";
import { GameIcon, IconBack, type GameIconName } from "@/components/mascot/game/icons";
import { LOBBY_PLAYER_SPOT } from "@/lib/mascot/game/lobby";
import {
  defaultLobbyNickname,
  lobbyActors,
  type LobbyActor,
} from "@/lib/mascot/game/lobby-live";
import { gameDress, isGameClip, isGameHair, isGameOutfit, type GameLook, type GamePose } from "@/lib/mascot/game/look";
import {
  equippedGameLook,
  grantedWardrobeItems,
  wardrobeThumbSrc,
  type WardrobeItem,
} from "@/lib/mascot/game/wardrobe";
import { routineSummary } from "@/lib/mascot/game/missions";
import type { GameBubbleKind, GameQuest } from "@/lib/mascot/game/quests";
import { routineAffiliateLink } from "@/lib/routine/affiliate-link";
import type { SkyPeriod } from "@/lib/mascot/game/sky";
import type { BeDaView } from "@/lib/mascot/model";

export type GameTab = "care" | "wardrobe" | "quests" | "lobby";

export type CareStep = {
  id: string;
  section: "morning" | "evening";
  title: string;
  category?: string;
  completed?: boolean;
  affiliate_link?: string;
  product_name?: string;
};

export type GameToast = { name: string; kind: "wave" | "heart" | "outfit" } | null;

const NAV: { id: GameTab; icon: GameIconName; label: "care" | "wardrobe" | "quests" | "lobby" }[] = [
  { id: "care", icon: "care", label: "care" },
  { id: "wardrobe", icon: "wardrobe", label: "wardrobe" },
  { id: "quests", icon: "quests", label: "quests" },
  { id: "lobby", icon: "lobby", label: "lobby" },
];

const WORN_EXTRAS = ["accessory_pink_headband", "accessory_star_clip"] as const;

/** Closet thumbnails. Preloaded when the wardrobe opens so the tile is not waiting on a tap. */
const WARDROBE_ITEM_SRCS = grantedWardrobeItems().map(wardrobeThumbSrc);

const BURST = [
  { dx: "-28px", dy: "-36px", color: "#ffe08a" },
  { dx: "26px", dy: "-30px", color: "#fff" },
  { dx: "-8px", dy: "-48px", color: "#ffb3d4" },
  { dx: "18px", dy: "-12px", color: "#fff6c8" },
  { dx: "-22px", dy: "-8px", color: "#8fe6df" },
];

export function BeDaGameView({
  locale,
  tab,
  sky,
  coinsLabel,
  streakLabel,
  soundOn,
  quests,
  careSteps,
  onToggleCareStep,
  onFinishCareSteps,
  bubbleKind,
  progress,
  showPrettyLine,
  chestOpen,
  friendCount,
  selectedFriendId,
  toast,
  look,
  wornIds,
  hearts,
  streakKept,
  giftTaken,
  player,
  burst,
  homeHref,
  onTab,
  onToggleSound,
  onSelectFriend,
  onFriendAction,
  onClaim,
  onLook,
  wavedToday = false,
  actors,
  you,
  hall = 1,
  hallCount,
  hallCap = 28,
  hallFull = false,
  nextHall = null,
  lobbyLive = false,
  nicknameError = false,
  onHide = () => undefined,
  onWalk = () => undefined,
  onNickname = () => false,
  onSwitchHall = () => undefined,
  spa = null,
  youPose = null,
  onCreateRoom,
  onJoinRoom,
  onLeaveSpa,
  onSpaLobby,
  onSpaWalk,
  onSpaBoard,
  creatingRoom = false,
  createProblem = null,
}: {
  locale: string;
  tab: GameTab;
  sky: SkyPeriod;
  coinsLabel: string;
  streakLabel: string;
  soundOn: boolean;
  quests: GameQuest[];
  careSteps?: readonly CareStep[];
  onToggleCareStep?: (step: CareStep) => void;
  onFinishCareSteps?: () => void;
  bubbleKind: GameBubbleKind;
  progress: number | null;
  showPrettyLine: boolean;
  chestOpen: boolean;
  friendCount: number;
  selectedFriendId: string;
  toast: GameToast;
  wavingId: string | null;
  look: GameLook;
  wornIds: string[];
  hearts: number;
  streakKept: boolean;
  giftTaken: boolean;
  player: BeDaView;
  burst: number;
  homeHref: string;
  onTab: (tab: GameTab) => void;
  onToggleSound: () => void;
  onSelectFriend: (id: string) => void;
  onFriendAction: (kind: "wave" | "heart" | "outfit") => void;
  onClaim: () => void;
  onLook: (look: GameLook) => void;
  /** Lobby wave. Shown on the mission sheet only, and not part of the routine. */
  wavedToday?: boolean;
  actors?: readonly LobbyActor[];
  you?: {
    x: number;
    y: number;
    facing: "left" | "right";
    pose: GamePose | null;
    nickname: string;
  };
  hall?: number;
  hallCount?: number;
  hallCap?: number;
  hallFull?: boolean;
  nextHall?: number | null;
  lobbyLive?: boolean;
  nicknameError?: boolean;
  onHide?: (id: string) => void;
  onWalk?: (x: number, y: number) => void;
  onNickname?: (value: string) => boolean;
  onSwitchHall?: (lobby: number) => void;
  spa?: SpaRoomState | null;
  youPose?: GamePose | null;
  onCreateRoom?: () => void;
  onJoinRoom?: (code: string) => void;
  onLeaveSpa?: () => void;
  onSpaLobby?: () => void;
  onSpaWalk?: (x: number, y: number, pace?: "walk" | "idle") => void;
  onSpaBoard?: () => Promise<readonly { nickname: string; careStreak: number }[]>;
  creatingRoom?: boolean;
  createProblem?: SpaNotice;
}) {
  const t = useTranslations("mascot");
  const rootRef = useRef<HTMLDivElement>(null);
  const [careSheet, setCareSheet] = useState(false);
  const [missionSheet, setMissionSheet] = useState(false);
  const sheetReturn = useRef<GameTab>("care");
  const spaOpen = spa != null;
  const showLobby = tab === "lobby" && !chestOpen && !spaOpen;
  const wardrobeOpen = tab === "wardrobe" && !chestOpen && !spaOpen;
  const equipped = equippedGameLook(look);
  const [draft, setDraft] = useState(equipped);
  const [tryFlash, setTryFlash] = useState(0);
  const shownLook = wardrobeOpen ? draft : equipped;

  useEffect(() => {
    setDraft(equippedGameLook(look));
  }, [look, wardrobeOpen]);

  useEffect(() => {
    if (!wardrobeOpen) return;
    for (const src of WARDROBE_ITEM_SRCS) {
      const img = new Image();
      img.decoding = "async";
      img.src = src;
    }
  }, [wardrobeOpen]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const nav = root.querySelector<HTMLElement>(".beda-nav");
    if (!nav) return;
    const apply = () => {
      const height = Math.ceil(nav.offsetHeight);
      if (height > 0) root.style.setProperty("--beda-nav-reserve", `${height}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(nav);
    window.addEventListener("resize", apply);
    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", apply);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", apply);
      viewport?.removeEventListener("resize", apply);
    };
  }, [tab, chestOpen]);
  const lobbyPeople =
    actors ?? lobbyActors({ live: false, people: [], selfId: null, hidden: new Set(), poses: {} });
  const youSpot = you ?? {
    x: LOBBY_PLAYER_SPOT.x,
    y: LOBBY_PLAYER_SPOT.y,
    facing: "right" as const,
    pose: null,
    nickname: defaultLobbyNickname(() => 0.48211),
  };
  const shownHallCount = hallCount ?? lobbyPeople.length + 1;
  const doorCountLabel = t("game.doorCount", { count: friendCount });
  const summary = routineSummary(careSteps ?? []);
  const openSteps = summary.morning.total + summary.evening.total - summary.morning.done - summary.evening.done;
  const activeNav: GameTab | null = spaOpen ? null : chestOpen ? "quests" : tab;

  return (
    <div
      ref={rootRef}
      className={spaOpen ? "beda-game is-spa" : "beda-game"}
      data-testid="beda-game"
      data-tab={activeNav ?? "spa"}
      data-sky={sky}
    >
      <h1 className="sr-only">{t("name")}</h1>
      {spa ? (
        <BeDaSpaRoom
          locale={locale}
          player={player}
          look={equipped}
          soundOn={soundOn}
          selectedId={selectedFriendId}
          youPose={youPose}
          room={spa}
          onSelect={onSelectFriend}
          onAction={onFriendAction}
          onHide={onHide}
          onLeave={onLeaveSpa ?? (() => undefined)}
          onLobby={onSpaLobby ?? (() => undefined)}
          onToggleSound={onToggleSound}
          onWalk={onSpaWalk}
          onLoadBoard={onSpaBoard}
        />
      ) : showLobby ? (
        <BeDaLobby
          sky={sky}
          player={player}
          locale={locale}
          look={equipped}
          dragLabel={t("game.drag")}
          selectedId={selectedFriendId}
          actors={lobbyPeople}
          you={youSpot}
          live={lobbyLive}
          hall={hall}
          hallFull={hallFull}
          nextHall={nextHall}
          nicknameError={nicknameError}
          onSelect={onSelectFriend}
          onAction={onFriendAction}
          onWalk={onWalk}
          onHide={onHide}
          onNickname={onNickname}
          onSwitchHall={onSwitchHall}
          onCreateRoom={onCreateRoom}
          onJoinRoom={onJoinRoom}
          creatingRoom={creatingRoom}
          createProblem={createProblem}
        />
      ) : (
        <Room
          sky={sky}
          player={player}
          locale={locale}
          look={shownLook}
          tryFlash={tryFlash}
          bubbleKind={bubbleKind}
          progress={progress}
          showPrettyLine={showPrettyLine}
          quests={quests}
          summary={summary}
          giftTaken={giftTaken}
          doorCountLabel={doorCountLabel}
          hideCards={chestOpen || tab === "wardrobe"}
          showHero={!chestOpen}
          onOpenLobby={() => onTab("lobby")}
          onOpenWardrobe={() => onTab("wardrobe")}
          onOpenMissions={() => {
            sheetReturn.current = tab === "quests" ? sheetReturn.current : tab;
            setCareSheet(false);
            onTab("quests");
            setMissionSheet(true);
          }}
        />
      )}

      {chestOpen ? (
        <Chest
          coinsLabel={coinsLabel}
          hearts={hearts}
          streakKept={streakKept}
          player={player}
          locale={locale}
          look={equipped}
          onClaim={onClaim}
        />
      ) : null}

      {wardrobeOpen ? (
        <Wardrobe
          wornIds={wornIds}
          preview={draft}
          onTry={(next) => {
            setDraft(next);
            setTryFlash((n) => n + 1);
          }}
          onWear={() => onLook(draft)}
        />
      ) : null}

      {toast ? <Toast toast={toast} /> : null}
      {burst > 0 ? (
        <span key={burst} className="beda-burst" aria-hidden>
          {BURST.map((bit) => (
            <i
              key={bit.dx}
              style={{ background: bit.color, ["--dx" as string]: bit.dx, ["--dy" as string]: bit.dy }}
            />
          ))}
        </span>
      ) : null}

      {spa ? null : (
      <div className={showLobby ? "beda-hud is-lobby" : "beda-hud"}>
        <a className="beda-back" href={homeHref} aria-label={t("game.back")}>
          <IconBack />
        </a>
        {showLobby ? (
          <div className="beda-hall" data-testid="beda-hall">
            <PersonIcon />
            {t("game.hall", { lobby: hall, count: shownHallCount, cap: hallCap })}
          </div>
        ) : (
          <>
            <div className="beda-chip" data-testid="beda-coins">
              <span className="beda-chip-icon coin">
                <GameIcon name="coin" className="beda-ico-sm" />
              </span>
              {coinsLabel} <small>{t("game.coinsUnit")}</small>
            </div>
            <div className="beda-chip" data-testid="beda-streak">
              <span className="beda-chip-icon flame">
                <GameIcon name="flame" className="beda-ico-sm" />
              </span>
              {streakLabel} <small>{t("game.streakUnit")}</small>
            </div>
          </>
        )}
        <button
          type="button"
          className="beda-mute"
          data-testid="beda-mute"
          aria-pressed={soundOn}
          aria-label={soundOn ? t("game.soundOn") : t("game.soundOff")}
          onClick={onToggleSound}
        >
          <GameIcon name={soundOn ? "soundOn" : "soundOff"} className="beda-ico-sm" />
        </button>
      </div>
      )}

      {missionSheet && !spaOpen && !chestOpen ? (
        <div className="beda-care-sheet" role="dialog" aria-modal="true" aria-label={t("game.questTitle")} data-testid="beda-mission-sheet">
          <button
            type="button"
            className="beda-care-back"
            aria-label={t("game.careClose")}
            onClick={() => {
              setMissionSheet(false);
              onTab(sheetReturn.current === "quests" ? "care" : sheetReturn.current);
            }}
          />
          <div className="beda-care-card">
            <div className="beda-care-head">
              <h2>{t("game.questTitle")}</h2>
              <button
                type="button"
                onClick={() => {
                  setMissionSheet(false);
                  onTab(sheetReturn.current === "quests" ? "care" : sheetReturn.current);
                }}
              >
                {t("game.careClose")}
              </button>
            </div>
            {(["morning", "evening"] as const).map((section) => {
              const rows = (careSteps ?? []).filter((step) => step.section === section);
              return (
                <section key={section}>
                  <h3>{t(section === "morning" ? "game.careMorning" : "game.careEvening")}</h3>
                  {rows.length === 0 ? <p className="beda-step-empty">{t("game.stepsEmpty")}</p> : null}
                  {rows.map((step) => {
                    const link = routineAffiliateLink(step);
                    return (
                      <div key={`${step.section}-${step.id}`}>
                        <button
                          type="button"
                          className={step.completed ? "beda-quest-row beda-step is-done" : "beda-quest-row beda-step"}
                          data-testid="beda-mission-step"
                          data-section={section}
                          data-done={step.completed ? "true" : "false"}
                          onClick={() => onToggleCareStep?.(step)}
                        >
                          <span className="beda-check">{step.completed ? <GameIcon name="check" className="beda-ico-sm" /> : null}</span>
                          {step.title}
                        </button>
                        {link ? (
                          <a
                            className="beda-quest-link"
                            href={link}
                            target="_blank"
                            rel="sponsored noopener"
                            data-testid="beda-mission-aff"
                          >
                            {step.product_name?.trim() || t("game.productLink")}
                          </a>
                        ) : null}
                      </div>
                    );
                  })}
                </section>
              );
            })}
            <section>
              <h3>{t("game.extra")}</h3>
              <button
                type="button"
                className={wavedToday ? "beda-quest-row beda-step is-done" : "beda-quest-row beda-step"}
                data-testid="beda-mission-wave"
                data-done={wavedToday ? "true" : "false"}
                onClick={() => {
                  setMissionSheet(false);
                  onTab("lobby");
                }}
              >
                <span className="beda-check">{wavedToday ? <GameIcon name="check" className="beda-ico-sm" /> : null}</span>
                {t("game.tasks.wave")}
              </button>
            </section>
          </div>
        </div>
      ) : null}

      {careSheet && !spaOpen ? (
        <div className="beda-care-sheet" role="dialog" aria-modal="true" aria-label={t("game.care")} data-testid="beda-care-sheet">
          <button type="button" className="beda-care-back" aria-label={t("game.careClose")} onClick={() => setCareSheet(false)} />
          <div className="beda-care-card">
            <div className="beda-care-head">
              <h2>{t("game.care")}</h2>
              <button type="button" onClick={() => setCareSheet(false)}>
                {t("game.careClose")}
              </button>
            </div>
            {(["morning", "evening"] as const).map((section) => {
              const rows = (careSteps ?? []).filter((step) => step.section === section);
              return (
                <section key={section}>
                  <h3>{t(section === "morning" ? "game.careMorning" : "game.careEvening")}</h3>
                  {rows.length === 0 ? <p className="beda-step-empty">{t("game.stepsEmpty")}</p> : null}
                  {rows.map((step) => (
                    <button
                      key={`${step.section}-${step.id}`}
                      type="button"
                      className={step.completed ? "beda-quest-row beda-step is-done" : "beda-quest-row beda-step"}
                      data-testid="beda-routine-step"
                      data-section={section}
                      data-done={step.completed ? "true" : "false"}
                      onClick={() => onToggleCareStep?.(step)}
                    >
                      <span className="beda-check">{step.completed ? <GameIcon name="check" className="beda-ico-sm" /> : null}</span>
                      {step.title}
                    </button>
                  ))}
                </section>
              );
            })}
            <button
              type="button"
              className="beda-step-all"
              data-testid="beda-routine-finish"
              disabled={(careSteps ?? []).length > 0 && (careSteps ?? []).every((step) => step.completed)}
              onClick={() => onFinishCareSteps?.()}
            >
              {t("game.allDone")}
            </button>
          </div>
        </div>
      ) : null}

      <nav className="beda-nav" aria-label={t("name")}>
        {NAV.map((item) => {
          const on = activeNav === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={on ? "beda-nav-btn is-on" : "beda-nav-btn"}
              aria-current={on ? "page" : undefined}
              data-testid={`beda-nav-${item.id}`}
              onClick={() => {
                if (item.id === "care" && !spaOpen) {
                  setMissionSheet(false);
                  onTab("care");
                  setCareSheet(true);
                  return;
                }
                if (item.id === "quests" && !spaOpen) {
                  sheetReturn.current = tab === "quests" ? sheetReturn.current : tab;
                  setCareSheet(false);
                  onTab("quests");
                  setMissionSheet(true);
                  return;
                }
                setCareSheet(false);
                setMissionSheet(false);
                onTab(item.id);
              }}
            >
              <span className={burst > 0 && on ? "beda-nav-orb beda-pop" : "beda-nav-orb"}>
                <GameIcon name={item.icon} />
              </span>
              {item.id === "quests" && openSteps > 0 ? <span className="beda-badge">{openSteps}</span> : null}
              {t(`game.${item.label}`)}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function Room({
  sky,
  player,
  locale,
  look,
  tryFlash = 0,
  bubbleKind,
  progress,
  showPrettyLine,
  quests,
  summary,
  giftTaken,
  doorCountLabel,
  hideCards,
  showHero,
  onOpenLobby,
  onOpenWardrobe,
  onOpenMissions,
}: {
  sky: SkyPeriod;
  player: BeDaView;
  locale: string;
  look: GameLook;
  tryFlash?: number;
  bubbleKind: GameBubbleKind;
  progress: number | null;
  showPrettyLine: boolean;
  quests: GameQuest[];
  summary: ReturnType<typeof routineSummary>;
  giftTaken: boolean;
  doorCountLabel: string;
  hideCards: boolean;
  showHero: boolean;
  onOpenLobby: () => void;
  onOpenWardrobe: () => void;
  onOpenMissions: () => void;
}) {
  const t = useTranslations("mascot");
  const pct = progress == null ? 0 : Math.round(progress * 100);
  const [cabinetOpen, setCabinetOpen] = useState(false);
  const cabinetTimer = useRef<number | null>(null);
  useEffect(() => () => {
    if (cabinetTimer.current != null) window.clearTimeout(cabinetTimer.current);
  }, []);
  function openCabinet() {
    if (cabinetTimer.current != null) return;
    setCabinetOpen(true);
    cabinetTimer.current = window.setTimeout(() => {
      cabinetTimer.current = null;
      onOpenWardrobe();
    }, 300);
  }
  return (
    <div className="beda-scene" data-testid="beda-room">
      <div className="beda-room-wall" />
      <div className="beda-room-stripes" />
      <div className="beda-room-floor" />
      <div className="beda-room-planks" />
      <div className="beda-baseboard" />
      <div className="beda-window" aria-hidden>
        <div className={`beda-sky beda-sky-${sky}`} />
        <i className="beda-sun" />
        <i className="beda-cloud" />
        <i className="beda-mullion-v" />
        <i className="beda-mullion-h" />
      </div>
      <div className="beda-window-bar" aria-hidden />
      <div className="beda-shelf" aria-hidden>
        <i className="beda-bottle" style={{ left: "8%", height: 30, background: "#9fd8d2" }} />
        <i className="beda-bottle" style={{ left: "32%", height: 22, background: "#f8b6c8", animationDelay: "0.4s" }} />
        <i className="beda-bottle" style={{ left: "54%", height: 26, background: "#ffe08a", animationDelay: "0.8s" }} />
        <i className="beda-bottle" style={{ left: "76%", height: 34, background: "#c9b8f2", animationDelay: "1.1s" }} />
      </div>
      <div className="beda-mirror" aria-hidden />
      <img className="beda-sink" src="/mascot/props/sink.svg" alt="" decoding="async" />
      <div className="beda-bed" aria-hidden>
        <i className="beda-bed-leg is-back-left" />
        <i className="beda-bed-leg is-back-right" />
        <i className="beda-bed-leg is-front-left" />
        <i className="beda-bed-leg is-front-right" />
        <div className="beda-bed-head" />
        <div className="beda-bed-mattress" />
        <div className="beda-bed-pillow" />
        <div className="beda-bed-cover" />
      </div>
      <div className="beda-plant" aria-hidden>
        <i className="beda-plant-leaf" style={{ left: 4, top: 8, transform: "rotate(-24deg)" }} />
        <i className="beda-plant-leaf" style={{ left: 18, top: 0, transform: "rotate(16deg)", background: "#8fd4a2" }} />
        <i className="beda-plant-leaf" style={{ left: 28, top: 14, transform: "rotate(36deg)" }} />
        <i className="beda-plant-pot" />
      </div>
      {!hideCards ? (
        <button
          type="button"
          className={cabinetOpen ? "beda-cabinet is-open" : "beda-cabinet"}
          data-testid="beda-cabinet"
          aria-label={t("game.wardrobe")}
          onClick={openCabinet}
        >
          <img
            src={cabinetOpen ? "/mascot/props/wardrobe_open.svg" : "/mascot/props/wardrobe.svg"}
            alt=""
            decoding="async"
          />
        </button>
      ) : null}

      {!hideCards ? (
        <>
          <section className="beda-card beda-quest" data-testid="beda-quest" aria-label={t("game.questTitle")}>
            <h2>
              <GameIcon name="quests" className="beda-ico-sm" />
              {t("game.questTitle")}
              <span className="beda-gift-pill">
                <GameIcon name={giftTaken ? "chestOpen" : "chestClosed"} className="beda-gift-ico" />
                {giftTaken ? t("game.giftTaken") : t("game.gift")}
              </span>
            </h2>
            {(["morning", "evening"] as const).map((section) => {
              const stats = summary[section];
              return (
                <button
                  key={section}
                  type="button"
                  className="beda-quest-row"
                  data-testid="beda-mission-summary"
                  data-section={section}
                  data-done={stats.done}
                  data-total={stats.total}
                  onClick={onOpenMissions}
                >
                  {t(section === "morning" ? "game.morningCount" : "game.eveningCount", stats)}
                </button>
              );
            })}
          </section>
          <button type="button" className="beda-card beda-door" onClick={onOpenLobby}>
            <GameIcon name="door" />
            <span>
              <strong>{t("game.door")}</strong>
              <span className="beda-door-count">{doorCountLabel}</span>
            </span>
          </button>
        </>
      ) : null}

      {showHero ? (
      <div className="beda-hero-wrap" data-testid="beda-hero">
        <Bubble kind={bubbleKind} />
        <BeDaFigure view={player} locale={locale} dress={gameDress(look)} className="w-full" />
        {tryFlash > 0 ? <span key={tryFlash} className="beda-try-glow" aria-hidden /> : null}
        <div className="beda-rug" aria-hidden />
        <div className="beda-pretty">
          {showPrettyLine ? t("glowNear") : t("game.atHome")}
          {progress != null ? (
            <div
              className="beda-pretty-bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              aria-label={t("glowProgress")}
              data-testid="beda-pretty-bar"
            >
              <div className="beda-pretty-fill" style={{ width: `${pct}%` }} />
            </div>
          ) : null}
        </div>
      </div>
      ) : null}
    </div>
  );
}

function Bubble({ kind }: { kind: GameBubbleKind }) {
  const t = useTranslations("mascot");
  const lead =
    kind === "wash"
      ? t("game.bubbleWash")
      : kind === "washed"
        ? t("game.bubbleWashed")
        : kind === "wave"
          ? t("game.bubbleScreened")
          : t("game.bubbleDone");
  const nudge = kind === "washed" ? t("game.bubbleSpf") : kind === "wave" ? t("game.bubbleWave") : "";
  if (!lead.trim()) return null;
  return (
    <p className="beda-bubble" data-testid="beda-bubble">
      {lead}
      {nudge ? (
        <>
          <br />
          <span className="beda-bubble-nudge">{nudge}</span>
        </>
      ) : null}
    </p>
  );
}

function Chest({
  coinsLabel,
  hearts,
  streakKept,
  player,
  locale,
  look,
  onClaim,
}: {
  coinsLabel: string;
  hearts: number;
  streakKept: boolean;
  player: BeDaView;
  locale: string;
  look: GameLook;
  onClaim: () => void;
}) {
  const t = useTranslations("mascot");
  return (
    <div className="beda-chest" data-testid="beda-chest">
      <div className="beda-chest-shade" />
      <div className="beda-chest-copy">
        <h2>{t("game.chestTitle")}</h2>
        <p>{t("game.chestSub")}</p>
      </div>
      <div className="beda-chest-stage" aria-hidden>
        <i className="beda-coin-float" style={{ left: "8%", top: "18%" }}>
          <GameIcon name="coin" />
        </i>
        <i className="beda-coin-float" style={{ left: "28%", top: "6%", animationDelay: "0.3s" }}>
          <GameIcon name="coin" />
        </i>
        <i className="beda-coin-float" style={{ left: "46%", top: "0", animationDelay: "0.6s" }}>
          <GameIcon name="coin" />
        </i>
        <i className="beda-coin-float" style={{ right: "28%", top: "8%", animationDelay: "0.2s" }}>
          <GameIcon name="coin" />
        </i>
        <img src="/mascot/icons/chest_open.svg" alt="" className="beda-chest-art" decoding="async" />
        <div className="beda-chest-hero">
          <BeDaFigure view={player} locale={locale} dress={gameDress(look, "cheer")} className="w-full" />
        </div>
      </div>
      <div className="beda-card beda-rewards">
        <div>
          <strong>{coinsLabel}</strong>
          {t("game.coinsUnit")}
        </div>
        <div>
          <strong>
            <GameIcon name="flame" className="beda-ico-sm" />
          </strong>
          {streakKept ? t("game.chestStreak") : t("game.chestStreakWait")}
        </div>
        <div>
          <strong>
            <GameIcon name="heart" className="beda-ico-sm" />
          </strong>
          {t("game.chestHearts", { count: hearts })}
        </div>
      </div>
      <button type="button" className="beda-claim" onClick={onClaim}>
        {t("game.claim")}
      </button>
    </div>
  );
}

function Wardrobe({
  wornIds,
  preview,
  onTry,
  onWear,
}: {
  wornIds: string[];
  preview: GameLook;
  onTry: (look: GameLook) => void;
  onWear: () => void;
}) {
  const t = useTranslations("mascot");
  const extras = WORN_EXTRAS.filter((id) => wornIds.includes(id));
  const outfits = grantedWardrobeItems("outfit");
  const hairs = grantedWardrobeItems("hair");
  const clips = grantedWardrobeItems("clip");
  return (
    <section className="beda-card beda-sheet" data-testid="beda-wardrobe" aria-label={t("game.wardrobe")}>
      <h2>{t("game.wardrobe")}</h2>
      <p>{t("game.wearing")}</p>
      <ul className="beda-worn">
        {outfits.some((item) => item.id === preview.outfit) ? <li>{t(`game.look.${preview.outfit}`)}</li> : null}
        {hairs.some((item) => item.id === preview.hair) ? <li>{t(`game.look.${preview.hair}`)}</li> : null}
        {preview.clip && clips.some((item) => item.id === preview.clip) ? (
          <li>{t(`game.look.${preview.clip}`)}</li>
        ) : null}
        {extras.map((id) => (
          <li key={id}>{t(`game.look.${id}`)}</li>
        ))}
      </ul>
      <WardrobeSlotPicks
        label={t("game.pickOutfit")}
        items={outfits}
        selected={preview.outfit}
        crop="is-outfit"
        onPick={(id) => {
          if (isGameOutfit(id)) onTry({ ...preview, outfit: id });
        }}
      />
      <WardrobeSlotPicks
        label={t("game.pickHair")}
        items={hairs}
        selected={preview.hair}
        crop="is-hair"
        onPick={(id) => {
          if (isGameHair(id)) onTry({ ...preview, hair: id });
        }}
      />
      {clips.length > 0 ? (
        <>
          <p>{t("game.pickClip")}</p>
          <div className="beda-picks">
            <button
              type="button"
              className={preview.clip == null ? "beda-pick is-on" : "beda-pick"}
              aria-label={t("game.look.clip_none")}
              aria-pressed={preview.clip == null}
              onClick={() => onTry({ ...preview, clip: null })}
            >
              <span className="beda-pick-art is-clip is-empty" />
              {t("game.look.clip_none")}
            </button>
            {clips.map((item) => (
              <button
                key={item.id}
                type="button"
                className={preview.clip === item.id ? "beda-pick is-on" : "beda-pick"}
                aria-label={t(`game.look.${item.id}`)}
                aria-pressed={preview.clip === item.id}
                onClick={() => {
                  if (isGameClip(item.id)) onTry({ ...preview, clip: item.id });
                }}
              >
                <WardrobeThumb src={wardrobeThumbSrc(item)} crop="is-clip" />
                {t(`game.look.${item.id}`)}
              </button>
            ))}
          </div>
        </>
      ) : null}
      <p className="beda-note">{t("game.tryNote")}</p>
      <div className="beda-wear-bar">
        <button type="button" className="beda-wear" data-testid="beda-wear" onClick={onWear}>
          {t("game.wear")}
        </button>
      </div>
    </section>
  );
}

function WardrobeSlotPicks({
  label,
  items,
  selected,
  crop,
  onPick,
}: {
  label: string;
  items: readonly WardrobeItem[];
  selected: string;
  crop: "is-outfit" | "is-hair";
  onPick: (id: WardrobeItem["id"]) => void;
}) {
  const t = useTranslations("mascot");
  if (items.length === 0) return null;
  return (
    <>
      <p>{label}</p>
      <div className="beda-picks">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={selected === item.id ? "beda-pick is-on" : "beda-pick"}
            aria-label={t(`game.look.${item.id}`)}
            aria-pressed={selected === item.id}
            onClick={() => onPick(item.id)}
          >
            <WardrobeThumb src={wardrobeThumbSrc(item)} crop={crop} />
            {t(`game.look.${item.id}`)}
          </button>
        ))}
      </div>
    </>
  );
}

function WardrobeThumb({ src, crop }: { src: string; crop: "is-outfit" | "is-hair" | "is-clip" }) {
  const ref = useRef<HTMLImageElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth > 0) setReady(true);
  }, [src]);

  return (
    <span className={ready ? `beda-pick-art ${crop}` : `beda-pick-art ${crop} is-loading`}>
      <span className="beda-pick-skel" aria-hidden />
      <img
        ref={ref}
        src={src}
        alt=""
        loading="eager"
        decoding="async"
        onLoad={() => setReady(true)}
        onError={() => setReady(true)}
      />
    </span>
  );
}

function PersonIcon() {
  return (
    <svg className="beda-ico-sm" viewBox="0 0 32 32" aria-hidden>
      <circle cx="16" cy="11" r="5" fill="#8fe6df" />
      <path d="M7 26c1.4-5 4.6-7.5 9-7.5S23.6 21 25 26" fill="#8fe6df" />
    </svg>
  );
}

function Toast({ toast }: { toast: { name: string; kind: "wave" | "heart" | "outfit" } }) {
  const t = useTranslations("mascot");
  const icon = toast.kind === "heart" ? "heart" : toast.kind === "outfit" ? "outfit" : "wave";
  return (
    <div className="beda-toast" role="status" data-testid="beda-toast">
      <i>
        <GameIcon name={icon} className="beda-ico-sm" />
      </i>
      {t(`game.toast.${toast.kind}`, { name: toast.name })}
    </div>
  );
}
