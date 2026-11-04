import type { GameLook, GamePose } from "@/lib/mascot/game/look";
import { isGameClip, isGameHair, isGameOutfit } from "@/lib/mascot/game/look";
import {
  clampLobbyPoint,
  lobbySpawnForId,
  SAMPLE_LOBBY_FRIENDS,
  type SampleLobbyFriend,
} from "@/lib/mascot/game/lobby";

/**
 * Bé Da shared lobby, client side.
 *
 * The browser WebSocket API cannot set Authorization. The access JWT already
 * lives in localStorage (`dadiary_access_token`). This module copies it into
 * a cookie of the same name only when that cookie will actually be attached
 * to the handshake. It never puts the token in the URL.
 *
 * https://dadiary.vn → wss://api.dadiary.vn is schemeful same-site (registrable
 * domain dadiary.vn, both https). SameSite=Lax is sent on same-site requests,
 * including a WebSocket upgrade. A host-only cookie set on dadiary.vn is NOT
 * sent to api.dadiary.vn, so the cookie uses Domain=dadiary.vn.
 *
 * A page on another site (a Vercel preview, or localhost talking to
 * api.dadiary.vn) cannot set Domain=dadiary.vn. A host-only cookie there is
 * not sent to the API host. The lobby stays on sample visitors. It does not
 * fall back to ?access_token=.
 */

export const LOBBY_WS_PATH = "/api/v1/mascot/lobby/ws";
export const LOBBY_ACCESS_COOKIE = "dadiary_access_token";
export const LOBBY_SITE = "dadiary.vn";
export const LOBBY_CAP = 28;
export const LOBBY_NICKNAME_KEY = "beda-lobby-nickname";
/** Prefix only. A device nickname is this plus four digits, never a profile name. */
export const LOBBY_NICKNAME_PREFIX = "Bé Da";

export const LOBBY_COOKIE_NOT_SENT =
  "dadiary_access_token is not sent on this WebSocket. SameSite=Lax covers same-site requests from dadiary.vn to api.dadiary.vn only when the cookie uses Domain=dadiary.vn. This page cannot set that domain, and the client does not put the token in the query string.";

const SEND_LIMIT = 2;
const SEND_WINDOW_MS = 1000;
const SESSION_ID = /^[abcdefghjkmnpqrstuvwxyz23456789]{12}$/;

export type LobbyFacing = "left" | "right";

export type WirePerson = {
  id: string;
  nickname: string;
  outfit: string;
  hair: string;
  accessory: string;
  x: number;
  y: number;
  facing: LobbyFacing;
  action: string;
  /**
   * Room guests only. False when this update had no x/y, so the spa keeps
   * the last spot or a seat. Lobby people always have a position.
   */
  placed?: boolean;
  /** Room only. Missing until the server sends `care_streak`. */
  careStreak?: number;
};

export type LobbyCount = { lobby: number; count: number; cap: number };

export type LobbyEvent = {
  op: "join" | "leave" | "wave" | "heart" | "compliment";
  id?: string;
  from?: string;
  target?: string;
};

export type LobbyServerMessage =
  | {
      op: "hello";
      sessionId: string;
      lobby: number;
      cap: number;
      counts: LobbyCount[];
      people: WirePerson[];
    }
  | {
      op: "tick";
      lobby: number;
      counts: LobbyCount[];
      upserts: WirePerson[];
      left: string[];
      events: LobbyEvent[];
    }
  | { op: "lobby_full"; lobby: number; count: number; cap: number }
  | { op: "error"; code: string }
  | { op: "bye" }
  | { op: "replaced" }
  | { op: "ignore" };

export type HallSnapshot = {
  sessionId: string | null;
  lobby: number;
  cap: number;
  counts: LobbyCount[];
  people: WirePerson[];
  /** Hall number from the latest lobby_full. 0 means every hall is full. */
  fullLobby: number | null;
};

export type LobbyClientFrame =
  | {
      op: "join";
      nickname: string;
      outfit: string;
      hair: string;
      accessory: string;
      x: number;
      y: number;
      facing: LobbyFacing;
      action: "idle" | "walk" | "wave" | "heart" | "compliment";
      lobby?: number;
      hide?: string[];
    }
  | { op: "move-to"; x: number; y: number; facing?: LobbyFacing; action?: "idle" | "walk" }
  | { op: "wave"; target?: string }
  | { op: "heart"; target?: string }
  | { op: "compliment"; target: string }
  | { op: "switch"; lobby: number }
  | { op: "hide"; hide: string[] }
  | { op: "leave" };

