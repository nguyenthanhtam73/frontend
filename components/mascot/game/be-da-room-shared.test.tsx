import assert from "node:assert/strict";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, it } from "node:test";

import { BeDaSpaRoom } from "@/components/mascot/game/be-da-spa-room";
import { RoomQuestCard, RoomTodayList } from "@/components/mascot/game/be-da-room-shared";
import type { RoomTogether } from "@/components/mascot/game/use-room-shared";
import { chestsFromQuest, readRoomQuest, readRoomToday, type RoomQuest } from "@/lib/mascot/game/room-shared";
import { DEFAULT_GAME_LOOK } from "@/lib/mascot/game/look";
import { sampleSpaGuests } from "@/lib/mascot/game/spa-room";
import { defaultSnapshot, resolveBeDaView } from "@/lib/mascot/model";
import vi from "../../../messages/vi.json";

const LAN = "11111111-1111-1111-1111-111111111111";
const MINH = "22222222-2222-2222-2222-222222222222";

function player() {
  return resolveBeDaView({
    snapshot: { ...defaultSnapshot(), isDefault: false, mood: "happy" },
    missedDays: 0,
    sessionHappy: true,
    locale: "vi",
  });
}

function quest(): RoomQuest {
  const parsed = readRoomQuest({
    progress: 5,
    span_days: 9,
    member_count: 2,
    max_member_days: 18,
    vn_today: "2026-11-03",
    milestones: [
      { member_days: 5, coins: 40, tier: "small", reached: true, claimed: false, claimable: true },
      { member_days: 15, coins: 120, tier: "medium", reached: false, claimed: false, claimable: false },
      { member_days: 30, coins: 300, tier: "big", reached: false, claimed: false, claimable: false },
    ],
  });
  if (!parsed) throw new Error("quest");
  return parsed;
}

function together(extra: Partial<RoomTogether> = {}): RoomTogether {
  const board = readRoomToday({
    vn_date: "2026-11-03",
    members: [
      { user_id: LAN, display_name: "Lan", look: { body: "body_chibi", hair: "hair_sleep_buns", outfit: "outfit_cozy_pajamas" }, cared_today: true, checked_today: true },
      { user_id: MINH, display_name: "Minh", look: { body: "body_chibi", hair: "hair_sleep_buns", outfit: "outfit_cozy_pajamas" }, cared_today: false, checked_today: false },
    ],
  });
  return {
    visible: true,
    loading: false,
    quest: quest(),
    grace: false,
    expired: false,
    message: null,
    chests: chestsFromQuest(quest()),
    coins: null,
    gain: null,
    popDays: null,
    claiming: null,
    today: board?.members ?? [],
    todayMessage: null,
    selfId: LAN,
    nudged: [],
    nudging: null,
    onClaim: () => undefined,
    onNudge: () => undefined,
    ...extra,
  };
}

function render(node: ReactNode) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="vi" messages={vi} timeZone="Asia/Ho_Chi_Minh">
      {node}
    </NextIntlClientProvider>,
  );
}

