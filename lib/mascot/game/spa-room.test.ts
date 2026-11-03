import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { WirePerson } from "@/lib/mascot/game/lobby-live";
import type { LobbySocketLike } from "@/lib/mascot/game/lobby-socket";
import { RoomConnection } from "@/lib/mascot/game/spa-room-socket";
import {
  applyRoomMessage,
  emptyRoom,
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
  spaHeadCount,
  zaloShareUrl,
} from "@/lib/mascot/game/spa-room";

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

  it("gives real people seats and skips you", () => {
    const seated = seatGuests(
      [person(OTHER, "Mây Hồng"), person(SELF, "Bé Da 4821"), person("b7n6m5k4j3h2", "Ốc Quế")],
      SELF,
      new Set(),
    );
    assert.equal(seated.some((guest) => guest.id === SELF), false);
    assert.equal(seated.length, 2);
    assert.equal(seated[0]?.seat, "back-left");
  });
});

describe("spa room protocol", () => {
  it("speaks channel room with only fields the hub already accepts", () => {
    const frames = [
      encodeRoomFrame({
        op: "create",
        code: "DA7K2M",
        nickname: "Bé Da 4821",
        outfit: "outfit_pajamas",
        hair: "hair_sleep_buns",
        accessory: "",
        facing: "right",
        action: "idle",
      }),
      encodeRoomFrame({ op: "get", code: "DA7K2M" }),
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
    ];
    for (const frame of frames) {
      assert.equal(roomFrameAllowed(frame), true);
      assert.equal(frame.includes("access_token"), false);
      assert.equal(frame.includes("email"), false);
      const json = JSON.parse(frame) as { channel: string };
      assert.equal(json.channel, "room");
    }
    const hide = JSON.parse(frames[5] ?? "{}") as { hide: string[] };
    assert.deepEqual(hide.hide, [OTHER]);
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
    const next = applyRoomMessage(emptyRoom(), hello);
    assert.equal(next.sessionId, SELF);
    assert.equal(next.count, 2);

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
    });
    conn.start("get", (op) => (op === "get" ? "{\"op\":\"get\"}" : "{\"op\":\"join\"}"));
    sockets[0]!.readyState = 1;
    sockets[0]!.onopen?.();
    assert.equal(sockets[0]!.sent[0], "{\"op\":\"get\"}");
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
    });
    const before = sockets.length;
    again.start("create", () => "{\"op\":\"create\"}");
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
