import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { WirePerson } from "@/lib/mascot/game/lobby-live";
import type { LobbySocketLike } from "@/lib/mascot/game/lobby-socket";
import { RoomConnection } from "@/lib/mascot/game/spa-room-socket";
import {
  applyRoomMessage,
  emptyRoom,
  rankCareStreaks,
  readSpaBoard,
  topCareStreak,
  encodeRoomFrame,
  isRoomFull,
  isRoomMissing,
  makeRoomCode,
  normalizeRoomCode,
  parseRoomMessage,
  roomFrameAllowed,
  formatRoomEndDate,
  oneRoomMessage,
  pickActiveRoom,
  readAlreadyInRoom,
  remainingRoomDays,
  roomEndDate,
  roomInviteUrl,
  roomShareChoice,
  sampleSpaGuests,
  seatGuests,
  SPA_SEATS,
  shouldRetryRoomJoin,
  SPA_ENTRY_TIMEOUT_MS,
  spaEntryPhase,
  spaMembershipEnds,
  spaHeadCount,
  spaRoomGuests,
  spaRoomOnlineCount,
  spaRoomProblem,
  fitSpaPlate,
  SPA_CROP_TIGHT,
  SPA_PLATE_HEIGHT,
  SPA_PLATE_WIDTH,
  spaMembershipChanged,
  spaPlateY,
  spaStackZ,
  spreadSpaFeet,
  zaloShareUrl,
} from "@/lib/mascot/game/spa-room";
import { mergeSpaRoomCodes, readSpaRoom } from "@/lib/mascot/game/spa-room-api";
import { SPA_BOUNDS } from "@/lib/mascot/game/walk";

const SELF = "k3m8p2q9w4xn";
const OTHER = "a9b8c7d6e5f4";

function person(id: string, nickname: string): WirePerson {
  return {
    id,
    nickname,
    outfit: "outfit_pajamas",
    hair: "hair_sleep_buns",
    accessory: "",
    x: 0.5,
    y: 0.5,
    facing: "right",
    action: "idle",
  };
}

function memoryStorage(seed: Record<string, string> = {}): Storage {
  const data = { ...seed };
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = value;
    },
    removeItem: (key) => {
      delete data[key];
    },
    clear: () => {
      for (const key of Object.keys(data)) delete data[key];
    },
    key: (index) => Object.keys(data)[index] ?? null,
    get length() {
      return Object.keys(data).length;
    },
  };
}