describe("shared room panels", () => {
  it("shows one chest ready to open and the other two still shut", () => {
    const html = render(<RoomQuestCard together={together()} locale="vi" />);
    assert.match(html, /Cả phòng đã chăm da 5 lượt/);
    assert.match(html, /data-testid="beda-chest-5"/);
    assert.match(html, /data-state="claimable"/);
    assert.match(html, /data-state="locked"/);
    assert.match(html, /40 xu/);
    assert.match(html, /120 xu/);
    assert.match(html, /300 xu/);
    assert.equal(html.includes("member"), false);
  });

  it("updates the coin count after a claim", () => {
    const html = render(
      <RoomQuestCard
        locale="vi"
        together={together({
          coins: 40,
          gain: 40,
          popDays: 5,
          chests: chestsFromQuest(quest()).map((chest) =>
            chest.memberDays === 5 ? { ...chest, state: "claimed" } : chest,
          ),
        })}
      />,
    );
    assert.match(html, /data-testid="beda-room-coins"/);
    assert.match(html, />40</);
    assert.match(html, /data-testid="beda-coin-gain"/);
    assert.match(html, /\+40 xu/);
    assert.match(html, /data-state="claimed"/);
    assert.match(html, /chest_open\.svg/);
  });

  it("shows the server line when the chests have expired", () => {
    const html = render(
      <RoomQuestCard
        locale="vi"
        together={together({
          quest: null,
          expired: true,
          grace: false,
          message: "Phòng đã kết thúc, rương hết hạn",
          chests: chestsFromQuest(null, { expired: true }),
        })}
      />,
    );
    assert.match(html, /data-testid="beda-quest-message"/);
    assert.match(html, /Phòng đã kết thúc, rương hết hạn/);
    assert.equal((html.match(/data-state="expired"/g) ?? []).length, 3);
  });

  it("offers Nhắc bạn only for someone who has not done today", () => {
    const html = render(<RoomTodayList together={together()} locale="vi" />);
    assert.match(html, /Lan/);
    assert.match(html, /Minh/);
    assert.match(html, /Đã chăm da/);
    assert.match(html, /Chưa soi da/);
    assert.match(html, /data-testid="beda-nudge-22222222-2222-2222-2222-222222222222"/);
    assert.equal(html.includes("beda-nudge-11111111"), false);
    assert.match(html, /\/mascot\/body\/body_chibi\.svg/);
    assert.equal(html.includes("email"), false);
    assert.equal(html.includes("http"), false);
    const nudged = render(
      <RoomTodayList together={together({ nudged: [MINH] })} locale="vi" />,
    );
    assert.match(nudged, /Đã nhắc/);
    assert.match(nudged, /disabled/);
  });

  it("hides Nhắc bạn after the room has ended", () => {
    const html = render(<RoomTodayList together={together()} locale="vi" roomEnded />);
    assert.match(html, /Minh/);
    assert.match(html, /Chưa soi da/);
    assert.equal(html.includes("Nhắc bạn"), false);
    assert.equal(html.includes("beda-nudge-"), false);
  });

  it("labels a reached chest the caller cannot open yet", () => {
    const html = render(
      <RoomQuestCard
        locale="vi"
        together={together({
          chests: chestsFromQuest(quest()).map((chest) =>
            chest.memberDays === 5 ? { ...chest, state: "closed" } : chest,
          ),
        })}
      />,
    );
    assert.match(html, /Cần 1 ngày của bạn/);
    assert.match(html, /5 lượt/);
    assert.match(html, /15 lượt/);
    assert.match(html, /30 lượt/);
    assert.equal(html.includes("Chưa mở"), false);
  });

  it("draws Nam and Nữ from each member's look.gender", () => {
    const board = together();
    const [lan, minh] = board.today;
    const html = render(
      <RoomTodayList
        locale="vi"
        together={{
          ...board,
          selfId: null,
          today: [
            { ...lan!, look: { ...lan!.look, gender: "male" } },
            { ...minh!, look: { ...minh!.look, gender: undefined } },
          ],
        }}
      />,
    );
    const lanRow = html.slice(html.indexOf(`beda-today-${LAN}`), html.indexOf(`beda-today-${MINH}`));
    const minhRow = html.slice(html.indexOf(`beda-today-${MINH}`));
    assert.match(lanRow, /data-gender="male"/);
    assert.match(lanRow, /\/mascot\/hair\/hair_boy_short\.svg/);
    assert.match(lanRow, /\/mascot\/outfits\/outfit_pajamas_boy\.svg/);
    assert.match(minhRow, /data-gender="female"/);
    assert.match(minhRow, /\/mascot\/hair\/hair_sleep_buns\.svg/);
    assert.match(minhRow, /\/mascot\/outfit\/outfit_cozy_pajamas\.svg/);
    assert.equal(minhRow.includes("hair_boy_short"), false);
    assert.equal(minhRow.includes("outfit_pajamas_boy"), false);
  });

  it("plays a cheer on Bé Da without a text field", () => {
    const html = render(
      <BeDaSpaRoom
        locale="vi"
        player={player()}
        look={DEFAULT_GAME_LOOK}
        soundOn={false}
        selectedId="tra-sua"
        youPose="cheer"
        room={{ code: "DA7K2M", count: 2, cap: 8, guests: sampleSpaGuests(new Set()), notice: null, daysLeft: 5 }}
        onSelect={() => undefined}
        onAction={() => undefined}
        onHide={() => undefined}
        onLeave={() => undefined}
        onLobby={() => undefined}
        onToggleSound={() => undefined}
        together={together()}
        panel="quest"
        showActors={false}
      />,
    );
    assert.match(html, /data-testid="beda-cheer"/);
    assert.match(html, /data-testid="beda-poke"/);
    assert.match(html, /data-pose="cheer"/);
    assert.match(html, /data-testid="beda-gesture-bubble"/);
    assert.match(html, /Cổ vũ!/);
    assert.match(html, /arms_up__pajamas\.svg/);
    assert.match(html, /data-testid="beda-quest-card"/);
    assert.equal(html.includes("textarea"), false);
    assert.equal(html.includes("email"), false);
  });

  it("shows expired chests when the room read window is over", () => {
    const html = render(
      <BeDaSpaRoom
        locale="vi"
        player={player()}
        look={DEFAULT_GAME_LOOK}
        soundOn={false}
        selectedId=""
        youPose={null}
        room={{ code: "DA7K2M", count: 1, cap: 8, guests: [], notice: "ended", daysLeft: 0 }}
        onSelect={() => undefined}
        onAction={() => undefined}
        onHide={() => undefined}
        onLeave={() => undefined}
        onLobby={() => undefined}
        onToggleSound={() => undefined}
        together={together({
          quest: null,
          grace: false,
          expired: true,
          message: "Phòng này đã kết thúc.",
          chests: chestsFromQuest(null, { expired: true }),
        })}
        panel="quest"
        showActors={false}
      />,
    );
    assert.match(html, /data-state="expired"/);
    assert.match(html, /Hết hạn/);
    assert.equal(html.includes("data-state=\"claimable\""), false);
  });
});
