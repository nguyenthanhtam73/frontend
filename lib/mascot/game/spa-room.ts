import type { GameClipId, GameHairId, GameOutfitId, GamePose } from "@/lib/mascot/game/look";
import { lobbyCoord, lobbyLook, lobbyPose, isSessionId, type LobbyFacing, type WirePerson } from "@/lib/mascot/game/lobby-live";

/**
 * 8-person spa room (phòng nhóm).
 *
 * Same WebSocket as the lobby: `/api/v1/mascot/lobby/ws`.
 * Frames use `channel: "room"` and only fields the hub already accepts
 * (`v`, `channel`, `op`, `code`, `nickname`, `outfit`, `hair`, `accessory`,
 * `x`, `y`, `facing`, `action`, `target`, `hide`). A socket `join` works only after
 * REST membership. `not_available` still falls back to the sample room.
 *
 * Membership is REST, not a socket op:
 * - POST /api/v1/mascot/rooms creates a room and returns `code`
 * - GET  /api/v1/mascot/rooms/:code reads member_count before sitting
 * - POST /api/v1/mascot/rooms/:code/join sits down (a second join is a no-op)
 * - POST /api/v1/mascot/rooms/:code/leave stands up
 *
 * The socket only accepts channel "room" op `join` after that membership.
 * `not_a_member` means the REST join has not landed yet. There is no
 * socket `create` or `get`.
 *
 * Server replies use `channel: "room"`:
 * - `hello` — you are in. `session_id`, `code`, `count`, `cap`, `people`
 * - `tick` — `upserts`, `left`, `events`, `count`, `cap`
 * - `error` — `not_a_member`, `not_joined`, `room_full`, `room_not_found`,
 *   `rate_limited`, `not_available`
 *
 * Invite links are always `https://dadiary.vn/be-da/phong/<CODE>`.
 * No level, points, email, or chat goes on the wire.
 */

export const SPA_ROOM_CAP = 8;
export const SPA_ROOM_CODE_LENGTH = 6;
/** No 0/O or 1/I, so a code read aloud is hard to mix up. */
export const SPA_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const SPA_INVITE_ORIGIN = "https://dadiary.vn";
export const SPA_TAB_KEY = "beda-spa-tab";
export const SPA_HIDE_KEY = "beda-spa-hide";

const WIRE_KEYS = new Set([
  "v",
  "channel",
  "op",
  "nickname",
  "outfit",
  "hair",
  "accessory",
  "x",
  "y",
  "facing",
  "action",
  "target",
  "hide",
  "code",
]);

export type SpaSeatId =
  | "back-left"
  | "back-right"
  | "left"
  | "right"
  | "front-left"
  | "front-right"
  | "back";

export type SpaSeat = {
  id: SpaSeatId;
  /** Percent across the stage. */
  x: number;
  /** Percent down the stage. Feet sit on this line. */
  y: number;
  scale: number;
};

/** Fill order. The first four are the seats in the spa mockup. The last three stay open. */
export const SPA_SEATS: readonly SpaSeat[] = [
  { id: "back-left", x: 32, y: 50, scale: 0.86 },
  { id: "back-right", x: 68, y: 50, scale: 0.86 },
  { id: "left", x: 14, y: 66, scale: 0.94 },
  { id: "right", x: 86, y: 66, scale: 0.94 },
  { id: "front-left", x: 34, y: 78, scale: 1 },
  { id: "front-right", x: 66, y: 78, scale: 1 },
  { id: "back", x: 50, y: 30, scale: 0.7 },
];

export const SPA_YOU = { id: "you" as const, x: 50, y: 92, scale: 1.24 };

