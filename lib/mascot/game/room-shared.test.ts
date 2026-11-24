import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ApiError } from "@/lib/api-client";
import { parseRoomMessage } from "@/lib/mascot/game/spa-room";
import {
  canNudgeMember,
  chestState,
  chestsFromQuest,
  friendlyRoomMessage,
  isQuestGrace,
  nudgeBody,
  questClaimBody,
  questFillPercent,
  readNudgedIds,
  readRoomClaim,
  readRoomQuest,
  readRoomToday,
  rememberNudgedId,
  todayMemberView,
} from "@/lib/mascot/game/room-shared";

const LAN = "11111111-1111-1111-1111-111111111111";
const MINH = "22222222-2222-2222-2222-222222222222";

const QUEST = {
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
};

describe("shared room quest", () => {
  it("reads the 8-day bar and the three chests", () => {
    const quest = readRoomQuest(QUEST);
    assert.ok(quest);
    assert.equal(quest.progress, 5);
    assert.equal(quest.maxMemberDays, 18);
    assert.deepEqual(
      quest.milestones.map((item) => chestState(item)),
      ["claimable", "locked", "locked"],
    );
    assert.deepEqual(
      quest.milestones.map((item) => item.coins),
      [40, 120, 300],
    );
    assert.ok(questFillPercent(quest) > 0);
    assert.ok(questFillPercent(quest) < 30);
  });

  it("marks a reached chest that is not mine as closed, and an overlay as expired", () => {
    assert.equal(chestState({ reached: true, claimed: false, claimable: false }), "closed");
    assert.equal(chestState({ reached: true, claimed: true, claimable: false }, "expired"), "expired");
    assert.equal(chestState({ reached: true, claimed: true, claimable: true }), "claimed");
  });

  it("sends only member_days when claiming", () => {
    assert.deepEqual(questClaimBody(5), { member_days: 5 });
    assert.equal(JSON.stringify(questClaimBody(5)), '{"member_days":5}');
    const claim = readRoomClaim({
      member_days: 5,
      coins: 40,
      tier: "small",
      balance: 40,
      already_claimed: false,
      progress: 5,
    });
    assert.deepEqual(claim, {
      memberDays: 5,
      coins: 40,
      tier: "small",
      balance: 40,
      alreadyClaimed: false,
      progress: 5,
    });
  });

  it("shows the server's Vietnamese expiry line", () => {
    const err = new ApiError("api", {
      status: 409,
      code: "chests_expired",
      serverMessage: "Phòng đã kết thúc, rương hết hạn",
    });
    assert.equal(err.status, 409);
    assert.equal(friendlyRoomMessage("chests_expired", err.serverMessage ?? ""), "Phòng đã kết thúc, rương hết hạn");
    assert.equal(friendlyRoomMessage("chest_closed", "chest is not open yet"), "Rương này chưa mở.");
    assert.equal(isQuestGrace(new ApiError("api", { status: 409, code: "room_ended", serverMessage: "Phòng này đã kết thúc." })), true);
    assert.equal(chestsFromQuest(null, { expired: true }).every((item) => item.state === "expired"), true);
    assert.equal(chestsFromQuest(null, { expired: true }).every((item) => item.state === "expired"), true);
  });
});

describe("Hôm nay and nudge", () => {
  it("keeps the name, Bé Da look, and today's two flags, and drops photos and email", () => {
    const today = readRoomToday({
      vn_date: "2026-11-03",
      members: [
        {
          user_id: LAN,
          display_name: "Lan",
          email: "lan-secret@example.com",
          avatar_url: "https://cdn.example/secret-face.jpg",
          image_urls: ["https://cdn.example/secret-face.jpg"],
          user_note: "SECRET_NOTE_LEAK",
          look: {
            body: "body_chibi",
            hair: "hair_sleep_buns",
            outfit: "outfit_cozy_pajamas",
            accessory: "accessory_star_clip",
            accessories: ["accessory_star_clip"],
            room_items: ["room_plant"],
            gender: "male",
          },
          cared_today: false,
          checked_today: true,
        },
        {
          user_id: MINH,
          display_name: "Minh",
          look: { body: "body_chibi", hair: "hair_sleep_buns", outfit: "outfit_cozy_pajamas", accessory: "", accessories: [], room_items: [] },
          cared_today: false,
          checked_today: false,
        },
      ],
    });
    assert.ok(today);
    assert.equal(today.members.length, 2);
    assert.equal(today.members[0]?.look.gender, "male");
    assert.equal(today.members[1]?.look.gender, undefined);
    assert.equal(canNudgeMember(today.members[0]!, LAN), false);
    assert.equal(canNudgeMember(today.members[1]!, LAN), true);
    const dumped = JSON.stringify(today);
    assert.equal(dumped.includes("secret"), false);
    assert.equal(dumped.includes("email"), false);
    assert.equal(dumped.includes("http"), false);
    const view = todayMemberView(today.members[0]!.look, "vi");
    assert.equal(view.gender, "male");
    assert.equal(view.loadout.roomItems.length, 0);
  });

  it("nudges with only a user id, once per day on this device", () => {
    assert.deepEqual(nudgeBody(MINH), { user_id: MINH });
    assert.equal(JSON.stringify(nudgeBody(MINH)).includes("message"), false);
    const storage = memory();
    assert.deepEqual(rememberNudgedId(storage, "DA7K2M", "2026-11-03", MINH), [MINH]);
    assert.deepEqual(readNudgedIds(storage, "DA7K2M", "2026-11-03"), [MINH]);
    assert.deepEqual(readNudgedIds(storage, "DA7K2M", "2026-11-04"), []);
  });

  it("reads cheer and poke with no text, and a nudge sentence", () => {
    const tick = parseRoomMessage(
      JSON.stringify({
        v: 1,
        channel: "room",
        op: "tick",
        count: 2,
        cap: 8,
        upserts: [],
        left: [],
        events: [
          { op: "cheer", from: "abc123def456", text: "hello" },
          { op: "poke", from: "abc123def456", target: "k3m8p2q9w4xn", message: "free text" },
          { op: "nudge", from: "abc123def456", target: "k3m8p2q9w4xn", variant: 2, message: "Lan đang chờ bạn chăm da hôm nay đó 💕" },
        ],
      }),
    );
    assert.equal(tick.op, "tick");
    if (tick.op !== "tick") return;
    assert.equal(tick.events[0]?.op, "cheer");
    assert.equal(tick.events[0]?.message, undefined);
    assert.equal(tick.events[1]?.op, "poke");
    assert.equal(tick.events[1]?.message, undefined);
    assert.equal(tick.events[2]?.message, "Lan đang chờ bạn chăm da hôm nay đó 💕");
    assert.equal(tick.events[2]?.variant, 2);
  });
});

function memory(): Pick<Storage, "getItem" | "setItem"> {
  const bag = new Map<string, string>();
  return {
    getItem: (key) => bag.get(key) ?? null,
    setItem: (key, value) => {
      bag.set(key, value);
    },
  };
}