describe("spa join spots", () => {
  it("stands stacked members apart inside the floor and leaves a walk alone", () => {
    const you = "k3m8p2q9w4xn";
    const friend = "a9b8c7d6e5h4";
    const stacked = [
      { id: you, x: 0.5, y: 0.7 },
      { id: friend, x: 0.5, y: 0.7 },
    ];
    const once = spreadSpaFeet(stacked);
    const again = spreadSpaFeet([...stacked].reverse());
    const mine = once.get(you)!;
    const theirs = once.get(friend)!;
    assert.ok(Math.hypot(mine.x - theirs.x, mine.y - theirs.y) > 0.08);
    assert.deepEqual(mine, again.get(you));
    assert.deepEqual(theirs, again.get(friend));
    for (const spot of [mine, theirs]) {
      assert.ok(spot.x >= SPA_BOUNDS.minX && spot.x <= SPA_BOUNDS.maxX);
      assert.ok(spot.y >= SPA_BOUNDS.minY && spot.y <= SPA_BOUNDS.maxY);
    }
    const walked = spreadSpaFeet([
      { id: you, x: 0.22, y: 0.55 },
      { id: friend, x: 0.8, y: 0.62 },
    ]);
    assert.deepEqual(walked.get(you), { x: 0.22, y: 0.55 });
    assert.deepEqual(walked.get(friend), { x: 0.8, y: 0.62 });
  });

  it("keeps two and three members on one row", () => {
    for (const count of [2, 3]) {
      const people = Array.from({ length: count }, (_, index) => ({
        id: `p${index}`,
        x: 0.5,
        y: 0.7,
      }));
      const spots = [...spreadSpaFeet(people).values()];
      const ys = new Set(spots.map((spot) => Number(spot.y.toFixed(3))));
      assert.equal(ys.has(Number((0.7 - 0.08).toFixed(3))), false);
      for (const spot of spots) {
        assert.ok(Math.abs(spot.y - 0.7) < 0.05);
        assert.ok(spot.x >= SPA_BOUNDS.minX && spot.x <= SPA_BOUNDS.maxX);
      }
    }
  });

  it("staggers four, six, and eight members into two rows that stay readable at 390px", () => {
    const span = SPA_BOUNDS.maxX - SPA_BOUNDS.minX;
    for (const count of [4, 6, 8]) {
      const people = Array.from({ length: count }, (_, index) => ({
        id: `m${String(index).padStart(2, "0")}`,
        x: 0.5,
        y: 0.7,
      }));
      const spots = spreadSpaFeet(people);
      const again = spreadSpaFeet([...people].reverse());
      const perRow = Math.ceil(count / 2);
      const rowStep = Math.min(0.24, span / perRow);
      const origin = (perRow - 1) / 2;
      people.forEach((person, index) => {
        const spot = spots.get(person.id)!;
        assert.deepEqual(spot, again.get(person.id));
        const back = index < perRow;
        const rowIndex = back ? index : index - perRow;
        const x = Math.min(SPA_BOUNDS.maxX, Math.max(SPA_BOUNDS.minX, 0.5 + (rowIndex - origin) * rowStep + (back ? 0 : rowStep / 2)));
        const y = Math.min(SPA_BOUNDS.maxY, Math.max(SPA_BOUNDS.minY, back ? 0.7 - 0.08 : 0.7 + 0.03));
        assert.ok(Math.abs(spot.x - x) < 1e-9, `${count} ${person.id} x`);
        assert.ok(Math.abs(spot.y - y) < 1e-9, `${count} ${person.id} y`);
      });
      const frontY = Math.min(SPA_BOUNDS.maxY, 0.7 + 0.03);
      const backY = Math.max(SPA_BOUNDS.minY, 0.7 - 0.08);
      assert.ok(spaStackZ(frontY) > spaStackZ(backY));
      // Bạn is 1.24× the 108px base. One neighbour covering one side still leaves 60%.
      const gapPx = rowStep * 390;
      assert.ok(gapPx / (108 * 1.24) >= 0.6, `${count} Bạn visibility ${gapPx}`);
    }
  });

  it("fits the whole plate in portrait and crops only the empty band on a wide frame", () => {
    assert.equal(SPA_PLATE_WIDTH, 780);
    assert.equal(SPA_PLATE_HEIGHT, 1387);
    const aspect = SPA_PLATE_WIDTH / SPA_PLATE_HEIGHT;
    for (const [width, height] of [
      [390, 620],
      [360, 560],
      [820, 930],
    ] as const) {
      const plate = fitSpaPlate(width, height);
      assert.equal(plate.cropTop, 0);
      assert.equal(plate.cropBottom, 1);
      assert.ok(plate.width <= width + 1e-6 && plate.height <= height + 1e-6);
      assert.ok(Math.abs(plate.width / plate.height - aspect) < 1e-9);
    }
    const wide = fitSpaPlate(1024, 500, 1024 * 0.45);
    assert.equal(wide.cropTop, SPA_CROP_TIGHT.top);
    assert.equal(wide.cropBottom, SPA_CROP_TIGHT.bottom);
    assert.ok(wide.cropTop <= 0.17);
    assert.ok(wide.cropBottom >= 0.776);
    assert.ok(wide.width <= 1024 && wide.height <= 500 + 1e-6);
    assert.ok(wide.width > 500 * aspect, "cropped plate is wider than the full plate");
    const feet = spaPlateY(0.7, wide.cropTop, wide.cropBottom);
    assert.ok(feet > 0 && feet < 1);
    assert.equal(spaMembershipChanged({ upserts: [{ id: "new" }], left: [], events: [] }, new Set(["old"])), true);
    assert.equal(spaMembershipChanged({ upserts: [], left: ["old"], events: [] }, new Set(["old"])), true);
    assert.equal(
      spaMembershipChanged({ upserts: [{ id: "old" }], left: [], events: [{ op: "wave" }] }, new Set(["old"])),
      false,
    );
    assert.deepEqual(fitSpaPlate(0, 400), { width: 0, height: 0, cropTop: 0, cropBottom: 1 });
  });

  it("keeps the sample cast off a real room code and times out the wait", () => {
    assert.equal(SPA_ENTRY_TIMEOUT_MS, 10_000);
    assert.equal(spaEntryPhase({ live: false, timedOut: false, notice: null }), "loading");
    assert.equal(spaEntryPhase({ live: false, timedOut: true, notice: null }), "error");
    assert.equal(spaEntryPhase({ live: false, timedOut: false, notice: "offline" }), "error");
    assert.equal(spaEntryPhase({ live: true, timedOut: true, notice: "offline" }), "room");
    assert.equal(spaEntryPhase({ live: false, timedOut: false, notice: "rate" }), "error");
    const waiting = spaRoomGuests({
      code: "DA7K2M",
      live: false,
      notice: null,
      previewCount: null,
      people: [],
      selfId: null,
      hidden: new Set(),
    });
    assert.deepEqual(waiting, []);
    const names = spaRoomGuests({
      code: null,
      live: false,
      notice: null,
      previewCount: null,
      people: [],
      selfId: null,
      hidden: new Set(),
    }).map((guest) => guest.nickname);
    assert.ok(names.includes("Trà Sữa"));
    assert.ok(names.includes("Mây Hồng"));
  });

  it("keeps the room when the connection drops after entering", () => {
    assert.equal(
      spaEntryPhase({ live: false, entered: true, timedOut: true, notice: "offline" }),
      "room",
    );
    assert.equal(
      spaEntryPhase({ live: false, entered: false, timedOut: true, notice: null }),
      "error",
    );
  });

  it("does not end membership on retry or unmount", () => {
    assert.equal(spaMembershipEnds("retry"), false);
    assert.equal(spaMembershipEnds("unmount"), false);
    assert.equal(spaMembershipEnds("explicit"), true);
  });
});