const SPA_SAMPLE: readonly {
  id: string;
  nickname: string;
  outfit: GameOutfitId;
  hair: GameHairId;
  clip: GameClipId | null;
}[] = [
  { id: "tra-sua", nickname: "Trà Sữa", outfit: "outfit_ao_dai", hair: "hair_twin_tails", clip: null },
  { id: "may-hong", nickname: "Mây Hồng", outfit: "outfit_vay_hoa", hair: "hair_sleep_buns", clip: "accessory_flower_clip" },
  { id: "oc-que", nickname: "Ốc Quế", outfit: "outfit_hoodie", hair: "hair_short_bob", clip: null },
  { id: "banh-flan", nickname: "Bánh Flan", outfit: "outfit_pajamas", hair: "hair_twin_tails", clip: "accessory_ribbon_bow" },
];

export type SpaGuest = {
  id: string;
  nickname: string;
  /** Set only when this guest has no x/y yet and is sitting in a mockup seat. */
  seat: SpaSeatId | null;
  /** 0..1 across the stage. Null until the server sends a position. */
  x: number | null;
  /** 0..1 down the stage, at the feet. Null until the server sends a position. */
  y: number | null;
  facing: LobbyFacing;
  outfit: GameOutfitId;
  hair: GameHairId;
  clip: GameClipId | null;
  pose: GamePose | null;
  sample: boolean;
  /** Omitted or 0 means no flame. */
  careStreak?: number;
};

export type SpaBoardRow = { nickname: string; careStreak: number };

/** Highest streak above zero. Ties share it. Zero never wins a crown. */
export function topCareStreak(values: readonly (number | undefined)[]): number {
  let top = 0;
  for (const value of values) {
    if (value != null && value > top) top = value;
  }
  return top;
}

export function careStreakOf(value: number | undefined): number {
  if (value == null || !Number.isFinite(value) || value <= 0) return 0;
  return Math.min(9999, Math.floor(value));
}

/** Board order: higher streak first, then nickname. */
export function rankCareStreaks(rows: readonly SpaBoardRow[]): SpaBoardRow[] {
  return [...rows]
    .map((row) => ({ nickname: row.nickname.trim(), careStreak: careStreakOf(row.careStreak) }))
    .filter((row) => row.nickname.length > 0)
    .sort((a, b) => b.careStreak - a.careStreak || a.nickname.localeCompare(b.nickname, "vi"));
}

/** Accepts `{ members | people | board: [{ nickname, care_streak }] }` or a bare list. */
export function readSpaBoard(data: unknown): SpaBoardRow[] | null {
  const record = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  const list = Array.isArray(data)
    ? data
    : record
      ? record.members ?? record.people ?? record.board
      : null;
  if (!Array.isArray(list)) return null;
  const rows: SpaBoardRow[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const nickname = typeof row.nickname === "string" ? row.nickname.trim() : "";
    if (!nickname) continue;
    const raw = row.care_streak;
    const careStreak =
      typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? Math.min(9999, Math.floor(raw)) : 0;
    rows.push({ nickname, careStreak });
  }
  return rankCareStreaks(rows);
}

/** Nearer feet (larger y) draw a little bigger. y is 0..1 on the stage. */
export function spaFootScale(y: number): number {
  const t = Math.min(1, Math.max(0, y));
  return 0.7 + t * 0.54;
}

export type SpaNotice =
  | "full"
  | "missing"
  | "bad-code"
  | "name"
  | "rate"
  | "too-many"
  | "member"
  | "offline"
  | null;

export type RoomClientFrame =
  | {
      op: "join";
      code: string;
      nickname: string;
      outfit: string;
      hair: string;
      accessory: string;
      facing: LobbyFacing;
      action: "idle";
    }
  | { op: "leave" }
  | { op: "wave" | "heart"; target?: string }
  | { op: "compliment"; target: string }
  | { op: "hide"; hide: string[] }
  | { op: "move-to"; x: number; y: number; facing?: LobbyFacing; action?: "idle" | "walk" };

export type RoomEvent = {
  op: "join" | "leave" | "wave" | "heart" | "compliment";
  id?: string;
  from?: string;
  target?: string;
};

export type RoomServerMessage =
  | { op: "hello"; sessionId: string; code: string; count: number; cap: number; people: WirePerson[] }
  | { op: "room"; code: string; count: number; cap: number; people: WirePerson[] }
  | { op: "tick"; count: number; cap: number; upserts: WirePerson[]; left: string[]; events: RoomEvent[] }
  | { op: "error"; code: string }
  | { op: "bye" }
  | { op: "replaced" }
  | { op: "ignore" };

