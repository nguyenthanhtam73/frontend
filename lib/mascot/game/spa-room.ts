import type { GameClipId, GameHairId, GameLook, GameOutfitId, GamePose } from "@/lib/mascot/game/look";
import { lobbyCoord, lobbyLook, lobbyPose, isSessionId, type LobbyFacing, type WirePerson } from "@/lib/mascot/game/lobby-live";
import { SPA_BOUNDS, clamp, type Bounds } from "@/lib/mascot/game/walk";

/**
 * 8-person spa room (phòng nhóm).
 *
 * Same WebSocket as the lobby: `/api/v1/mascot/lobby/ws`.
 * Frames use `channel: "room"` and only fields the hub already accepts
 * (`v`, `channel`, `op`, `code`, `nickname`, `outfit`, `hair`, `accessory`,
 * `x`, `y`, `facing`, `action`, `target`, `hide`). Gestures are `wave`,
 * `heart`, `cheer`, and `poke`. There is no text field. A socket `join` works only after
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
/** One room stays open this many days, then the person can create or join another. */
export const SPA_ROOM_LIFE_DAYS = 8;
export const ROOM_TIME_ZONE = "Asia/Ho_Chi_Minh";
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
  "gender",
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

/**
 * Fill order. Feet stay on the floor and the rug, under the bottle shelves,
 * the bed, and the sofa. The middle stays open for the person already in the room.
 */
