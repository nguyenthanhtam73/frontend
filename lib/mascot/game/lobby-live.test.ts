import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SAMPLE_LOBBY_FRIENDS } from "@/lib/mascot/game/lobby";
import { LobbyConnection, type LobbySocketLike } from "@/lib/mascot/game/lobby-socket";
import {
  LOBBY_ACCESS_COOKIE,
  LOBBY_CAP,
  LOBBY_COOKIE_NOT_SENT,
  LobbyOutbox,
  applyLobbyMessage,
  clearLobbyAccessCookie,
  emptyHall,
  encodeLobbyFrame,
  hallIsFull,
  hallOccupancy,
  lobbyAccessCookie,
  lobbyActors,
  lobbyCookiePlan,
  lobbyLook,
  lobbySocketUrl,
  nextOpenHall,
  defaultLobbyNickname,
  loadLobbyNickname,
  normalizeNickname,
  parseLobbyMessage,
  reconnectDelayMs,
  sampleWander,
} from "@/lib/mascot/game/lobby-live";

const SELF = "k3m8p2q9w4xn";
const OTHER = "a9b8c7d6e5f4";

function person(id: string, x = 0.4) {
  return {
    id,
    nickname: "Mây Hồng",
    outfit: "outfit_ao_dai",
    hair: "hair_twin_tails",
    accessory: "accessory_flower_clip",
    x,
    y: 0.7,
    facing: "right" as const,
    action: "idle",
  };
}

describe("lobby socket url and cookie", () => {
  it("never puts the access token in the WebSocket URL", () => {
    const url = lobbySocketUrl("https://api.dadiary.vn/ignored?access_token=secret-token");
    assert.equal(url, "wss://api.dadiary.vn/api/v1/mascot/lobby/ws");
    assert.equal(url.includes("access_token"), false);
    assert.equal(url.includes("secret"), false);
    assert.equal(new URL(url).search, "");
  });

  it("sends a SameSite=Lax cookie from dadiary.vn to api.dadiary.vn", () => {
    const plan = lobbyCookiePlan("dadiary.vn", "https:", "api.dadiary.vn");
    assert.equal(plan.ok, true);
    if (!plan.ok) return;
    assert.equal(plan.domain, "dadiary.vn");
    assert.equal(plan.sameSite, "Lax");
    assert.equal(plan.secure, true);
    assert.equal(plan.reason, "same-site");
    const cookie = lobbyAccessCookie("header.payload.sig", plan, 600);
    assert.match(cookie, new RegExp(`^${LOBBY_ACCESS_COOKIE}=`));
    assert.match(cookie, /Domain=dadiary\.vn/);
    assert.match(cookie, /SameSite=Lax/);
    assert.match(cookie, /Secure/);
    assert.match(cookie, /Path=\//);
    assert.equal(cookie.includes("?"), false);
    assert.equal(cookie.includes("?access_token"), false);
    const cleared = clearLobbyAccessCookie(plan);
    assert.match(cleared, /Max-Age=0/);
    assert.match(cleared, /Domain=dadiary\.vn/);
  });

  it("does not pretend a preview or localhost page can cookie api.dadiary.vn", () => {
    for (const page of ["localhost", "frontend-git-preview.vercel.app", "example.com"]) {
      const plan = lobbyCookiePlan(page, "https:", "api.dadiary.vn");
      assert.equal(plan.ok, false, page);
      if (!plan.ok) assert.equal(plan.reason, "cookie-not-sent");
    }
    assert.match(LOBBY_COOKIE_NOT_SENT, /does not put the token in the query string/);
    assert.match(LOBBY_COOKIE_NOT_SENT, /Domain=dadiary\.vn/);
  });

  it("uses a host-only cookie when the page and the API are the same host", () => {
    const plan = lobbyCookiePlan("localhost", "http:", "localhost");
    assert.equal(plan.ok, true);
    if (!plan.ok) return;
    assert.equal(plan.domain, null);
    assert.equal(plan.secure, false);
    const cookie = lobbyAccessCookie("abc.def.ghi", plan, 60);
    assert.equal(cookie.includes("Domain="), false);
    assert.equal(cookie.includes("Secure"), false);
    assert.match(cookie, /SameSite=Lax/);
  });
});

describe("lobby nickname", () => {
  it("trims, collapses spaces, and rejects junk", () => {
    assert.equal(normalizeNickname("  Mây   Hồng "), "Mây Hồng");
    assert.equal(normalizeNickname("Bé Da 4821"), "Bé Da 4821");
    assert.equal(normalizeNickname(""), null);
    assert.equal(normalizeNickname("a".repeat(25)), null);
    assert.equal(normalizeNickname("hello@mail"), null);
    assert.equal(normalizeNickname("a_b"), null);
  });

  it("makes Bé Da plus four digits once and keeps a rename", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };
    const profileName = "Nguyễn An";
    store.set("display_name", profileName);
    const at = (n: number) => () => (n + 0.1) / 10000;
    const first = loadLobbyNickname(storage, at(4821));
    assert.equal(first, "Bé Da 4821");
    assert.equal(store.get("beda-lobby-nickname"), "Bé Da 4821");
    assert.equal(first.includes(profileName), false);
    assert.equal(defaultLobbyNickname(at(0)), "Bé Da 0000");
    assert.equal(defaultLobbyNickname(at(9999)), "Bé Da 9999");
    const again = loadLobbyNickname(storage, () => 0.1111);
    assert.equal(again, "Bé Da 4821");
    store.set("beda-lobby-nickname", "Mây Hồng");
    assert.equal(loadLobbyNickname(storage, () => 0.2222), "Mây Hồng");
  });
});