export type RoomSnapshot = {
  sessionId: string | null;
  code: string;
  count: number;
  cap: number;
  people: WirePerson[];
};

export function emptyRoom(code = ""): RoomSnapshot {
  return { sessionId: null, code, count: 0, cap: SPA_ROOM_CAP, people: [] };
}

export function normalizeRoomCode(raw: string): string | null {
  const code = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (code.length !== SPA_ROOM_CODE_LENGTH) return null;
  for (const char of code) {
    if (!SPA_CODE_ALPHABET.includes(char)) return null;
  }
  return code;
}

export function makeRoomCode(random: () => number = Math.random): string {
  let code = "";
  const size = SPA_CODE_ALPHABET.length;
  for (let i = 0; i < SPA_ROOM_CODE_LENGTH; i++) {
    const roll = random();
    const unit = Number.isFinite(roll) ? Math.min(0.999999, Math.max(0, roll)) : 0;
    code += SPA_CODE_ALPHABET[Math.floor(unit * size)] ?? "A";
  }
  return code;
}

export function roomInvitePath(code: string): string {
  return `/be-da/phong/${code}`;
}

export function roomInviteUrl(code: string): string {
  return `${SPA_INVITE_ORIGIN}${roomInvitePath(code)}`;
}

/** Zalo's share sheet. The link is the invite, not a chat message. */
export function zaloShareUrl(inviteUrl: string): string {
  return `https://zalo.me/share?url=${encodeURIComponent(inviteUrl)}`;
}

export function sampleSpaGuests(
  hidden: ReadonlySet<string>,
  poses: Readonly<Record<string, GamePose | null | undefined>> = {},
): SpaGuest[] {
  const guests: SpaGuest[] = [];
  SPA_SAMPLE.forEach((friend, index) => {
    if (hidden.has(friend.id)) return;
    const seat = SPA_SEATS[index];
    if (!seat) return;
    guests.push({
      id: friend.id,
      nickname: friend.nickname,
      seat: seat.id,
      x: null,
      y: null,
      facing: "right",
      outfit: friend.outfit,
      hair: friend.hair,
      clip: friend.clip,
      pose: poses[friend.id] ?? null,
      sample: true,
    });
  });
  return guests;
}

/** Real people, skipping you and anyone you hid. A guest with x/y stands there. */
export function seatGuests(
  people: readonly WirePerson[],
  selfId: string | null,
  hidden: ReadonlySet<string>,
  poses: Readonly<Record<string, GamePose | null | undefined>> = {},
): SpaGuest[] {
  const others = people.filter((person) => person.id !== selfId && !hidden.has(person.id));
  others.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const guests: SpaGuest[] = [];
  let seatIndex = 0;
  for (const person of others) {
    const look = lobbyLook(person.outfit, person.hair, person.accessory);
    const standing = person.placed !== false;
    const seat = standing ? null : SPA_SEATS[seatIndex] ?? null;
    if (!standing) seatIndex += 1;
    if (!standing && !seat) continue;
    guests.push({
      id: person.id,
      nickname: person.nickname,
      seat: seat?.id ?? null,
      x: standing ? person.x : null,
      y: standing ? person.y : null,
      facing: person.facing,
      outfit: look.outfit,
      hair: look.hair,
      clip: look.clip,
      pose: poses[person.id] ?? lobbyPose(person.action),
      sample: false,
      careStreak: person.careStreak,
    });
  }
  return guests;
}

export function spaHeadCount(input: {
  live: boolean;
  notice: SpaNotice;
  serverCount: number;
  visibleGuests: number;
  /** Member count from GET or POST join, before the socket hello. */
  previewCount?: number | null;
}): number {
  if (input.notice === "full") return SPA_ROOM_CAP;
  if (input.live) return Math.min(SPA_ROOM_CAP, Math.max(0, Math.round(input.serverCount)));
  if (input.previewCount != null && input.notice == null) {
    return Math.min(SPA_ROOM_CAP, Math.max(0, Math.round(input.previewCount)));
  }
  if (input.notice != null) return 1;
  return Math.min(SPA_ROOM_CAP, input.visibleGuests + 1);
}