export const SPA_SEATS: readonly SpaSeat[] = [
  { id: "back-left", x: 14, y: 64, scale: 0.82 },
  { id: "back-right", x: 86, y: 64, scale: 0.82 },
  { id: "left", x: 28, y: 76, scale: 0.9 },
  { id: "right", x: 72, y: 76, scale: 0.9 },
  { id: "front-left", x: 30, y: 92, scale: 0.96 },
  { id: "front-right", x: 70, y: 92, scale: 0.96 },
  { id: "back", x: 50, y: 56, scale: 0.72 },
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
  /** Landscape plate width fraction from the slot table. Portrait leaves this unset. */
  foot?: number;
  facing: LobbyFacing;
  outfit: GameOutfitId;
  hair: GameHairId;
  clip: GameLook["clip"];
  /** Male visitors use the drawn boy hair and pajamas. */
  gender?: "male";
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

/** Pixel size of `public/mascot/rooms/spa-room.webp`. The plate is taller than it is wide. */
export const SPA_PLATE_WIDTH = 780;
export const SPA_PLATE_HEIGHT = 1387;

/** Landscape plate `public/mascot/rooms/spa-room-landscape.webp`. */
export const SPA_LANDSCAPE_WIDTH = 1600;
export const SPA_LANDSCAPE_HEIGHT = 1000;
/** Free frame wider than this uses the landscape plate. */
export const SPA_LANDSCAPE_ASPECT = 1.2;

/**
 * Eight foot slots on the 1600×1000 plate. `w` is the Bé Da frame width in plate pixels.
 * «Bạn» stands on front-3. Keep this table in sync with the CapCut slots file.
 */
export const SPA_SEATS_LANDSCAPE = [
  { id: "back-1", row: "back" as const, x: 410, y: 700, w: 244 },
  { id: "front-1", row: "front" as const, x: 255, y: 935, w: 264 },
  { id: "back-2", row: "back" as const, x: 720, y: 700, w: 244 },
  { id: "front-2", row: "front" as const, x: 565, y: 935, w: 264 },
  { id: "back-3", row: "back" as const, x: 1030, y: 700, w: 244 },
  { id: "front-3", row: "front" as const, x: 875, y: 935, w: 264 },
  { id: "back-4", row: "back" as const, x: 1340, y: 700, w: 244 },
  { id: "front-4", row: "front" as const, x: 1185, y: 935, w: 264 },
] as const;

/** The drawn anchor is the bottom of the figure plus its name. Slots are the feet, so drop by the tag. */
export const SPA_LANDSCAPE_NAME_DROP = 50;

export const SPA_LANDSCAPE_SELF_SLOT = "front-3";

/** Walkable floor on the landscape plate: x 180–1420, y 660–950. */
export const SPA_LANDSCAPE_BOUNDS: Bounds = {
  minX: 180 / SPA_LANDSCAPE_WIDTH,
  maxX: 1420 / SPA_LANDSCAPE_WIDTH,
  minY: 660 / SPA_LANDSCAPE_HEIGHT,
  maxY: 950 / SPA_LANDSCAPE_HEIGHT,
};

export type SpaPlateFit = {
  width: number;
  height: number;
  landscape: boolean;
};

/**
 * Largest plate that fits the free rectangle without cropping the picture.
 * A wide frame (aspect ≥ 1.2) uses the 1600×1000 landscape plate. Anything
 * taller uses the portrait plate, whole.
 */
export function fitSpaPlate(availWidth: number, availHeight: number, landscape?: boolean): SpaPlateFit {
  const availW = Number.isFinite(availWidth) ? Math.max(0, availWidth) : 0;
  const availH = Number.isFinite(availHeight) ? Math.max(0, availHeight) : 0;
  if (availW === 0 || availH === 0) return { width: 0, height: 0, landscape: false };
  const wide = landscape ?? availW / availH >= SPA_LANDSCAPE_ASPECT;
  const aspect = wide ? SPA_LANDSCAPE_WIDTH / SPA_LANDSCAPE_HEIGHT : SPA_PLATE_WIDTH / SPA_PLATE_HEIGHT;
  const width = Math.min(availW, availH * aspect);
  return { width, height: width / aspect, landscape: wide };
}

/** True when a tick adds or removes a member, so the header should reread member_count. */
export function spaMembershipChanged(
  tick: { upserts: readonly { id: string }[]; left: readonly string[]; events: readonly { op: string }[] },
  previousIds: ReadonlySet<string>,
): boolean {
  if (tick.left.length > 0) return true;
  if (tick.events.some((event) => event.op === "join" || event.op === "leave")) return true;
  return tick.upserts.some((person) => !previousIds.has(person.id));
}

/** Nearer feet paint in front. A 0.001 change in y separates the two spa rows. */
export function spaStackZ(y: number): number {
  if (!Number.isFinite(y)) return 0;
  return Math.round(y * 1000);
}

export type SpaNotice =
  | "full"
  | "missing"
  | "bad-code"
  | "name"
  | "rate"
  | "too-many"
  | "already-in"
  | "ended"
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
      gender?: "male";
      facing: LobbyFacing;
      action: "idle";
    }
  | { op: "leave" }
  | { op: "wave" | "heart" | "cheer" | "poke"; target?: string }
  | { op: "compliment"; target: string }
  | { op: "hide"; hide: string[] }
  | { op: "move-to"; x: number; y: number; facing?: LobbyFacing; action?: "idle" | "walk" };

