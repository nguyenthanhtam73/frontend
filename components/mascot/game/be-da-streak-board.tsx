"use client";

import { useTranslations } from "next-intl";

import { BeDaFigure } from "@/components/mascot/be-da-figure";
import { gameDress, type GameLook } from "@/lib/mascot/game/look";
import { lobbyNeutralView, sampleFriendView, SAMPLE_LOBBY_FRIENDS } from "@/lib/mascot/game/lobby";
import {
  boardMedals,
  type BoardMedal,
  type SpaBoardRow,
  type SpaGuest,
} from "@/lib/mascot/game/spa-room";
import type { BeDaView } from "@/lib/mascot/model";

export function StreakBoard({
  rows,
  guests,
  youNickname,
  youLabel,
  watered,
  player,
  look,
  locale,
  onClose,
}: {
  rows: readonly SpaBoardRow[];
  guests: readonly SpaGuest[];
  youNickname: string;
  youLabel: string;
  watered: readonly string[];
  player: BeDaView;
  look: GameLook;
  locale: string;
  onClose: () => void;
}) {
  const t = useTranslations("mascot");
  const shown = rows.filter((row) => !aiOnly(row.nickname, guests, youNickname, youLabel));
  const medals = boardMedals(shown);
  const wateredNames = new Set(watered.map((name) => name.trim()));
  const mineName = youNickname.trim();
  const done = shown.filter((row) => hasWatered(row.nickname, mineName, youLabel, wateredNames)).length;
  return (
    <div className="beda-board-sheet" role="dialog" aria-modal="true" aria-label={t("game.spaBoard")} data-testid="beda-streak-sheet">
      <button type="button" className="beda-board-shade" aria-label={t("game.spaBoardClose")} onClick={onClose} />
      <section className="beda-board-card" data-count={shown.length}>
        <span className="beda-board-handle" aria-hidden />
        <div className="beda-board-head">
          <div>
            <h2>{t("game.spaBoard")}</h2>
            {shown.length > 0 ? (
              <p className="beda-board-sub" data-testid="beda-board-sub">
                {t("game.spaBoardSub", { done, total: shown.length })}
              </p>
            ) : null}
          </div>
          <button type="button" className="beda-board-x" onClick={onClose}>
            ×
          </button>
        </div>
        {shown.length === 0 ? (
          <p className="beda-board-empty">{t("game.spaBoardEmpty")}</p>
        ) : (
          <ol className="beda-board-rows">
            {shown.map((row, index) => {
              const mine = isMine(row.nickname, mineName, youLabel);
              const wet = hasWatered(row.nickname, mineName, youLabel, wateredNames);
              return (
                <li key={`${row.nickname}-${index}`} className={mine ? "is-me" : undefined} data-testid={mine ? "beda-board-me" : undefined}>
                  <Medal medal={medals[index] ?? null} place={row.careStreak > 0 ? plainPlace(shown, index) : null} />
                  <BoardFace
                    nickname={row.nickname}
                    mine={mine}
                    guests={guests}
                    player={player}
                    look={look}
                    locale={locale}
                  />
                  <b className="beda-board-name">{mine ? youLabel : row.nickname}</b>
                  <span className={row.careStreak > 0 ? "beda-board-days" : "beda-board-days is-zero"}>
                    {row.careStreak > 0 ? <Flame /> : null}
                    {t("game.spaBoardDays", { count: row.careStreak })}
                  </span>
                  <span className={wet ? "beda-board-water is-on" : "beda-board-water"} data-testid={wet ? "beda-board-watered" : "beda-board-dry"}>
                    <Drop />
                    {wet ? t("game.spaBoardWatered") : t("game.spaBoardDry")}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}

function plainPlace(rows: readonly { careStreak: number }[], index: number): number {
  const value = rows[index]?.careStreak ?? 0;
  return new Set(rows.map((row) => row.careStreak).filter((item) => item > value)).size + 1;
}

function isMine(nickname: string, youNickname: string, youLabel: string): boolean {
  const name = nickname.trim();
  if (!name) return false;
  if (youNickname && name === youNickname) return true;
  return name === youLabel;
}

function hasWatered(nickname: string, youNickname: string, youLabel: string, watered: ReadonlySet<string>): boolean {
  const name = nickname.trim();
  if (watered.has(name)) return true;
  if (isMine(name, youNickname, youLabel) && youNickname && watered.has(youNickname)) return true;
  return false;
}

/** Sample stand-ins are not room members, so they stay off the board. */
function aiOnly(nickname: string, guests: readonly SpaGuest[], youNickname: string, youLabel: string): boolean {
  if (isMine(nickname, youNickname, youLabel)) return false;
  const matches = guests.filter((guest) => guest.nickname === nickname);
  return matches.length > 0 && matches.every((guest) => guest.sample);
}

function BoardFace({
  nickname,
  mine,
  guests,
  player,
  look,
  locale,
}: {
  nickname: string;
  mine: boolean;
  guests: readonly SpaGuest[];
  player: BeDaView;
  look: GameLook;
  locale: string;
}) {
  const guest = guests.find((item) => item.nickname === nickname && !item.sample) ?? guests.find((item) => item.nickname === nickname);
  const sample = guest?.sample ? SAMPLE_LOBBY_FRIENDS.find((friend) => friend.id === guest.id) : undefined;
  const base = mine ? player : sample ? sampleFriendView(sample) : lobbyNeutralView();
  const view = !mine && guest?.gender === "male" ? { ...base, gender: "male" as const } : base;
  const dress = mine
    ? gameDress(look)
    : guest
      ? gameDress({ outfit: guest.outfit, hair: guest.hair, clip: guest.clip })
      : gameDress(look);
  return (
    <span className="beda-board-av" aria-hidden>
      <BeDaFigure view={view} locale={locale} dress={dress} crowd className="beda-board-av-fig" imageLoading="lazy" />
    </span>
  );
}

function Medal({ medal, place }: { medal: BoardMedal; place: number | null }) {
  if (medal === "gold") return <MedalDisc n="1" fill="#F6D15B" ring="#E0A81A" ink="#9A6A00" />;
  if (medal === "silver") return <MedalDisc n="2" fill="#D9DEE6" ring="#8E99A8" ink="#4E5968" />;
  if (medal === "bronze") return <MedalDisc n="3" fill="#E4A574" ring="#C4844A" ink="#7A4A22" />;
  return <span className="beda-board-rank">{place ?? "–"}</span>;
}

function MedalDisc({ n, fill, ring, ink }: { n: string; fill: string; ring: string; ink: string }) {
  return (
    <svg className="beda-board-medal" viewBox="0 0 32 32" aria-hidden>
      <circle cx="16" cy="16" r="14.5" fill={fill} stroke={ring} strokeWidth="2.2" />
      <circle cx="16" cy="16" r="11" fill="#fff" fillOpacity="0.55" stroke={ring} strokeWidth="1" />
      <text x="16" y="21" textAnchor="middle" fontSize="13" fontWeight="800" fill={ink}>
        {n}
      </text>
    </svg>
  );
}

function Flame() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden>
      <path d="M16 4C16 4 8 14 8 20a8 8 0 0 0 16 0C24 14 16 4 16 4Z" fill="#FF8A3D" stroke="#C25A12" strokeWidth="1.6" />
      <path d="M16 12c0 0-4 6-4 9a4 4 0 0 0 8 0c0-3-4-9-4-9Z" fill="#FFE08A" />
    </svg>
  );
}

function Drop() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden>
      <path d="M8 1.5C8 1.5 3 7 3 10.2A5 5 0 0 0 13 10.2C13 7 8 1.5 8 1.5Z" fill="currentColor" />
    </svg>
  );
}