describe("lobby crowd", () => {
  it("keeps sample visitors until real people fill the hall", () => {
    const alone = lobbyActors({ live: false, people: [], selfId: null, hidden: new Set(), poses: {} });
    assert.equal(alone.length, SAMPLE_LOBBY_FRIENDS.length);
    assert.equal(alone.length + 1 <= LOBBY_CAP, true);
    assert.equal(alone.every((actor) => actor.sample), true);

    const ids = Array.from({ length: 11 }, (_, index) => {
      const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
      return alphabet[index % alphabet.length]!.repeat(12);
    });
    const few = lobbyActors({
      live: true,
      people: [person(SELF, 0.2), ...ids.map((id, index) => person(id, 0.3 + index * 0.01))],
      selfId: SELF,
      hidden: new Set(),
      poses: {},
    });
    const real = few.filter((actor) => !actor.sample);
    const samples = few.filter((actor) => actor.sample);
    assert.equal(real.length, 11);
    assert.equal(samples.length, 16);
    assert.equal(real.length + samples.length + 1, LOBBY_CAP);

    const packed = lobbyActors({
      live: true,
      people: [person(SELF), ...Array.from({ length: 27 }, (_, index) => person(`${"abcdefghjkmnpqrstuvwxyz23456789"[index % 31]}${"23456789abcdefgh"[index % 16]}`.padEnd(12, "a").slice(0, 12)))],
      selfId: SELF,
      hidden: new Set(),
      poses: {},
    });
    assert.equal(packed.filter((actor) => actor.sample).length, 0);
    assert.equal(packed.length + 1 <= LOBBY_CAP, true);
  });

  it("drops a hidden friend and still caps the scene at 28", () => {
    const hidden = new Set<string>(["keo-deo", OTHER]);
    const actors = lobbyActors({
      live: true,
      people: [person(SELF), person(OTHER)],
      selfId: SELF,
      hidden,
      poses: {},
    });
    assert.equal(actors.some((actor) => actor.id === "keo-deo"), false);
    assert.equal(actors.some((actor) => actor.id === OTHER), false);
    assert.equal(actors.length + 1 <= LOBBY_CAP, true);
  });

  it("wears the wired outfit and falls back when the id is unknown", () => {
    assert.deepEqual(lobbyLook("outfit_hoodie", "hair_short_bob", ""), {
      outfit: "outfit_hoodie",
      hair: "hair_short_bob",
      clip: null,
    });
    assert.equal(lobbyLook("outfit_nope", "hair_nope", "hat").outfit, "outfit_pajamas");
  });

  it("walks a sample visitor inside the band", () => {
    const start = sampleWander("keo-deo", 0, 0.6, 0.74);
    const later = sampleWander("keo-deo", 4000, 0.6, 0.74);
    assert.ok(start.x >= 0.04 && start.x <= 0.96);
    assert.ok(start.y >= 0.48 && start.y <= 0.88);
    assert.ok(Math.abs(start.x - later.x) + Math.abs(start.y - later.y) > 0);
  });
});

