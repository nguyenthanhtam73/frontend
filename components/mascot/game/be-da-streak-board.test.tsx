import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, it } from "node:test";

import { StreakBoard } from "@/components/mascot/game/be-da-streak-board";
import { DEFAULT_GAME_LOOK } from "@/lib/mascot/game/look";
import type { SpaBoardRow, SpaGuest } from "@/lib/mascot/game/spa-room";
import { defaultSnapshot, resolveBeDaView } from "@/lib/mascot/model";
import vi from "../../../messages/vi.json";

const player = resolveBeDaView({
  snapshot: { ...defaultSnapshot(), isDefault: false, mood: "happy" },
  missedDays: 0,
  sessionHappy: true,
  locale: "vi",
});

function guest(nickname: string, sample = false): SpaGuest {
  return {
    id: nickname,
    nickname,
    seat: null,
    x: null,
    y: null,
    facing: "right",
    outfit: "outfit_pajamas",
    hair: "hair_sleep_buns",
    clip: null,
    pose: null,
    sample,
  };
}

function render(rows: SpaBoardRow[], guests: SpaGuest[] = [], watered: string[] = []) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="vi" messages={vi} timeZone="Asia/Ho_Chi_Minh">
      <StreakBoard
        rows={rows}
        guests={guests}
        youNickname="Lan"
        youLabel="Bạn"
        watered={watered}
        player={player}
        look={DEFAULT_GAME_LOOK}
        locale="vi"
        onClose={() => undefined}
      />
    </NextIntlClientProvider>,
  );
}

describe("streak board", () => {
  it("shares medals by distinct streak and hides a zero", () => {
    const html = render(
      [
        { nickname: "Mây Hồng", careStreak: 18 },
        { nickname: "Trà Sữa", careStreak: 18 },
        { nickname: "Mochi", careStreak: 11 },
        { nickname: "Lan", careStreak: 9 },
        { nickname: "Ốc Quế", careStreak: 3 },
        { nickname: "Kẹo Dừa", careStreak: 0 },
      ],
      [guest("Mây Hồng"), guest("Trà Sữa"), guest("Mochi"), guest("Kẹo Dừa")],
      ["Mây Hồng", "Lan"],
    );
    assert.match(html, /Hôm nay 2\/6 bạn đã tưới · xếp theo ngày chăm da/);
    assert.match(html, /data-testid="beda-board-me"/);
    assert.equal(html.includes("Lan"), false);
    assert.match(html, />Bạn</);
    assert.match(html, /Đã tưới/);
    assert.match(html, /Chưa tưới/);
    assert.match(html, /0 ngày/);
    assert.equal(html.includes("👑"), false);
    assert.equal((html.match(/beda-board-medal/g) ?? []).length, 4);
    assert.match(html, /beda-board-rank">4</);
    assert.match(html, /beda-board-rank">–</);
  });

  it("keeps the empty line and leaves sample friends off the board", () => {
    const html = render([{ nickname: "Mây Hồng", careStreak: 4 }], [guest("Mây Hồng", true)]);
    assert.match(html, /Chưa có ai trong bảng/);
    assert.equal(html.includes("Mây Hồng"), false);
  });
});