describe("spa room list", () => {
  it("uses the server list and keeps device memory when the server has none", () => {
    const storage = memoryStorage({ "beda-spa-rooms": JSON.stringify(["DA7K2M"]) });
    assert.deepEqual(mergeSpaRoomCodes(storage, []), ["DA7K2M"]);
    assert.deepEqual(mergeSpaRoomCodes(storage, ["cu4p8r", "be3n9q", "nope", "cu4p8r"]), ["CU4P8R", "BE3N9Q"]);
    assert.deepEqual(mergeSpaRoomCodes(memoryStorage(), []), []);
  });
});

describe("spa room HTTP errors", () => {
  it("maps the live room codes and statuses", () => {
    assert.equal(spaRoomProblem(409, "room_full"), "full");
    assert.equal(spaRoomProblem(409, "too_many_rooms"), "too-many");
    assert.equal(spaRoomProblem(409, "already_in_room"), "already-in");
    assert.equal(spaRoomProblem(409, "already_in_a_room"), "already-in");
    assert.equal(spaRoomProblem(409, "room_ended"), "ended");
    assert.equal(spaRoomProblem(null, "room_ended"), "ended");
    assert.equal(spaRoomProblem(409, null), "too-many");
    assert.equal(spaRoomProblem(429, "rate_limited"), "rate");
    assert.equal(spaRoomProblem(404, "room_not_found"), "missing");
    assert.equal(spaRoomProblem(404, null), "missing");
    assert.equal(spaRoomProblem(400, "bad_code"), "bad-code");
    assert.equal(spaRoomProblem(null, "not_a_member"), "member");
    assert.equal(spaRoomProblem(null, "not_joined"), "member");
    assert.equal(spaRoomProblem(null, "not_available"), null);
    assert.equal(shouldRetryRoomJoin("not_a_member", false), true);
    assert.equal(shouldRetryRoomJoin("not_joined", false), true);
    assert.equal(shouldRetryRoomJoin("not_a_member", true), false);
    assert.equal(shouldRetryRoomJoin("room_full", false), false);
  });

  it("reads the room JSON the handler returns", () => {
    const room = readSpaRoom({
      code: "da7k2m",
      cap: 8,
      member_count: 3,
      joined: true,
      owner: false,
      invite_url: "https://dadiary.vn/be-da/phong/DA7K2M",
    });
    assert.equal(room?.code, "DA7K2M");
    assert.equal(room?.memberCount, 3);
    assert.equal(room?.joined, true);
    assert.equal(room?.cap, 8);
    assert.equal(room?.name, "");
    assert.equal(room?.endsAt, null);
    assert.equal(readSpaRoom({ member_count: 1 }), null);
  });

  it("keeps one room for 8 days and reads a 409 already_in_room", () => {
    const created = "2026-11-07T03:00:00.000Z";
    const end = roomEndDate({ createdAt: created });
    assert.equal(end?.toISOString(), "2026-11-15T03:00:00.000Z");
    assert.equal(remainingRoomDays(end!, new Date(created)), 8);
    assert.equal(remainingRoomDays(end!, new Date("2026-11-12T03:00:00.000Z")), 3);
    assert.equal(remainingRoomDays(end!, new Date("2026-11-15T03:00:00.000Z")), 0);
    assert.equal(formatRoomEndDate(end!, "vi"), "15/11/2026");
    assert.match(formatRoomEndDate(end!, "en"), /November 15, 2026/);
    assert.equal(
      oneRoomMessage("DA7K2M", "15/11/2026", "vi"),
      "Bạn đang ở phòng DA7K2M. Mỗi người chỉ ở 1 phòng thôi, phòng kết thúc ngày 15/11/2026 rồi bạn tạo hoặc vào phòng mới nhé.",
    );
    assert.match(oneRoomMessage("DA7K2M", "November 15, 2026", "en"), /1 room/);
    const lock = readAlreadyInRoom({
      success: false,
      error: {
        code: "already_in_room",
        message: "already in a room",
        room: { code: "da7k2m", name: "Phòng trà", ends_at: "2026-11-15T03:00:00.000Z" },
      },
    });
    assert.equal(lock?.code, "DA7K2M");
    assert.equal(lock?.name, "Phòng trà");
    assert.equal(lock?.endsAt, "2026-11-15T03:00:00.000Z");
    const flat = readAlreadyInRoom({
      error: { code: "already_in_room", room_code: "BE3N9Q", ends_at: "2026-11-20T03:00:00.000Z" },
    });
    assert.equal(flat?.code, "BE3N9Q");
    assert.equal(readAlreadyInRoom({ error: { code: "room_full", room_code: "DA7K2M" } }), null);
    const withCreated = readSpaRoom({
      code: "DA7K2M",
      cap: 8,
      member_count: 1,
      created_at: created,
    });
    assert.equal(withCreated?.endsAt, "2026-11-15T03:00:00.000Z");
    assert.equal(
      pickActiveRoom([
        { code: "OLDROOM", createdAt: "2026-10-01T03:00:00.000Z" },
        { code: "DA7K2M", name: "Phòng trà", endsAt: "2026-11-15T03:00:00.000Z" },
      ], Date.parse("2026-11-10T03:00:00.000Z"))?.code,
      "DA7K2M",
    );
    assert.equal(
      pickActiveRoom([{ code: "DA7K2M", endsAt: "2026-11-01T03:00:00.000Z" }], Date.parse("2026-11-10T03:00:00.000Z")),
      null,
    );
    assert.equal(roomShareChoice(true, true), "zalo");
    assert.equal(roomShareChoice(false, true), "web-share");
    assert.equal(roomShareChoice(false, false), "zalo-link");
  });
});