/**
 * Map a room HTTP status or a socket error code onto a short notice.
 * `not_available` stays null so the sample spa can remain.
 * 409 is `room_full` or `too_many_rooms` by code. 404 is a missing room.
 * 429 is `rate_limited`.
 */
export function spaRoomProblem(status: number | null, code: string | null): Exclude<SpaNotice, null> | null {
  const name = code ?? "";
  if (name === "room_full" || name === "full") return "full";
  if (name === "too_many_rooms") return "too-many";
  if (name === "rate_limited") return "rate";
  if (name === "room_not_found" || name === "not_found" || name === "unknown_room") return "missing";
  if (name === "bad_code") return "bad-code";
  if (name === "not_a_member" || name === "not_joined") return "member";
  if (name === "nickname_rejected") return "name";
  if (name === "not_available") return null;
  if (status === 404) return "missing";
  if (status === 400) return "bad-code";
  if (status === 429) return "rate";
  if (status === 409) return "too-many";
  if (status != null && status >= 500) return "offline";
  if (status == null && (name === "" || name === "bad_message" || name === "unavailable")) return "offline";
  return null;
}

/** One REST join, then one more socket join. A second `not_a_member` stops. */
export function shouldRetryRoomJoin(code: string, alreadyRetried: boolean): boolean {
  if (alreadyRetried) return false;
  return code === "not_a_member" || code === "not_joined";
}

export function encodeRoomFrame(frame: RoomClientFrame): string {
  const base: Record<string, unknown> = { v: 1, channel: "room", op: frame.op };
  switch (frame.op) {
    case "join":
      base.code = frame.code;
      base.nickname = frame.nickname;
      base.outfit = frame.outfit;
      base.hair = frame.hair;
      base.accessory = frame.accessory;
      base.facing = frame.facing;
      base.action = frame.action;
      break;
    case "wave":
    case "heart":
      if (frame.target && isSessionId(frame.target)) base.target = frame.target;
      break;
    case "compliment":
      if (isSessionId(frame.target)) base.target = frame.target;
      break;
    case "hide":
      base.hide = frame.hide.filter(isSessionId).slice(0, 64);
      break;
    case "move-to":
      base.x = lobbyCoord(frame.x);
      base.y = lobbyCoord(frame.y);
      if (frame.facing) base.facing = frame.facing;
      if (frame.action) base.action = frame.action;
      break;
    case "leave":
      break;
    default:
      break;
  }
  return JSON.stringify(base);
}

export function roomFrameKeys(raw: string): string[] {
  const json = JSON.parse(raw) as Record<string, unknown>;
  return Object.keys(json);
}

export function roomFrameAllowed(raw: string): boolean {
  return roomFrameKeys(raw).every((key) => WIRE_KEYS.has(key));
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readPerson(value: unknown): WirePerson | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || !isSessionId(row.id)) return null;
  if (typeof row.nickname !== "string" || row.nickname.length < 1 || row.nickname.length > 24) return null;
  const x = num(row.x);
  const y = num(row.y);
  const placed = x != null && y != null;
  const person: WirePerson = {
    id: row.id,
    nickname: row.nickname,
    outfit: typeof row.outfit === "string" ? row.outfit : "",
    hair: typeof row.hair === "string" ? row.hair : "",
    accessory: typeof row.accessory === "string" ? row.accessory : "",
    x: placed ? lobbyCoord(x) : 0,
    y: placed ? lobbyCoord(y) : 0,
    facing: row.facing === "left" ? "left" : "right",
    action: typeof row.action === "string" ? row.action : "idle",
    placed,
  };
  const careStreak = readCareStreak(row.care_streak);
  if (careStreak != null) person.careStreak = careStreak;
  return person;
}

