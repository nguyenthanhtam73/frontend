"use client";

import { useTranslations } from "next-intl";

import { BeDaFigure } from "@/components/mascot/be-da-figure";
import { BeDaLobby } from "@/components/mascot/game/be-da-lobby";
import {
  IconBack,
  IconBottle,
  IconCheck,
  IconCoin,
  IconDoor,
  IconDress,
  IconFlame,
  IconHand,
  IconHeart,
  IconScroll,
  IconSound,
  IconTree,
} from "@/components/mascot/game/icons";
import type { GameBubbleKind, GameQuest, GameQuestId } from "@/lib/mascot/game/quests";
import type { SkyPeriod } from "@/lib/mascot/game/sky";
import type { BeDaView } from "@/lib/mascot/model";

export type GameTab = "care" | "wardrobe" | "quests" | "lobby";

export type GameToast = { name: string; kind: "wave" | "heart" | "outfit" } | null;

const NAV: { id: GameTab; icon: typeof IconBottle; label: "care" | "wardrobe" | "quests" | "lobby" }[] = [
  { id: "care", icon: IconBottle, label: "care" },
  { id: "wardrobe", icon: IconDress, label: "wardrobe" },
  { id: "quests", icon: IconScroll, label: "quests" },
  { id: "lobby", icon: IconTree, label: "lobby" },
];

const SWATCHES = [
  { id: "pink", hue: 0, color: "#f59ab8" },
  { id: "peach", hue: 32, color: "#ffb085" },
  { id: "sun", hue: 70, color: "#ffe08a" },
  { id: "leaf", hue: 140, color: "#8fd4a2" },
  { id: "sky", hue: 200, color: "#8fd0e6" },
  { id: "lilac", hue: 270, color: "#c9b8f2" },
] as const;