describe("spa room code", () => {
  it("keeps a 6-letter code and the dadiary invite link", () => {
    assert.equal(normalizeRoomCode(" da7k2m "), "DA7K2M");
    assert.equal(normalizeRoomCode("DA7K2"), null);
    assert.equal(normalizeRoomCode("DA7K2O"), null);
    assert.equal(normalizeRoomCode("DA7K20"), null);
    assert.equal(makeRoomCode(() => 0), "AAAAAA");
    assert.equal(roomInviteUrl("DA7K2M"), "https://dadiary.vn/be-da/phong/DA7K2M");
    assert.equal(
      zaloShareUrl(roomInviteUrl("DA7K2M")),
      "https://zalo.me/share?url=https%3A%2F%2Fdadiary.vn%2Fbe-da%2Fphong%2FDA7K2M",
    );
  });
});

describe("spa room seats", () => {
  it("keeps every mockup seat on the floor under the shelves, bed, and sofa", () => {
    assert.equal(SPA_SEATS.length, 7);
    for (const seat of SPA_SEATS) {
      assert.equal(seat.y >= 56, true, seat.id);
      assert.equal(seat.x >= 8 && seat.x <= 92, true, seat.id);
    }
    const back = SPA_SEATS.find((seat) => seat.id === "back");
    const backLeft = SPA_SEATS.find((seat) => seat.id === "back-left");
    const backRight = SPA_SEATS.find((seat) => seat.id === "back-right");
    assert.equal(back?.y, 56);
    assert.equal(backLeft && backLeft.y > 48, true);
    assert.equal(backRight && backRight.y > 48, true);
    const right = SPA_SEATS.find((seat) => seat.id === "right");
    const left = SPA_SEATS.find((seat) => seat.id === "left");
    assert.equal(right && right.x <= 74 && right.x >= 68, true);
    assert.equal(left && right && left.x + right.x === 100, true);
    const xs = SPA_SEATS.map((seat) => seat.x).sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i += 1) {
      assert.equal(xs[i]! - xs[i - 1]! >= 8, true);
    }
  });

  it("sits the sample friends on the mockup seats and leaves three open", () => {
    const guests = sampleSpaGuests(new Set());
    assert.deepEqual(
      guests.map((guest) => guest.nickname),
      ["Trà Sữa", "Mây Hồng", "Ốc Quế", "Bánh Flan"],
    );
    assert.deepEqual(
      guests.map((guest) => guest.seat),
      ["back-left", "back-right", "left", "right"],
    );
    const hidden = sampleSpaGuests(new Set(["tra-sua"]));
    assert.deepEqual(
      hidden.map((guest) => guest.seat),
      ["back-right", "left", "right"],
    );
    assert.equal(spaHeadCount({ live: false, notice: null, serverCount: 0, visibleGuests: 4 }), 5);
    assert.equal(spaHeadCount({ live: false, notice: "missing", serverCount: 0, visibleGuests: 0 }), 1);
    assert.equal(spaHeadCount({ live: true, notice: "full", serverCount: 8, visibleGuests: 7 }), 8);
    assert.equal(
      spaHeadCount({ live: true, notice: null, serverCount: 1, visibleGuests: 0, memberCount: 2 }),
      2,
    );
    assert.equal(spaRoomOnlineCount(1), 1);
    assert.equal(spaRoomOnlineCount(2), 2);
    assert.equal(spaRoomOnlineCount(0), null);
    assert.equal(spaRoomOnlineCount(null), null);
  });

  it("stands guests on their x/y and seats only people who have none yet", () => {
    const seated = seatGuests(
      [
        { ...person(OTHER, "Mây Hồng"), placed: false },
        person(SELF, "Bé Da 4821"),
        { ...person("b7n6m5k4j3h2", "Ốc Quế"), x: 0.22, y: 0.81, facing: "left", placed: true },
      ],
      SELF,
      new Set(),
    );
    assert.equal(seated.some((guest) => guest.id === SELF), false);
    assert.equal(seated.length, 2);
    const waiting = seated.find((guest) => guest.id === OTHER);
    assert.equal(waiting?.seat, "back-left");
    assert.equal(waiting?.x, null);
    assert.equal(waiting?.y, null);
    const walking = seated.find((guest) => guest.id === "b7n6m5k4j3h2");
    assert.equal(walking?.seat, null);
    assert.equal(walking?.x, 0.22);
    assert.equal(walking?.y, 0.81);
    assert.equal(walking?.facing, "left");
  });
});