export type LobbyCookiePlan =
  | { ok: true; domain: string | null; sameSite: "Lax"; secure: boolean; reason: "same-host" | "same-site" }
  | { ok: false; reason: "cookie-not-sent" };

export function emptyHall(): HallSnapshot {
  return { sessionId: null, lobby: 1, cap: LOBBY_CAP, counts: [], people: [], fullLobby: null };
}

export function isSessionId(id: string): boolean {
  return SESSION_ID.test(id);
}

export function lobbyCoord(n: number): number {
  if (!Number.isFinite(n)) return 0.5;
  const clamped = Math.min(1, Math.max(0, n));
  return Math.round(clamped * 10000) / 10000;
}

/** WebSocket URL for the API origin. The query string is always empty. */
export function lobbySocketUrl(apiBase: string): string {
  const base = new URL(apiBase.includes("://") ? apiBase : `http://${apiBase}`);
  const protocol = base.protocol === "https:" ? "wss:" : "ws:";
  const url = new URL(LOBBY_WS_PATH, `${protocol}//${base.host}`);
  url.search = "";
  url.hash = "";
  return url.href;
}

function bareHost(host: string): string {
  return host.trim().toLowerCase().replace(/\.$/, "");
}

function onDadiary(host: string): boolean {
  return host === LOBBY_SITE || host.endsWith(`.${LOBBY_SITE}`);
}

/**
 * Decide whether the page can hand the API a cookie the browser will attach.
 * `pageProtocol` is `https:` or `http:`. Hosts are hostnames, without ports.
 */
export function lobbyCookiePlan(pageHost: string, pageProtocol: string, apiHost: string): LobbyCookiePlan {
  const page = bareHost(pageHost);
  const api = bareHost(apiHost);
  const https = pageProtocol === "https:" || pageProtocol === "wss:";
  if (!page || !api) return { ok: false, reason: "cookie-not-sent" };
  if (page === api) {
    return { ok: true, domain: null, sameSite: "Lax", secure: https, reason: "same-host" };
  }
  if (https && onDadiary(page) && onDadiary(api)) {
    return { ok: true, domain: LOBBY_SITE, sameSite: "Lax", secure: true, reason: "same-site" };
  }
  return { ok: false, reason: "cookie-not-sent" };
}

export function lobbyCookieMaxAge(token: string, nowMs: number): number {
  const exp = readExpMs(token);
  if (exp == null) return 30 * 60;
  const sec = Math.floor((exp - nowMs) / 1000);
  if (sec < 30) return 30;
  return Math.min(sec, 12 * 60 * 60);
}