const WEAR: Record<string, "pajamas" | "buns" | "headband" | "clip"> = {
  outfit_cozy_pajamas: "pajamas",
  hair_sleep_buns: "buns",
  accessory_pink_headband: "headband",
  accessory_star_clip: "clip",
};

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
  bubbleKind,
  progress,
  showPrettyLine,
  chestOpen,
  friendCount,
  selectedFriendId,
  toast,
  wavingId,
  outfitHue,
  wornIds,
  hearts,
  streakKept,
  giftTaken,
  player,
  burst,
  homeHref,
  routineHref,
  onTab,
  onToggleSound,
  onSelectFriend,
  onFriendAction,
  onClaim,
  onHue,
}: {
  locale: string;
  tab: GameTab;
  sky: SkyPeriod;
  coinsLabel: string;
  streakLabel: string;
  soundOn: boolean;
  quests: GameQuest[];
  bubbleKind: GameBubbleKind;
  progress: number | null;
  showPrettyLine: boolean;
  chestOpen: boolean;
  friendCount: number;
  selectedFriendId: string;
  toast: GameToast;
  wavingId: string | null;
  outfitHue: number;
  wornIds: string[];
  hearts: number;
  streakKept: boolean;
  giftTaken: boolean;
  player: BeDaView;
  burst: number;
  homeHref: string;
  routineHref: string;
  onTab: (tab: GameTab) => void;
  onToggleSound: () => void;
  onSelectFriend: (id: string) => void;
  onFriendAction: (kind: "wave" | "heart" | "outfit") => void;
  onClaim: () => void;
  onHue: (hue: number) => void;
}) {
  const t = useTranslations("mascot");
  const showLobby = tab === "lobby" && !chestOpen;
  const friendCountLabel = t("game.friends", { count: friendCount });
  const doorCountLabel = t("game.doorCount", { count: friendCount });
  const openQuests = quests.filter((quest) => !quest.done).length;
  const activeNav: GameTab = chestOpen ? "quests" : tab;

  return (
    <div className="beda-game" data-testid="beda-game" data-tab={activeNav} data-sky={sky}>
      <h1 className="sr-only">{t("name")}</h1>
      {showLobby ? (
        <BeDaLobby
          sky={sky}
          player={player}
          locale={locale}
          outfitHue={outfitHue}
          youLabel={t("game.you")}
          friendCountLabel={friendCountLabel}
          dragLabel={t("game.drag")}
          selectedId={selectedFriendId}
          wavingId={wavingId}
          onSelect={onSelectFriend}
          onAction={onFriendAction}
        />
      ) : (
        <Room
          sky={sky}
          player={player}
          locale={locale}
          outfitHue={outfitHue}
          bubbleKind={bubbleKind}
          progress={progress}
          showPrettyLine={showPrettyLine}
          quests={quests}
          giftTaken={giftTaken}
          routineHref={routineHref}
          doorCountLabel={doorCountLabel}
          hideCards={chestOpen || tab === "wardrobe"}
          showHero={!chestOpen}
          onOpenLobby={() => onTab("lobby")}
        />
      )}

      {chestOpen ? (
        <Chest
          coinsLabel={coinsLabel}
          hearts={hearts}
          streakKept={streakKept}
          player={player}
          locale={locale}
          outfitHue={outfitHue}
          onClaim={onClaim}
        />
      ) : null}

      {tab === "wardrobe" && !chestOpen ? (
        <Wardrobe wornIds={wornIds} outfitHue={outfitHue} onHue={onHue} />
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

      <div className="beda-hud">
        <a className="beda-back" href={homeHref} aria-label={t("game.back")}>
          <IconBack />
        </a>
        <div className="beda-chip" data-testid="beda-coins">
          <span className="beda-chip-icon coin">
            <IconCoin />
          </span>
          {coinsLabel} <small>{t("game.coinsUnit")}</small>
        </div>
        <div className="beda-chip" data-testid="beda-streak">
          <span className="beda-chip-icon flame">
            <IconFlame />
          </span>
          {streakLabel} <small>{t("game.streakUnit")}</small>
        </div>
        <button
          type="button"
          className="beda-mute"
          data-testid="beda-mute"
          aria-pressed={soundOn}
          aria-label={soundOn ? t("game.soundOn") : t("game.soundOff")}
          onClick={onToggleSound}
        >
          <IconSound muted={!soundOn} />
        </button>
      </div>

      <nav className="beda-nav" aria-label={t("name")}>
        {NAV.map((item) => {
          const Icon = item.icon;
          const on = activeNav === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={on ? "beda-nav-btn is-on" : "beda-nav-btn"}
              aria-current={on ? "page" : undefined}
              data-testid={`beda-nav-${item.id}`}
              onClick={() => onTab(item.id)}
            >
              <span className={burst > 0 && on ? "beda-nav-orb beda-pop" : "beda-nav-orb"}>
                <Icon />
              </span>
              {item.id === "quests" && openQuests > 0 ? <span className="beda-badge">{openQuests}</span> : null}
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
  outfitHue,
  bubbleKind,
  progress,
  showPrettyLine,
  quests,
  giftTaken,
  routineHref,
  doorCountLabel,
  hideCards,
  showHero,
  onOpenLobby,
}: {
  sky: SkyPeriod;
  player: BeDaView;
  locale: string;
  outfitHue: number;
  bubbleKind: GameBubbleKind;
  progress: number | null;
  showPrettyLine: boolean;
  quests: GameQuest[];
  giftTaken: boolean;
  routineHref: string;
  doorCountLabel: string;
  hideCards: boolean;
  showHero: boolean;
  onOpenLobby: () => void;
}) {
  const t = useTranslations("mascot");
  const pct = progress == null ? 0 : Math.round(progress * 100);
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
      <div className="beda-bed" aria-hidden>
        <div className="beda-bed-cover" />
        <div className="beda-bed-pillow" />
      </div>
      <div className="beda-plant" aria-hidden>
        <i className="beda-plant-leaf" style={{ left: 4, top: 8, transform: "rotate(-24deg)" }} />
        <i className="beda-plant-leaf" style={{ left: 18, top: 0, transform: "rotate(16deg)", background: "#8fd4a2" }} />
        <i className="beda-plant-leaf" style={{ left: 28, top: 14, transform: "rotate(36deg)" }} />
        <i className="beda-plant-pot" />
      </div>

      {!hideCards ? (
        <>
          <section className="beda-card beda-quest" data-testid="beda-quest" aria-label={t("game.questTitle")}>
            <h2>
              <IconScroll className="beda-ico-sm" />
              {t("game.questTitle")}
              <span className="beda-gift-pill">{giftTaken ? t("game.giftTaken") : t("game.gift")}</span>
            </h2>
            {quests.map((quest) => (
              <QuestRow key={quest.id} quest={quest} routineHref={routineHref} onOpenLobby={onOpenLobby} />
            ))}
            <a className="beda-quest-link" href={routineHref}>
              {t("game.routineLink")}
            </a>
          </section>
          <button type="button" className="beda-card beda-door" onClick={onOpenLobby}>
            <IconDoor />
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
        <BeDaFigure view={player} locale={locale} outfitHue={outfitHue} className="w-full" />
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

function QuestRow({
  quest,
  routineHref,
  onOpenLobby,
}: {
  quest: GameQuest;
  routineHref: string;
  onOpenLobby: () => void;
}) {
  const t = useTranslations("mascot");
  const label = t(`game.tasks.${quest.id}`);
  const body = (
    <>
      <span className="beda-check">{quest.done ? <IconCheck /> : null}</span>
      {label}
    </>
  );
  if (quest.done) {
    return (
      <div className="beda-quest-row is-done" data-quest={quest.id}>
        {body}
      </div>
    );
  }
  if (quest.id === "wave") {
    return (
      <button type="button" className="beda-quest-row" data-quest={quest.id} onClick={onOpenLobby}>
        {body}
      </button>
    );
  }
  return (
    <a className="beda-quest-row" data-quest={quest.id as GameQuestId} href={routineHref}>
      {body}
    </a>
  );
}

function Chest({
  coinsLabel,
  hearts,
  streakKept,
  player,
  locale,
  outfitHue,
  onClaim,
}: {
  coinsLabel: string;
  hearts: number;
  streakKept: boolean;
  player: BeDaView;
  locale: string;
  outfitHue: number;
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
        <i className="beda-coin-float" style={{ left: "8%", top: "18%" }} />
        <i className="beda-coin-float" style={{ left: "28%", top: "6%", animationDelay: "0.3s" }} />
        <i className="beda-coin-float" style={{ left: "46%", top: "0", animationDelay: "0.6s" }} />
        <i className="beda-coin-float" style={{ right: "28%", top: "8%", animationDelay: "0.2s" }} />
        <i className="beda-spark" style={{ left: "18%", top: "40%" }} />
        <i className="beda-spark" style={{ right: "22%", top: "30%" }} />
        <div className="beda-chest-lid" />
        <div className="beda-chest-box">
          <div className="beda-chest-band" />
          <div className="beda-chest-lock" />
        </div>
        <div className="beda-chest-hero">
          <BeDaFigure view={player} locale={locale} outfitHue={outfitHue} className="w-full" />
        </div>
      </div>
      <div className="beda-card beda-rewards">
        <div>
          <strong>{coinsLabel}</strong>
          {t("game.coinsUnit")}
        </div>
        <div>
          <strong>
            <IconFlame className="beda-ico-sm" />
          </strong>
          {streakKept ? t("game.chestStreak") : t("game.chestStreakWait")}
        </div>
        <div>
          <strong>
            <IconHeart className="beda-ico-sm" />
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
  outfitHue,
  onHue,
}: {
  wornIds: string[];
  outfitHue: number;
  onHue: (hue: number) => void;
}) {
  const t = useTranslations("mascot");
  const labels = wornIds.map((id) => WEAR[id]).filter((key): key is NonNullable<typeof key> => !!key);
  return (
    <section className="beda-card beda-sheet" data-testid="beda-wardrobe" aria-label={t("game.wardrobe")}>
      <h2>{t("game.wardrobe")}</h2>
      <p>{t("game.wearing")}</p>
      <ul className="beda-worn">
        {labels.map((key) => (
          <li key={key}>{t(`game.wear.${key}`)}</li>
        ))}
      </ul>
      <p>{t("game.tryColor")}</p>
      <div className="beda-swatches">
        {SWATCHES.map((swatch) => (
          <button
            key={swatch.id}
            type="button"
            className={swatch.hue === outfitHue ? "beda-swatch is-on" : "beda-swatch"}
            style={{ background: swatch.color }}
            aria-label={t(`game.swatch.${swatch.id}`)}
            aria-pressed={swatch.hue === outfitHue}
            onClick={() => onHue(swatch.hue)}
          />
        ))}
      </div>
      <p className="beda-note">{t("game.tryNote")}</p>
    </section>
  );
}

function Toast({ toast }: { toast: { name: string; kind: "wave" | "heart" | "outfit" } }) {
  const t = useTranslations("mascot");
  const Icon = toast.kind === "heart" ? IconHeart : toast.kind === "outfit" ? IconDress : IconHand;
  return (
    <div className="beda-toast" role="status" data-testid="beda-toast">
      <i>
        <Icon className="beda-ico-sm" />
      </i>
      {t(`game.toast.${toast.kind}`, { name: toast.name })}
    </div>
  );
}