describe("spa room protocol", () => {
  it("speaks channel room with only fields the hub already accepts", () => {
    const frames = [
      encodeRoomFrame({
        op: "join",
        code: "DA7K2M",
        nickname: "Bé Da 4821",
        outfit: "outfit_pajamas",
        hair: "hair_sleep_buns",
        accessory: "",
        facing: "right",
        action: "idle",
      }),
      encodeRoomFrame({ op: "wave", target: OTHER }),
      encodeRoomFrame({ op: "cheer" }),
      encodeRoomFrame({ op: "poke", target: OTHER }),
      encodeRoomFrame({ op: "compliment", target: OTHER }),
      encodeRoomFrame({ op: "hide", hide: [OTHER, "not-a-session"] }),
      encodeRoomFrame({ op: "leave" }),
      encodeRoomFrame({ op: "move-to", x: 0.22, y: 0.81, facing: "left", action: "walk" }),
    ];
    for (const frame of frames) {
      assert.equal(roomFrameAllowed(frame), true);
      assert.equal(frame.includes("access_token"), false);
      assert.equal(frame.includes("email"), false);
      const json = JSON.parse(frame) as { channel: string; op: string };
      assert.equal(json.channel, "room");
      assert.equal(json.op === "create" || json.op === "get", false);
    }
    const join = JSON.parse(frames[0] ?? "{}") as { op: string; code: string; channel: string };
    assert.equal(join.op, "join");
    assert.equal(join.channel, "room");
    assert.equal(join.code, "DA7K2M");
    const cheer = JSON.parse(frames[2] ?? "{}") as Record<string, unknown>;
    assert.deepEqual(cheer, { v: 1, channel: "room", op: "cheer" });
    const poke = JSON.parse(frames[3] ?? "{}") as Record<string, unknown>;
    assert.deepEqual(poke, { v: 1, channel: "room", op: "poke", target: OTHER });
    const hide = JSON.parse(frames[5] ?? "{}") as { hide: string[] };
    assert.deepEqual(hide.hide, [OTHER]);
    const move = JSON.parse(frames[7] ?? "{}") as { op: string; channel: string; x: number; y: number; facing: string; action: string };
    assert.equal(move.op, "move-to");
    assert.equal(move.channel, "room");
    assert.equal(move.x, 0.22);
    assert.equal(move.y, 0.81);
    assert.equal(move.facing, "left");
    assert.equal(move.action, "walk");
  });

  it("reads hello and treats not_available as the offline room", () => {
    const hello = parseRoomMessage(
      JSON.stringify({
        v: 1,
        channel: "room",
        op: "hello",
        session_id: SELF,
        code: "DA7K2M",
        count: 2,
        cap: 8,
        people: [person(SELF, "Bé Da 4821"), person(OTHER, "Mây Hồng")],
      }),
    );
    assert.equal(hello.op, "hello");
    if (hello.op !== "hello") return;
    assert.equal(hello.code, "DA7K2M");
    assert.equal(hello.people.length, 2);
    assert.equal(hello.people[1]?.placed, true);
    assert.equal(hello.people[1]?.x, 0.5);
    const next = applyRoomMessage(emptyRoom(), hello);
    assert.equal(next.sessionId, SELF);
    assert.equal(next.count, 2);
    const bare = parseRoomMessage(
      JSON.stringify({
        v: 1,
        channel: "room",
        op: "tick",
        count: 2,
        cap: 8,
        upserts: [{ id: OTHER, nickname: "Mây Hồng" }],
        left: [],
        events: [],
      }),
    );
    assert.equal(bare.op, "tick");
    if (bare.op !== "tick") return;
    assert.equal(bare.upserts[0]?.placed, false);
    const kept = applyRoomMessage(next, bare);
    assert.equal(kept.people.find((item) => item.id === OTHER)?.x, 0.5);
    assert.equal(kept.people.find((item) => item.id === OTHER)?.placed, true);
    const moved = applyRoomMessage(
      kept,
      parseRoomMessage(
        JSON.stringify({
          v: 1,
          channel: "room",
          op: "tick",
          count: 2,
          cap: 8,
          upserts: [{ id: OTHER, nickname: "Mây Hồng", x: 0.2, y: 0.7, facing: "left" }],
          left: [],
          events: [],
        }),
      ),
    );
    assert.equal(moved.people.find((item) => item.id === OTHER)?.x, 0.2);
    assert.equal(moved.people.find((item) => item.id === OTHER)?.y, 0.7);

    const offline = parseRoomMessage(
      JSON.stringify({
        v: 1,
        channel: "room",
        op: "error",
        code: "not_available",
        rooms: { status: "not_available", size: 8, code_length: 6, invite_url: "https://dadiary.vn/be-da/phong/{code}" },
      }),
    );
    assert.deepEqual(offline, { op: "error", code: "not_available" });
    assert.equal(
      parseRoomMessage(JSON.stringify({ v: 1, channel: "lobby", op: "hello", session_id: SELF })).op,
      "ignore",
    );
    assert.equal(isRoomMissing("bad_code"), true);
    assert.equal(isRoomFull("room_full"), true);
  });

  it("stops reconnecting when the room channel is not available", () => {
    const clock = fakeClock();
    const sockets: FakeSocket[] = [];
    const statuses: string[] = [];
    const conn = new RoomConnection({
      url: "wss://api.dadiary.vn/api/v1/mascot/lobby/ws",
      now: () => clock.now,
      connect: (url) => {
        assert.equal(url.includes("access_token"), false);
        const socket = new FakeSocket(url);
        sockets.push(socket);
        return socket;
      },
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
      onMessage: () => undefined,
      onStatus: (status) => statuses.push(status),
      random: () => 0,
    });
    conn.start(() => "{\"v\":1,\"channel\":\"room\",\"op\":\"join\",\"code\":\"DA7K2M\"}");
    sockets[0]!.readyState = 1;
    sockets[0]!.onopen?.();
    assert.equal(sockets[0]!.sent[0], "{\"v\":1,\"channel\":\"room\",\"op\":\"join\",\"code\":\"DA7K2M\"}");
    sockets[0]!.onmessage?.({
      data: JSON.stringify({ v: 1, channel: "room", op: "error", code: "not_available" }),
    });
    assert.equal(statuses.at(-1), "sample");
    clock.advance(30_000);
    assert.equal(sockets.length, 1);

    const again = new RoomConnection({
      url: "wss://api.dadiary.vn/api/v1/mascot/lobby/ws",
      now: () => clock.now,
      connect: (url) => {
        const socket = new FakeSocket(url);
        sockets.push(socket);
        return socket;
      },
      setTimer: clock.setTimer,
      clearTimer: clock.clearTimer,
      onMessage: () => undefined,
      onStatus: () => undefined,
      random: () => 0,
    });
    const before = sockets.length;
    again.start(() => "{\"op\":\"join\"}");
    sockets[before]!.onclose?.();
    clock.advance(999);
    assert.equal(sockets.length, before + 1);
    clock.advance(1);
    assert.equal(sockets.length, before + 2);
    const live = sockets.at(-1)!;
    live.readyState = 1;
    again.stop();
    assert.equal(live.sent.some((frame) => frame.includes("\"leave\"")), true);
    const afterStop = sockets.length;
    clock.advance(30_000);
    assert.equal(sockets.length, afterStop);
  });

  it("treats care_streak as optional and ranks ties by name", () => {
    const helloMsg = parseRoomMessage(
      JSON.stringify({
        v: 1,
        channel: "room",
        op: "hello",
        session_id: SELF,
        code: "SPA001",
        count: 2,
        cap: 8,
        people: [
          { id: SELF, nickname: "Bạn", x: 0.5, y: 0.5, facing: "right", action: "idle", outfit: {} },
          { id: OTHER, nickname: "Mây", x: 0.4, y: 0.5, facing: "right", action: "idle", outfit: {}, care_streak: 5 },
        ],
      }),
    );
    assert.equal(helloMsg.op, "hello");
    if (helloMsg.op !== "hello") return;
    assert.equal(helloMsg.people.find((person) => person.id === SELF)?.careStreak, undefined);
    assert.equal(helloMsg.people.find((person) => person.id === OTHER)?.careStreak, 5);
    const hello = applyRoomMessage(emptyRoom(), helloMsg);

    const tick = parseRoomMessage(
      JSON.stringify({
        v: 1,
        channel: "room",
        op: "tick",
        count: 2,
        cap: 8,
        upserts: [{ id: OTHER, nickname: "Mây", x: 0.41, y: 0.5, facing: "right", action: "walk", outfit: {} }],
        left: [],
        events: [],
      }),
    );
    assert.equal(tick.op, "tick");
    if (tick.op !== "tick") return;
    const next = applyRoomMessage(hello, tick);
    assert.equal(next.people.find((person) => person.id === OTHER)?.careStreak, 5);

    const ranked = rankCareStreaks([
      { nickname: "Lan", careStreak: 2 },
      { nickname: "Mây", careStreak: 5 },
      { nickname: "An", careStreak: 5 },
    ]);
    assert.deepEqual(
      ranked.map((row) => row.nickname),
      ["An", "Mây", "Lan"],
    );
    assert.equal(topCareStreak([0, 5, 5]), 5);
    assert.equal(topCareStreak([0, 0]), 0);
    const board = readSpaBoard({ members: [{ nickname: "An", care_streak: 5 }, { nickname: "Lan" }] });
    assert.equal(board?.[1]?.careStreak, 0);
    assert.equal(readSpaBoard({ nope: true }), null);
  });
});

class FakeSocket implements LobbySocketLike {
  sent: string[] = [];
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(readonly url: string) {}
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.readyState = 3;
    this.onclose?.();
  }
}

function fakeClock() {
  let now = 0;
  let next = 1;
  const timers: { id: number; at: number; fn: () => void }[] = [];
  return {
    get now() {
      return now;
    },
    setTimer(fn: () => void, ms: number) {
      const id = next++;
      timers.push({ id, at: now + ms, fn });
      return id;
    },
    clearTimer(id: number) {
      const index = timers.findIndex((timer) => timer.id === id);
      if (index >= 0) timers.splice(index, 1);
    },
    advance(ms: number) {
      const target = now + ms;
      for (;;) {
        const due = timers.filter((timer) => timer.at <= target).sort((a, b) => a.at - b.at)[0];
        if (!due) break;
        const index = timers.findIndex((timer) => timer.id === due.id);
        timers.splice(index, 1);
        now = due.at;
        due.fn();
      }
      now = target;
    },
  };
}