describe("lobby protocol", () => {
  it("parses hello, tick, and nickname rejection", () => {
    const hello = parseLobbyMessage(
      JSON.stringify({
        v: 1,
        channel: "lobby",
        op: "hello",
        session_id: SELF,
        lobby: 1,
        cap: 28,
        counts: [{ lobby: 1, count: 2, cap: 28, label: "Sảnh 1 · 2/28" }],
        people: [person(SELF), person(OTHER, 0.8)],
      }),
    );
    assert.equal(hello.op, "hello");
    if (hello.op !== "hello") return;
    assert.equal(hello.people.length, 2);
    let state = applyLobbyMessage(emptyHall(), hello);
    assert.equal(hallOccupancy(state, true, 18).count, 2);
    assert.equal(hallIsFull(state, true), false);

    const tick = parseLobbyMessage(
      JSON.stringify({
        op: "tick",
        lobby: 1,
        counts: [{ lobby: 1, count: 1, cap: 28 }],
        upserts: [{ ...person(OTHER, 0.55), action: "wave" }],
        left: [SELF],
        events: [{ op: "wave", from: OTHER, target: SELF }],
      }),
    );
    state = applyLobbyMessage(state, tick);
    assert.equal(state.people.length, 1);
    assert.equal(state.people[0]?.x, 0.55);
    assert.equal(state.people[0]?.action, "wave");

    const rejected = parseLobbyMessage(JSON.stringify({ op: "error", code: "nickname_rejected" }));
    assert.deepEqual(rejected, { op: "error", code: "nickname_rejected" });
  });

  it("marks the hall full and offers the next one", () => {
    let state = applyLobbyMessage(emptyHall(), {
      op: "hello",
      sessionId: SELF,
      lobby: 1,
      cap: 28,
      counts: [{ lobby: 1, count: 28, cap: 28 }],
      people: [],
    });
    assert.equal(hallIsFull(state, true), true);
    assert.equal(nextOpenHall(state, true), 2);
    state = applyLobbyMessage(state, { op: "lobby_full", lobby: 0, count: 28, cap: 28 });
    assert.equal(nextOpenHall(state, true), null);
    assert.deepEqual(hallOccupancy(state, false, 18), { lobby: 1, count: 18, cap: 28 });
  });

  it("encodes join and emotes without extra fields", () => {
    const raw = encodeLobbyFrame({
      op: "join",
      nickname: "Mây Hồng",
      outfit: "outfit_ao_dai",
      hair: "hair_twin_tails",
      accessory: "",
      x: 0.46129,
      y: 0.7,
      facing: "right",
      action: "idle",
      hide: ["not-a-session", OTHER],
    });
    const json = JSON.parse(raw) as Record<string, unknown>;
    assert.deepEqual(Object.keys(json).sort(), [
      "accessory",
      "action",
      "channel",
      "facing",
      "hair",
      "hide",
      "nickname",
      "op",
      "outfit",
      "v",
      "x",
      "y",
    ]);
    assert.equal(json.x, 0.4613);
    assert.deepEqual(json.hide, [OTHER]);
    assert.equal(raw.includes("access_token"), false);
    const wave = JSON.parse(encodeLobbyFrame({ op: "wave", target: OTHER })) as { target: string; op: string };
    assert.equal(wave.op, "wave");
    assert.equal(wave.target, OTHER);
    const leave = JSON.parse(encodeLobbyFrame({ op: "leave" })) as { op: string };
    assert.equal(leave.op, "leave");
  });
});

describe("lobby send cap", () => {
  it("sends at most two frames in a rolling second and keeps the latest move", () => {
    const box = new LobbyOutbox();
    box.enqueue("wave", "{\"op\":\"wave\"}");
    box.enqueue("move-to", "{\"x\":0.1}");
    box.enqueue("move-to", "{\"x\":0.2}");
    box.enqueue("heart", "{\"op\":\"heart\"}");
    const first = box.take(1_000);
    assert.deepEqual(first, ["{\"op\":\"wave\"}", "{\"x\":0.2}"]);
    assert.ok(box.waitMs(1_000) >= 1000);
    assert.deepEqual(box.take(1_000), []);
    assert.deepEqual(box.take(2_010), ["{\"op\":\"heart\"}"]);
  });

  it("backs off and stops after leave or replaced", () => {
    assert.equal(reconnectDelayMs(0), 1000);
    assert.equal(reconnectDelayMs(1), 2000);
    assert.equal(reconnectDelayMs(2), 4000);
    assert.equal(reconnectDelayMs(8), 30_000);

    const clock = fakeClock();
    const sockets: FakeSocket[] = [];
    const statuses: string[] = [];
    const conn = new LobbyConnection({
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
    conn.start(() => encodeLobbyFrame({
      op: "join",
      nickname: "Bé Da",
      outfit: "outfit_pajamas",
      hair: "hair_sleep_buns",
      accessory: "",
      x: 0.46,
      y: 0.78,
      facing: "right",
      action: "idle",
    }));
    assert.equal(sockets.length, 1);
    sockets[0]!.readyState = 1;
    sockets[0]!.onopen?.();
    const join = JSON.parse(sockets[0]!.sent[0] ?? "{}") as { op: string };
    assert.equal(join.op, "join");
    sockets[0]!.onmessage?.({
      data: JSON.stringify({ op: "hello", session_id: SELF, lobby: 1, cap: 28, counts: [], people: [] }),
    });
    assert.equal(statuses.at(-1), "live");

    sockets[0]!.onclose?.();
    assert.equal(statuses.at(-1), "sample");
    assert.equal(sockets.length, 1);
    clock.advance(1000);
    assert.equal(sockets.length, 2);

    sockets[1]!.readyState = 1;
    sockets[1]!.onopen?.();
    sockets[1]!.onmessage?.({ data: JSON.stringify({ op: "replaced" }) });
    const before = sockets.length;
    clock.advance(30_000);
    assert.equal(sockets.length, before);

    conn.stop();
    assert.equal(sockets.at(-1)?.sent.at(-1)?.includes("\"leave\""), true);
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
