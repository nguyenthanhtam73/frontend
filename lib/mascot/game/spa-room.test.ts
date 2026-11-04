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
  roomInviteUrl,
  sampleSpaGuests,
  seatGuests,
  shouldRetryRoomJoin,
  spaHeadCount,
  spaRoomProblem,
  zaloShareUrl,
} from "@/lib/mascot/game/spa-room";
import { readSpaRoom } from "@/lib/mascot/game/spa-room-api";

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

describe("spa room HTTP errors", () => {
  it("maps the live room codes and statuses", () => {
    assert.equal(spaRoomProblem(409, "room_full"), "full");
    assert.equal(spaRoomProblem(409, "too_many_rooms"), "too-many");
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
    assert.equal(readSpaRoom({ member_count: 1 }), null);
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
    const hide = JSON.parse(frames[3] ?? "{}") as { hide: string[] };
    assert.deepEqual(hide.hide, [OTHER]);
    const move = JSON.parse(frames[5] ?? "{}") as { op: string; channel: string; x: number; y: number; facing: string; action: string };
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