function readCareStreak(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return undefined;
  return Math.min(9999, Math.floor(value));
}

function readPeople(value: unknown): WirePerson[] {
  if (!Array.isArray(value)) return [];
  return value.map(readPerson).filter((person): person is WirePerson => person != null);
}

function readEvents(value: unknown): RoomEvent[] {
  if (!Array.isArray(value)) return [];
  const out: RoomEvent[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const op = row.op;
    if (op !== "join" && op !== "leave" && op !== "wave" && op !== "heart" && op !== "compliment") continue;
    out.push({
      op,
      id: typeof row.id === "string" ? row.id : undefined,
      from: typeof row.from === "string" ? row.from : undefined,
      target: typeof row.target === "string" ? row.target : undefined,
    });
  }
  return out;
}

export function parseRoomMessage(raw: string): RoomServerMessage {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { op: "ignore" };
  }
  if (!json || typeof json !== "object") return { op: "ignore" };
  const row = json as Record<string, unknown>;
  if (typeof row.channel === "string" && row.channel !== "room") return { op: "ignore" };
  const code = typeof row.code === "string" ? normalizeRoomCode(row.code) ?? "" : "";
  switch (row.op) {
    case "hello":
      return {
        op: "hello",
        sessionId: typeof row.session_id === "string" ? row.session_id : "",
        code,
        count: num(row.count) ?? 0,
        cap: num(row.cap) ?? SPA_ROOM_CAP,
        people: readPeople(row.people),
      };
    case "room":
    case "get":
      return {
        op: "room",
        code,
        count: num(row.count) ?? readPeople(row.people).length,
        cap: num(row.cap) ?? SPA_ROOM_CAP,
        people: readPeople(row.people),
      };
    case "tick":
      return {
        op: "tick",
        count: num(row.count) ?? 0,
        cap: num(row.cap) ?? SPA_ROOM_CAP,
        upserts: readPeople(row.upserts),
        left: Array.isArray(row.left) ? row.left.filter((id): id is string => typeof id === "string") : [],
        events: readEvents(row.events),
      };
    case "error":
      return { op: "error", code: typeof row.code === "string" ? row.code : "bad_message" };
    case "bye":
      return { op: "bye" };
    case "replaced":
      return { op: "replaced" };
    default:
      return { op: "ignore" };
  }
}

export function applyRoomMessage(state: RoomSnapshot, message: RoomServerMessage): RoomSnapshot {
  if (message.op === "hello") {
    return {
      sessionId: message.sessionId || state.sessionId,
      code: message.code || state.code,
      count: message.count,
      cap: message.cap || SPA_ROOM_CAP,
      people: message.people,
    };
  }
  if (message.op === "room") {
    return {
      ...state,
      code: message.code || state.code,
      count: message.count,
      cap: message.cap || SPA_ROOM_CAP,
      people: message.people,
    };
  }
  if (message.op === "tick") {
    const byId = new Map(state.people.map((person) => [person.id, person]));
    for (const id of message.left) byId.delete(id);
    for (const person of message.upserts) {
      const prev = byId.get(person.id);
      const kept = person.careStreak == null && prev?.careStreak != null ? prev.careStreak : person.careStreak;
      const next = { ...person, ...(kept != null ? { careStreak: kept } : {}) };
      if (person.placed === false && prev?.placed) {
        byId.set(person.id, { ...next, x: prev.x, y: prev.y, facing: prev.facing, placed: true });
      } else {
        byId.set(person.id, next);
      }
    }
    const people = [...byId.values()];
    return {
      ...state,
      count: message.count || people.length,
      cap: message.cap || state.cap,
      people,
    };
  }
  if (message.op === "bye" || message.op === "replaced") {
    return { ...state, sessionId: null, people: [], count: 0 };
  }
  return state;
}

export function isRoomMissing(code: string): boolean {
  return code === "bad_code" || code === "room_not_found" || code === "not_found" || code === "unknown_room";
}

export function isRoomFull(code: string): boolean {
  return code === "room_full" || code === "full";
}
