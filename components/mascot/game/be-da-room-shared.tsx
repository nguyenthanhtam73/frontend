"use client";

import { useTranslations } from "next-intl";

import { BeDaFigure } from "@/components/mascot/be-da-figure";
import { GameIcon } from "@/components/mascot/game/icons";
import type { RoomTogether } from "@/components/mascot/game/use-room-shared";
import {
  canNudgeMember,
  formatRoomCoins,
  questFillPercent,
  questScale,
  todayMemberView,
  type ChestState,
  type RoomChest,
} from "@/lib/mascot/game/room-shared";

const STATE_KEY: Record<ChestState, "roomQuestClaim" | "roomQuestLocked" | "roomQuestClaimed" | "roomQuestClosed" | "roomQuestExpired"> = {
  claimable: "roomQuestClaim",
  locked: "roomQuestLocked",
  claimed: "roomQuestClaimed",
  closed: "roomQuestClosed",
  expired: "roomQuestExpired",
};

export function RoomTogetherDock({
  onQuest,
  onToday,
  questLabel,
  todayLabel,
}: {
  onQuest: () => void;
  onToday: () => void;
  questLabel: string;
  todayLabel: string;
}) {
  return (
    <div className="beda-room-dock" data-testid="beda-room-dock">
      <button type="button" data-testid="beda-open-quest" onClick={onQuest}>
        {questLabel}
      </button>
      <button type="button" data-testid="beda-open-today" onClick={onToday}>
        {todayLabel}
      </button>
    </div>
  );
}

export function RoomQuestCard({
  together,
  locale,
}: {
  together: RoomTogether;
  locale: string;
}) {
  const t = useTranslations("mascot");
  const scale = together.quest ? questScale(together.quest) : 30;
  const fill = together.quest ? questFillPercent(together.quest) : 0;
  return (
    <section className="beda-quest-card" data-testid="beda-quest-card" aria-label={t("game.roomQuestTitle")}>
      <h2>{t("game.roomQuestTitle")}</h2>
      {together.quest ? (
        <p className="beda-quest-count">{t("game.roomQuestProgress", { count: together.quest.progress })}</p>
      ) : together.loading ? (
        <p className="beda-quest-count">{t("game.roomQuestLoading")}</p>
      ) : null}
      {together.quest ? (
        <div className="beda-quest-track" data-testid="beda-quest-bar">
          <span style={{ width: `${fill}%` }} />
          {together.chests.map((chest) => (
            <i key={chest.memberDays} style={{ left: `${Math.min(100, (chest.memberDays / scale) * 100)}%` }} />
          ))}
        </div>
      ) : null}
      {together.grace && !together.expired ? <p className="beda-quest-note">{t("game.roomQuestGrace")}</p> : null}
      {together.message ? (
        <p className="beda-quest-alert" role="alert" data-testid="beda-quest-message">
          {together.message}
        </p>
      ) : null}
      <div className="beda-chest-row">
        {together.chests.map((chest) => (
          <ChestButton
            key={chest.memberDays}
            chest={chest}
            popping={together.popDays === chest.memberDays && chest.state === "claimed"}
            busy={together.claiming === chest.memberDays}
            label={t(`game.${STATE_KEY[chest.state]}`)}
            daysLabel={t("game.roomQuestDays", { days: chest.memberDays })}
            coinsLabel={t("game.roomQuestCoinsEach", { count: formatRoomCoins(chest.coins, locale) })}
            onClaim={() => together.onClaim(chest.memberDays)}
          />
        ))}
      </div>
      {together.coins != null ? (
        <p className="beda-room-wallet">
          {t("game.roomQuestCoins")}{" "}
          <strong data-testid="beda-room-coins" data-pop={together.gain && together.gain > 0 ? "1" : "0"}>
            {formatRoomCoins(together.coins, locale)}
          </strong>{" "}
          <small>{t("game.coinsUnit")}</small>
        </p>
      ) : null}
      {together.gain != null && together.gain > 0 ? (
        <p className="beda-coin-gain" data-testid="beda-coin-gain">
          {t("game.roomQuestGain", { count: formatRoomCoins(together.gain, locale) })}
        </p>
      ) : null}
    </section>
  );
}

function ChestButton({
  chest,
  popping,
  busy,
  label,
  daysLabel,
  coinsLabel,
  onClaim,
}: {
  chest: RoomChest;
  popping: boolean;
  busy: boolean;
  label: string;
  daysLabel: string;
  coinsLabel: string;
  onClaim: () => void;
}) {
  const open = chest.state === "claimed" || popping;
  const disabled = busy || chest.state !== "claimable";
  return (
    <button
      type="button"
      className={popping ? "beda-chest-btn is-pop" : open ? "beda-chest-btn is-open" : "beda-chest-btn"}
      data-testid={`beda-chest-${chest.memberDays}`}
      data-state={chest.state}
      disabled={disabled}
      onClick={onClaim}
    >
      <GameIcon name={open ? "chestOpen" : "chestClosed"} className="beda-chest-ico" />
      <b>{coinsLabel}</b>
      <span>{daysLabel}</span>
      <em>{label}</em>
    </button>
  );
}

export function RoomTodayList({
  together,
  locale,
}: {
  together: RoomTogether;
  locale: string;
}) {
  const t = useTranslations("mascot");
  return (
    <section className="beda-today" data-testid="beda-today" aria-label={t("game.roomTodayTitle")}>
      <h2>{t("game.roomTodayTitle")}</h2>
      {together.todayMessage ? (
        <p className="beda-quest-alert" role="status" data-testid="beda-today-message">
          {together.todayMessage}
        </p>
      ) : null}
      {together.loading && together.today.length === 0 ? <p className="beda-quest-count">{t("game.roomQuestLoading")}</p> : null}
      {!together.loading && together.today.length === 0 && !together.todayMessage ? (
        <p className="beda-quest-count">{t("game.roomTodayEmpty")}</p>
      ) : null}
      <ul>
        {together.today.map((member) => {
          const mine = together.selfId != null && member.userId.toLowerCase() === together.selfId.toLowerCase();
          const nudge = canNudgeMember(member, together.selfId);
          const sent = together.nudged.includes(member.userId);
          const view = todayMemberView(member.look, locale);
          return (
            <li key={member.userId} data-testid={`beda-today-${member.userId}`}>
              <span className="beda-today-art" aria-hidden>
                <BeDaFigure view={view} locale={locale} imageLoading="lazy" className="w-full" />
              </span>
              <span className="beda-today-copy">
                <strong>
                  {member.displayName}
                  {mine ? <small>{t("game.roomTodayYou")}</small> : null}
                </strong>
                <span>
                  {member.caredToday ? t("game.roomTodayCared") : t("game.roomTodayNotCared")}
                  {" · "}
                  {member.checkedToday ? t("game.roomTodayChecked") : t("game.roomTodayNotChecked")}
                </span>
                {nudge ? (
                  <button
                    type="button"
                    data-testid={`beda-nudge-${member.userId}`}
                    disabled={sent || together.nudging === member.userId}
                    onClick={() => together.onNudge(member.userId)}
                  >
                    {sent ? t("game.roomNudged") : t("game.roomNudge")}
                  </button>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