/** Cookie attributes for document.cookie. The value is the access JWT, never a URL. */
export function lobbyAccessCookie(token: string, plan: Extract<LobbyCookiePlan, { ok: true }>, maxAgeSec: number): string {
  const parts = [
    `${LOBBY_ACCESS_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    `Max-Age=${Math.max(0, Math.floor(maxAgeSec))}`,
    "SameSite=Lax",
  ];
  if (plan.domain) parts.push(`Domain=${plan.domain}`);
  if (plan.secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearLobbyAccessCookie(plan: Extract<LobbyCookiePlan, { ok: true }>): string {
  return lobbyAccessCookie("", plan, 0);
}

function readExpMs(token: string): number | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const json = JSON.parse(atob(padded)) as { exp?: number };
    if (typeof json.exp !== "number") return null;
    return json.exp * 1000;
  } catch {
    return null;
  }
}

/** 1–24 letters, numbers, spaces, apostrophe, hyphen, or period. Profanity is the server's check. */
export function normalizeNickname(raw: string): string | null {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (trimmed.length < 1 || trimmed.length > 24) return null;
  if (/[^\p{L}\p{N} '.\-]/u.test(trimmed)) return null;
  return trimmed;
}

/** Four digits, 0000–9999. `random` returns a value in [0, 1). */
export function lobbyNicknameDigits(random: () => number = Math.random): string {
  const n = Math.min(9999, Math.max(0, Math.floor(random() * 10000)));
  return String(n).padStart(4, "0");
}

/** `Bé Da 4821`. Does not read a profile display name. */
export function defaultLobbyNickname(random: () => number = Math.random): string {
  return `${LOBBY_NICKNAME_PREFIX} ${lobbyNicknameDigits(random)}`;
}

/**
 * The nickname saved on this device. Generated once. A later rename replaces it.
 * Storage is only `beda-lobby-nickname` — never a profile display name.
 */
export function loadLobbyNickname(
  storage: Pick<Storage, "getItem" | "setItem">,
  random: () => number = Math.random,
): string {
  const saved = storage.getItem(LOBBY_NICKNAME_KEY);
  const existing = saved ? normalizeNickname(saved) : null;
  if (existing) return existing;
  const next = defaultLobbyNickname(random);
  storage.setItem(LOBBY_NICKNAME_KEY, next);
  return next;
}

export function encodeLobbyFrame(frame: LobbyClientFrame): string {
  const base: Record<string, unknown> = { v: 1, channel: "lobby", op: frame.op };
  switch (frame.op) {
    case "join": {
      base.nickname = frame.nickname;
      base.outfit = frame.outfit;
      base.hair = frame.hair;
      base.accessory = frame.accessory;
      const joinFeet = clampLobbyPoint(frame.x, frame.y);
      base.x = lobbyCoord(joinFeet.x);
      base.y = lobbyCoord(joinFeet.y);
      base.facing = frame.facing;
      base.action = frame.action;
      if (frame.lobby != null) base.lobby = frame.lobby;
      if (frame.hide) base.hide = frame.hide.filter(isSessionId).slice(0, 64);
      break;
    }
    case "move-to": {
      const feet = clampLobbyPoint(frame.x, frame.y);
      base.x = lobbyCoord(feet.x);
      base.y = lobbyCoord(feet.y);
      if (frame.facing) base.facing = frame.facing;
      if (frame.action) base.action = frame.action;
      break;
    }
    case "wave":
    case "heart":
      if (frame.target && isSessionId(frame.target)) base.target = frame.target;
      break;
    case "compliment":
      base.target = frame.target;
      break;
    case "switch":
      base.lobby = frame.lobby;
      break;
    case "hide":
      base.hide = frame.hide.filter(isSessionId).slice(0, 64);
      break;
    case "leave":
      break;
    default:
      break;
  }
  return JSON.stringify(base);
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readPerson(value: unknown): WirePerson | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || !isSessionId(row.id)) return null;
  if (typeof row.nickname !== "string" || row.nickname.length < 1 || row.nickname.length > 24) return null;
  const rawX = num(row.x);
  const rawY = num(row.y);
  const spawned = rawX == null || rawY == null ? lobbySpawnForId(row.id) : null;
  const feet = clampLobbyPoint(spawned?.x ?? lobbyCoord(rawX ?? 0), spawned?.y ?? lobbyCoord(rawY ?? 0));
  const facing = row.facing === "left" ? "left" : "right";
  return {
    id: row.id,
    nickname: row.nickname,
    outfit: typeof row.outfit === "string" ? row.outfit : "",
    hair: typeof row.hair === "string" ? row.hair : "",
    accessory: typeof row.accessory === "string" ? row.accessory : "",
    x: feet.x,
    y: feet.y,
    facing,
    action: typeof row.action === "string" ? row.action : "idle",
  };
}

function readCounts(value: unknown): LobbyCount[] {
  if (!Array.isArray(value)) return [];
  const out: LobbyCount[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const lobby = num(row.lobby);
    const count = num(row.count);
    const cap = num(row.cap);
    if (lobby == null || count == null || cap == null) continue;
    out.push({ lobby, count, cap });
  }
  return out;
}

function readEvents(value: unknown): LobbyEvent[] {
  if (!Array.isArray(value)) return [];
  const out: LobbyEvent[] = [];
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

export function parseLobbyMessage(raw: string): LobbyServerMessage {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { op: "ignore" };
  }
  if (!json || typeof json !== "object") return { op: "ignore" };
  const row = json as Record<string, unknown>;
  switch (row.op) {
    case "hello": {
      const sessionId = typeof row.session_id === "string" ? row.session_id : "";
      const lobby = num(row.lobby) ?? 1;
      const cap = num(row.cap) ?? LOBBY_CAP;
      const people = Array.isArray(row.people)
        ? row.people.map(readPerson).filter((person): person is WirePerson => person != null)
        : [];
      return { op: "hello", sessionId, lobby, cap, counts: readCounts(row.counts), people };
    }
    case "tick":
      return {
        op: "tick",
        lobby: num(row.lobby) ?? 1,
        counts: readCounts(row.counts),
        upserts: Array.isArray(row.upserts)
          ? row.upserts.map(readPerson).filter((person): person is WirePerson => person != null)
          : [],
        left: Array.isArray(row.left) ? row.left.filter((id): id is string => typeof id === "string") : [],
        events: readEvents(row.events),
      };
    case "lobby_full":
      return {
        op: "lobby_full",
        lobby: num(row.lobby) ?? 0,
        count: num(row.count) ?? LOBBY_CAP,
        cap: num(row.cap) ?? LOBBY_CAP,
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

export function applyLobbyMessage(state: HallSnapshot, message: LobbyServerMessage): HallSnapshot {
  if (message.op === "hello") {
    return {
      sessionId: message.sessionId || state.sessionId,
      lobby: message.lobby,
      cap: message.cap,
      counts: message.counts,
      people: message.people,
      fullLobby: state.fullLobby,
    };
  }
  if (message.op === "tick") {
    const byId = new Map(state.people.map((person) => [person.id, person]));
    for (const id of message.left) byId.delete(id);
    for (const person of message.upserts) {
      if (message.left.includes(person.id)) continue;
      byId.set(person.id, person);
    }
    return {
      ...state,
      lobby: message.lobby || state.lobby,
      counts: message.counts.length ? message.counts : state.counts,
      people: [...byId.values()],
    };
  }
  if (message.op === "lobby_full") {
    return { ...state, fullLobby: message.lobby, cap: message.cap || state.cap };
  }
  if (message.op === "bye" || message.op === "replaced") {
    return emptyHall();
  }
  return state;
}

export function hallIsFull(state: HallSnapshot, live: boolean): boolean {
  if (!live || state.lobby < 1) return false;
  if (state.fullLobby === 0) return true;
  const row = state.counts.find((item) => item.lobby === state.lobby);
  if (row) return row.count >= row.cap;
  return state.fullLobby === state.lobby;
}

export function nextOpenHall(state: HallSnapshot, live: boolean): number | null {
  if (!live || !hallIsFull(state, live)) return null;
  if (state.fullLobby === 0) return null;
  if (state.lobby < 1 || state.lobby >= 64) return null;
  return state.lobby + 1;
}

export function hallOccupancy(
  state: HallSnapshot,
  live: boolean,
  visibleFallback: number,
): { lobby: number; count: number; cap: number } {
  if (!live) return { lobby: 1, count: visibleFallback, cap: LOBBY_CAP };
  const row = state.counts.find((item) => item.lobby === state.lobby);
  return {
    lobby: state.lobby > 0 ? state.lobby : 1,
    count: row?.count ?? state.people.length,
    cap: row?.cap ?? state.cap ?? LOBBY_CAP,
  };
}

export function lobbyLook(outfit: string, hair: string, accessory: string): GameLook {
  return {
    outfit: isGameOutfit(outfit) ? outfit : "outfit_pajamas",
    hair: isGameHair(hair) ? hair : "hair_sleep_buns",
    clip: accessory && isGameClip(accessory) ? accessory : null,
  };
}

export function lobbyPose(action: string): GamePose | null {
  if (action === "wave") return "wave";
  if (action === "heart" || action === "compliment") return "cheer";
  return null;
}

export type LobbyActor = {
  id: string;
  nickname: string;
  x: number;
  y: number;
  facing: LobbyFacing;
  pose: GamePose | null;
  walking: boolean;
  look: GameLook;
  sample: boolean;
};

/**
 * Real people first. Sample visitors fill what is left so the scene stays
 * at or under 28 heads, including you. Hidden people are not drawn.
 */
export function lobbyActors(input: {
  live: boolean;
  people: readonly WirePerson[];
  selfId: string | null;
  hidden: ReadonlySet<string>;
  poses: Readonly<Record<string, GamePose | null | undefined>>;
}): LobbyActor[] {
  const real: LobbyActor[] = [];
  if (input.live) {
    for (const person of input.people) {
      if (person.id === input.selfId) continue;
      if (input.hidden.has(person.id)) continue;
      real.push({
        id: person.id,
        nickname: person.nickname,
        x: clampLobbyPoint(person.x, person.y).x,
        y: clampLobbyPoint(person.x, person.y).y,
        facing: person.facing,
        pose: input.poses[person.id] ?? lobbyPose(person.action),
        walking: person.action === "walk",
        look: lobbyLook(person.outfit, person.hair, person.accessory),
        sample: false,
      });
    }
  }
  const room = Math.max(0, LOBBY_CAP - 1 - real.length);
  const samples: LobbyActor[] = [];
  for (const friend of SAMPLE_LOBBY_FRIENDS) {
    if (samples.length >= room) break;
    if (input.hidden.has(friend.id)) continue;
    samples.push(sampleActor(friend, input.poses[friend.id] ?? null));
  }
  return [...samples, ...real];
}

function sampleActor(friend: SampleLobbyFriend, pose: GamePose | null): LobbyActor {
  return {
    id: friend.id,
    nickname: friend.nickname,
    x: friend.x,
    y: friend.y,
    facing: "right",
    pose,
    walking: false,
    look: { outfit: friend.outfit, hair: friend.hair, clip: friend.clip },
    sample: true,
  };
}

function hashPhase(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return (hash / 4294967296) * Math.PI * 2;
}

/** A small stroll around a sample visitor's authored spot. Stays inside the walk band. */
export function sampleWander(
  id: string,
  tMs: number,
  baseX: number,
  baseY: number,
): { x: number; y: number; facing: LobbyFacing } {
  const phase = hashPhase(id);
  const dx = Math.sin(tMs / 4800 + phase) * 0.03;
  const dy = Math.cos(tMs / 6200 + phase) * 0.015;
  const feet = clampLobbyPoint(baseX + dx, baseY + dy);
  const x = feet.x;
  const y = feet.y;
  const facing: LobbyFacing = Math.cos(tMs / 4800 + phase) > 0 ? "right" : "left";
  return { x, y, facing };
}

/** At most 2 frames per rolling second. A later move-to replaces one still waiting. */
export class LobbyOutbox {
  private stamps: number[] = [];
  private queued: { kind: string; body: string }[] = [];

  enqueue(kind: string, body: string): void {
    if (kind === "move-to") this.queued = this.queued.filter((item) => item.kind !== "move-to");
    this.queued.push({ kind, body });
  }

  clear(): void {
    this.queued = [];
  }

  take(at: number): string[] {
    this.stamps = this.stamps.filter((stamp) => at - stamp < SEND_WINDOW_MS);
    const out: string[] = [];
    while (this.queued.length > 0 && this.stamps.length < SEND_LIMIT) {
      const next = this.queued.shift();
      if (!next) break;
      this.stamps.push(at);
      out.push(next.body);
    }
    return out;
  }

  /** Milliseconds until another frame fits. 0 when the queue is empty or a slot is free. */
  waitMs(at: number): number {
    if (this.queued.length === 0) return 0;
    this.stamps = this.stamps.filter((stamp) => at - stamp < SEND_WINDOW_MS);
    if (this.stamps.length < SEND_LIMIT) return 0;
    return SEND_WINDOW_MS - (at - this.stamps[0]!) + 5;
  }
}

/**
 * Reconnect wait. The base doubles from 1s and stops growing at 30s.
 * A random 0–100% of that base is added on top, so many phones that drop
 * at the same moment do not dial back in together.
 * `random` returns a value in [0, 1). Values outside that range are clamped.
 */
export function reconnectDelayMs(attempt: number, random: () => number = Math.random): number {
  const base =
    attempt < 0 || !Number.isFinite(attempt)
      ? 1000
      : Math.min(30_000, 1000 * 2 ** Math.min(15, Math.floor(attempt)));
  const roll = random();
  const fraction = Number.isFinite(roll) ? Math.min(1, Math.max(0, roll)) : 0;
  return Math.round(base * (1 + fraction));
}