export type RoomEvent = {
  op: "join" | "leave" | "wave" | "heart" | "compliment" | "cheer" | "poke" | "nudge" | "tree_watered" | "tree_level_up";
  id?: string;
  from?: string;
  target?: string;
  /** Server sentence on a nudge. Gestures never carry text. */
  message?: string;
  /** Set on tree_watered and tree_level_up. Display name, no account id. */
  tree?: {
    name: string;
    waters: number;
    required: number;
    progress: number;
    stage: number;
    treeType: string;
  };
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

const ROOM_LIFE_MS = SPA_ROOM_LIFE_DAYS * 24 * 60 * 60 * 1000;

/** The one open room this account is still in. */
export type RoomClock = {
  code: string;
  /** Shown in the one-room sentence. The code, when the server sent no name. */
  name: string;
  /** ISO end. Null when the server did not say when the room closes. */
  endsAt: string | null;
};

function parseIso(value: string | null | undefined): Date | null {
  if (!value || !value.trim()) return null;
  const at = Date.parse(value);
  if (!Number.isFinite(at)) return null;
  return new Date(at);
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

/** Explicit end, or created_at plus 8 days. */
export function roomEndDate(input: { endsAt?: string | null; createdAt?: string | null }): Date | null {
  const explicit = parseIso(input.endsAt);
  if (explicit) return explicit;
  const created = parseIso(input.createdAt);
  if (!created) return null;
  return new Date(created.getTime() + ROOM_LIFE_MS);
}

/** Days still left, from 8 down to 0. A partial day counts as one until the end instant. */
export function remainingRoomDays(endsAt: Date, now: Date): number {
  const left = endsAt.getTime() - now.getTime();
  if (left <= 0) return 0;
  return Math.min(SPA_ROOM_LIFE_DAYS, Math.ceil(left / (24 * 60 * 60 * 1000)));
}

export function formatRoomEndDate(endsAt: Date, locale: string): string {
  const vi = locale.toLowerCase().startsWith("vi");
  return new Intl.DateTimeFormat(vi ? "vi-VN" : "en-US", {
    timeZone: ROOM_TIME_ZONE,
    day: "numeric",
    month: vi ? "numeric" : "long",
    year: "numeric",
  }).format(endsAt);
}

export function oneRoomMessage(name: string, dateLabel: string, locale: string): string {
  const room = name.trim();
  if (locale.toLowerCase().startsWith("vi")) {
    return `Bạn đang ở phòng ${room}. Mỗi người chỉ ở 1 phòng thôi, phòng kết thúc ngày ${dateLabel} rồi bạn tạo hoặc vào phòng mới nhé.`;
  }
  return `You are in room ${room}. Each person can only be in 1 room. The room ends on ${dateLabel}, then you can create or join a new one.`;
}

function readClockRow(row: unknown): RoomClock | null {
  if (!row || typeof row !== "object") return null;
  const rec = row as Record<string, unknown>;
  const rawCode = typeof rec.room_code === "string" ? rec.room_code : typeof rec.code === "string" ? rec.code : "";
  const code = normalizeRoomCode(rawCode);
  if (!code) return null;
  const name = firstText(rec.name, rec.room_name, rec.title) ?? code;
  const end = roomEndDate({
    endsAt: firstText(rec.ends_at, rec.end_at, rec.ends_on, rec.end_time, rec.expires_at),
    createdAt: firstText(rec.created_at),
  });
  return { code, name, endsAt: end ? end.toISOString() : null };
}

/** 409 body whose code is already_in_room, plus the room the person is already in. */
export function readAlreadyInRoom(payload: unknown): RoomClock | null {
  if (!payload || typeof payload !== "object") return null;
  const body = payload as Record<string, unknown>;
  const error = body.error && typeof body.error === "object" ? (body.error as Record<string, unknown>) : null;
  const code = firstText(error?.code, body.code) ?? "";
  if (!isAlreadyInRoomCode(code)) return null;
  const nested =
    readClockRow(error?.room) ??
    readClockRow(error?.current_room) ??
    readClockRow(body.data) ??
    readClockRow(body.room);
  if (nested) return nested;
  if (!error) return null;
  return readClockRow({
    room_code: error.room_code ?? error.current_code,
    name: firstText(error.room_name, error.name),
    ends_at: firstText(error.ends_at, error.end_at, error.ends_on, error.end_time),
    created_at: firstText(error.created_at),
  });
}

/** The open room to keep. A room whose end has passed is ignored. */
export function pickActiveRoom(
  rooms: readonly { code: string; name?: string; endsAt?: string | null; createdAt?: string | null }[],
  now = Date.now(),
): RoomClock | null {
  const open: { clock: RoomClock; end: number }[] = [];
  for (const room of rooms) {
    const code = normalizeRoomCode(room.code);
    if (!code) continue;
    const end = roomEndDate({ endsAt: room.endsAt ?? null, createdAt: room.createdAt ?? null });
    if (end && end.getTime() <= now) continue;
    const name = (room.name ?? "").trim() || code;
    open.push({
      clock: { code, name, endsAt: end ? end.toISOString() : null },
      end: end ? end.getTime() : Number.POSITIVE_INFINITY,
    });
  }
  if (open.length === 0) return null;
  open.sort((a, b) => b.end - a.end);
  return open[0]!.clock;
}

/** Zalo share first. Web Share only when that window did not open. */
export function roomShareChoice(zaloOpened: boolean, canWebShare: boolean): "zalo" | "web-share" | "zalo-link" {
  if (zaloOpened) return "zalo";
  if (canWebShare) return "web-share";
  return "zalo-link";
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

/** How long a real room may stay on «Đang vào phòng…» before we offer Thử lại. */
export const SPA_ENTRY_TIMEOUT_MS = 10_000;

const ENTRY_ERRORS = new Set<Exclude<SpaNotice, null>>(["offline", "missing", "bad-code", "member", "rate"]);

/**
 * Once the room has been entered, a later socket drop or the 10s timer
 * must not replace the room with the entry error. Only the first wait can.
 */
export function spaEntryPhase(input: {
  live: boolean;
  entered?: boolean;
  timedOut: boolean;
  notice: SpaNotice;
}): "loading" | "room" | "error" {
  if (input.entered || input.live) return "room";
  if (input.notice === "full" || input.notice === "ended" || input.notice === "already-in") return "room";
  if (input.timedOut || (input.notice != null && ENTRY_ERRORS.has(input.notice))) return "error";
  return "loading";
}

/** Membership ends only when the person confirms «Rời phòng». */
export function spaMembershipEnds(reason: "retry" | "unmount" | "explicit"): boolean {
  return reason === "explicit";
}

/** People to draw. Sample friends exist only when there is no room code. */
export function spaRoomGuests(input: {
  code: string | null;
  live: boolean;
  notice: SpaNotice;
  previewCount: number | null;
  people: readonly WirePerson[];
  selfId: string | null;
  hidden: ReadonlySet<string>;
  poses?: Readonly<Record<string, GamePose | null | undefined>>;
  landscape?: boolean;
}): SpaGuest[] {
  if (input.code) {
    if (!input.live) return [];
    return seatGuests(input.people, input.selfId, input.hidden, input.poses, input.landscape === true);
  }
  if (input.notice != null || input.previewCount != null) return [];
  return sampleSpaGuests(input.hidden, input.poses);
}

const SPA_STACK_EPS = 0.02;

function clampSpaPoint(point: { x: number; y: number }): { x: number; y: number } {
  return {
    x: clamp(point.x, SPA_BOUNDS.minX, SPA_BOUNDS.maxX),
    y: clamp(point.y, SPA_BOUNDS.minY, SPA_BOUNDS.maxY),
  };
}

/**
 * Members who join on the same floor point get a stable spread so one Bé Da
 * does not cover the next. Two or three stay on one row. Four or more use two
 * staggered rows: the back row is 0.08 above the anchor, the front row is 0.03
 * below it and half a step to the side, so back faces sit in the gaps.
 * A point that has already moved stays put. Every result stays inside the floor.
 */
export type SpaSpreadOptions = { landscape?: boolean; selfId?: string | null };

function landscapeNorm(slot: (typeof SPA_SEATS_LANDSCAPE)[number]): { x: number; y: number; foot: number } {
  return {
    x: slot.x / SPA_LANDSCAPE_WIDTH,
    y: Math.min(0.99, (slot.y + SPA_LANDSCAPE_NAME_DROP) / SPA_LANDSCAPE_HEIGHT),
    foot: slot.w / SPA_LANDSCAPE_WIDTH,
  };
}

function clampLandscape(point: { x: number; y: number }): { x: number; y: number } {
  return {
    x: clamp(point.x, SPA_LANDSCAPE_BOUNDS.minX, SPA_LANDSCAPE_BOUNDS.maxX),
    y: clamp(point.y, SPA_LANDSCAPE_BOUNDS.minY, SPA_LANDSCAPE_BOUNDS.maxY),
  };
}

/** Stacked members, and anyone still on the shared spawn, stand on the landscape slots. */
function spreadLandscapeFeet(
  groups: { anchor: { x: number; y: number }; members: { id: string; x: number; y: number }[] }[],
  selfId: string | null,
): Map<string, { x: number; y: number; foot?: number }> {
  const out = new Map<string, { x: number; y: number; foot?: number }>();
  const waiting: string[] = [];
  for (const group of groups) {
    const stacked = group.members.length >= 2 || Math.hypot(group.anchor.x - 0.5, group.anchor.y - 0.7) < 0.03;
    if (!stacked) {
      for (const person of group.members) out.set(person.id, clampLandscape(person));
      continue;
    }
    waiting.push(...group.members.map((person) => person.id));
  }
  const selfSlot = landscapeNorm(SPA_SEATS_LANDSCAPE.find((slot) => slot.id === SPA_LANDSCAPE_SELF_SLOT)!);
  const rest = SPA_SEATS_LANDSCAPE.filter((slot) => slot.id !== SPA_LANDSCAPE_SELF_SLOT)
    .slice()
    .sort((a, b) => a.x - b.x)
    .map(landscapeNorm);
  let index = 0;
  for (const id of waiting) {
    if (id === selfId) {
      out.set(id, selfSlot);
      continue;
    }
    out.set(id, rest[index] ?? selfSlot);
    index += 1;
  }
  return out;
}

export function spreadSpaFeet(
  people: readonly { id: string; x: number; y: number }[],
  options: SpaSpreadOptions = {},
): Map<string, { x: number; y: number; foot?: number }> {
  const sorted = [...people].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const groups: { anchor: { x: number; y: number }; members: typeof sorted }[] = [];
  for (const person of sorted) {
    const group = groups.find((item) => Math.hypot(item.anchor.x - person.x, item.anchor.y - person.y) < SPA_STACK_EPS);
    if (group) group.members.push(person);
    else groups.push({ anchor: { x: person.x, y: person.y }, members: [person] });
  }
  if (options.landscape) return spreadLandscapeFeet(groups, options.selfId ?? null);
  const out = new Map<string, { x: number; y: number; foot?: number }>();
  const span = SPA_BOUNDS.maxX - SPA_BOUNDS.minX;
  for (const group of groups) {
    if (group.members.length < 2) {
      const only = group.members[0]!;
      out.set(only.id, { x: only.x, y: only.y });
      continue;
    }
    const count = group.members.length;
    if (count < 4) {
      const step = Math.min(0.12, span / count);
      group.members.forEach((person, index) => {
        const shift = (index - (count - 1) / 2) * step;
        const lift = index % 2 === 0 ? -0.03 : 0.025;
        out.set(person.id, clampSpaPoint({ x: group.anchor.x + shift, y: group.anchor.y + lift }));
      });
      continue;
    }
    const perRow = Math.ceil(count / 2);
    // 0.20 clears the front-row heads, including Bạn at 1.24×, and stays inside the floor.
    const backY = clamp(group.anchor.y - 0.20, SPA_BOUNDS.minY, SPA_BOUNDS.maxY);
    const frontY = clamp(group.anchor.y + 0.03, SPA_BOUNDS.minY, SPA_BOUNDS.maxY);
    const slots = [
      ...portraitLine(perRow).map((x) => ({ x, y: backY })),
      ...portraitLine(count - perRow).map((x) => ({ x, y: frontY })),
    ];
    const members = [...group.members];
    const selfAt = options.selfId ? members.findIndex((person) => person.id === options.selfId) : -1;
    if (selfAt >= 0) {
      const self = members.splice(selfAt, 1)[0]!;
      let frontSlot = perRow;
      let nearest = Infinity;
      for (let index = perRow; index < slots.length; index += 1) {
        const distance = Math.abs(slots[index]!.x - 0.5);
        if (distance < nearest) {
          nearest = distance;
          frontSlot = index;
        }
      }
      const seated: ({ id: string } | undefined)[] = new Array(slots.length);
      seated[frontSlot] = self;
      let cursor = 0;
      for (const person of members) {
        while (seated[cursor]) cursor += 1;
        seated[cursor] = person;
        cursor += 1;
      }
      seated.forEach((person, index) => {
        if (person) out.set(person.id, slots[index]!);
      });
    } else {
      members.forEach((person, index) => {
        const slot = slots[index];
        if (slot) out.set(person.id, slot);
      });
    }
  }
  return out;
}

/** Even feet from the left safe edge to the right safe edge. One person stands in the middle. */
function portraitLine(count: number): number[] {
  if (count <= 1) return [(SPA_BOUNDS.minX + SPA_BOUNDS.maxX) / 2];
  const step = (SPA_BOUNDS.maxX - SPA_BOUNDS.minX) / (count - 1);
  return Array.from({ length: count }, (_, index) => SPA_BOUNDS.minX + index * step);
}

/** Widest a 12px name pill may be before it runs into the next person on the same row. */
export const SPA_TAG_MAX_PX = 152;
const SPA_TAG_ROW_EPS = 0.03;
const SPA_TAG_GAP_PX = 6;

export type SpaPillBox = {
  id: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
  maxWidth: number;
};

/**
 * Maximum on-screen rect of each name pill. Width is the gap to the nearest
 * person on the same row, capped at 9.5rem, so two pills cannot meet.
 * `top`/`bottom` use a 22px pill whose bottom sits on the foot anchor.
 */
export function spaNamePillBoxes(
  people: readonly { id: string; x: number; y: number }[],
  plateWidth: number,
  plateHeight: number,
): SpaPillBox[] {
  const width = Number.isFinite(plateWidth) ? Math.max(0, plateWidth) : 0;
  const height = Number.isFinite(plateHeight) ? Math.max(0, plateHeight) : 0;
  const pillHeight = 22;
  return people.map((person) => {
    let budget = SPA_TAG_MAX_PX;
    for (const other of people) {
      if (other.id === person.id || Math.abs(other.y - person.y) >= SPA_TAG_ROW_EPS) continue;
      const distance = Math.abs(other.x - person.x) * width;
      budget = Math.min(budget, Math.max(0, distance - SPA_TAG_GAP_PX));
    }
    const center = person.x * width;
    const bottom = person.y * height;
    return {
      id: person.id,
      left: center - budget / 2,
      right: center + budget / 2,
      top: bottom - pillHeight,
      bottom,
      maxWidth: budget,
    };
  });
}

/** Real people, skipping you and anyone you hid. A guest with x/y stands there. */
export function seatGuests(
  people: readonly WirePerson[],
  selfId: string | null,
  hidden: ReadonlySet<string>,
  poses: Readonly<Record<string, GamePose | null | undefined>> = {},
  landscape = false,
): SpaGuest[] {
  const others = people.filter((person) => person.id !== selfId && !hidden.has(person.id));
  others.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const spots = spreadSpaFeet(
    people.filter((person) => person.placed !== false).map((person) => ({ id: person.id, x: person.x, y: person.y })),
    { landscape, selfId },
  );
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
      x: standing ? spots.get(person.id)?.x ?? person.x : null,
      y: standing ? spots.get(person.id)?.y ?? person.y : null,
      ...(standing && spots.get(person.id)?.foot != null ? { foot: spots.get(person.id)?.foot } : {}),
      facing: person.facing,
      outfit: look.outfit,
      hair: look.hair,
      clip: look.clip,
      ...(person.gender === "male" ? { gender: "male" as const } : {}),
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
  /** API member_count. Wins over the live presence count. */
  memberCount?: number | null;
}): number {
  if (input.memberCount != null && Number.isFinite(input.memberCount)) {
    return Math.min(SPA_ROOM_CAP, Math.max(0, Math.round(input.memberCount)));
  }
  if (input.notice === "full") return SPA_ROOM_CAP;
  if (input.live) return Math.min(SPA_ROOM_CAP, Math.max(0, Math.round(input.serverCount)));
  if (input.previewCount != null && input.notice == null) {
    return Math.min(SPA_ROOM_CAP, Math.max(0, Math.round(input.previewCount)));
  }
  if (input.notice != null) return 1;
  return Math.min(SPA_ROOM_CAP, input.visibleGuests + 1);
}

/**
 * Live presence shown beside the member total.
 * Hidden at 0. Still shown when it matches the member total.
 */
export function spaRoomOnlineCount(online: number | null | undefined): number | null {
  if (online == null || !Number.isFinite(online)) return null;
  const count = Math.round(online);
  if (count <= 0) return null;
  return Math.min(SPA_ROOM_CAP, count);
}

/**
 * Map a room HTTP status or a socket error code onto a short notice.
 * `not_available` stays null so the sample spa can remain.
 * 409 is `room_full`, `too_many_rooms`, `already_in_room`, or `room_ended` by code.
 * A socket error uses the same code with no HTTP status.
 * 404 is a missing room. 429 is `rate_limited`.
 */
export function isAlreadyInRoomCode(code: string | null | undefined): boolean {
  return code === "already_in_room" || code === "already_in_a_room";
}

export function spaRoomProblem(status: number | null, code: string | null): Exclude<SpaNotice, null> | null {
  const name = code ?? "";
  if (name === "room_full" || name === "full") return "full";
  if (name === "too_many_rooms") return "too-many";
  if (isAlreadyInRoomCode(name)) return "already-in";
  if (name === "room_ended" || name === "ended") return "ended";
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
      if (frame.gender === "male") base.gender = "male";
      break;
    case "wave":
    case "heart":
    case "cheer":
    case "poke":
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
    ...(row.gender === "male" ? { gender: "male" as const } : {}),
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

function readTreeEvent(value: unknown): RoomEvent["tree"] | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const stage = num(row.stage);
  if (stage == null || stage < 1 || stage > 7) return null;
  const progress = num(row.progress);
  const name = typeof row.name === "string" ? row.name.trim().slice(0, 40) : "";
  return {
    name,
    waters: Math.max(0, Math.trunc(num(row.waters) ?? 0)),
    required: Math.max(0, Math.trunc(num(row.required) ?? 0)),
    progress: progress == null ? 0 : Math.max(0, progress),
    stage: Math.trunc(stage),
    treeType: typeof row.tree_type === "string" && row.tree_type.trim() ? row.tree_type.trim().slice(0, 64) : "leaf",
  };
}

function readEvents(value: unknown): RoomEvent[] {
  if (!Array.isArray(value)) return [];
  const out: RoomEvent[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const op = row.op;
    if (op === "tree_watered" || op === "tree_level_up") {
      const tree = readTreeEvent(row.tree);
      if (!tree) continue;
      out.push({ op, tree });
      continue;
    }
    if (
      op !== "join" &&
      op !== "leave" &&
      op !== "wave" &&
      op !== "heart" &&
      op !== "compliment" &&
      op !== "cheer" &&
      op !== "poke" &&
      op !== "nudge"
    ) {
      continue;
    }
    const message =
      op === "nudge" && typeof row.message === "string" ? row.message.trim().slice(0, 240) : "";
    out.push({
      op,
      id: typeof row.id === "string" ? row.id : undefined,
      from: typeof row.from === "string" ? row.from : undefined,
      target: typeof row.target === "string" ? row.target : undefined,
      ...(message ? { message } : {}),
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
