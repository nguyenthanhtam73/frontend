import { ApiError, apiGet, apiPost } from "@/lib/api-client";
import { normalizeRoomCode, readSpaBoard, spaRoomProblem, type SpaBoardRow, type SpaNotice } from "@/lib/mascot/game/spa-room";

/** REST room. The socket does not create or look up rooms. */
const ROOMS = "/api/v1/mascot/rooms";

/**
 * Bearer token, same as the other API calls, and cookies included.
 * dadiary.vn answers that pair. A preview host still sends the bearer;
 * `include` is what the production page needs for the credential CORS path.
 */
const roomCall = { toastOnError: false, credentials: "include" as const };

export type SpaRoomRecord = {
  code: string;
  cap: number;
  memberCount: number;
  joined: boolean;
  owner: boolean;
  inviteUrl: string;
};

/** `{ success, data: { code, cap, member_count, joined, owner, invite_url } }`. */
export function readSpaRoom(data: unknown): SpaRoomRecord | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  const code = typeof row.code === "string" ? normalizeRoomCode(row.code) : null;
  if (!code) return null;
  const cap = typeof row.cap === "number" && Number.isFinite(row.cap) ? row.cap : 8;
  const memberCount =
    typeof row.member_count === "number" && Number.isFinite(row.member_count) ? row.member_count : 0;
  return {
    code,
    cap,
    memberCount,
    joined: row.joined === true,
    owner: row.owner === true,
    inviteUrl: typeof row.invite_url === "string" ? row.invite_url : "",
  };
}

export function spaProblemFromError(err: unknown): Exclude<SpaNotice, null> {
  if (err instanceof ApiError) {
    return spaRoomProblem(err.status, err.code ?? null) ?? "offline";
  }
  return "offline";
}

const MINE_KEY = "beda-spa-rooms";

/** Codes this device has opened. Kept so a full create cap still has a way back in. */
export function readRememberedSpaRooms(storage: Pick<Storage, "getItem">): string[] {
  const raw = storage.getItem(MINE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const codes: string[] = [];
    for (const item of parsed) {
      if (typeof item !== "string") continue;
      const code = normalizeRoomCode(item);
      if (code && !codes.includes(code)) codes.push(code);
    }
    return codes.slice(0, 8);
  } catch {
    return [];
  }
}

export function rememberSpaRoom(storage: Pick<Storage, "getItem" | "setItem">, code: string): void {
  const next = normalizeRoomCode(code);
  if (!next) return;
  const codes = [next, ...readRememberedSpaRooms(storage).filter((item) => item !== next)].slice(0, 8);
  storage.setItem(MINE_KEY, JSON.stringify(codes));
}

export function readMySpaRooms(data: unknown): SpaRoomRecord[] {
  if (!data || typeof data !== "object") return [];
  const rooms = (data as { rooms?: unknown }).rooms;
  if (!Array.isArray(rooms)) return [];
  const out: SpaRoomRecord[] = [];
  for (const item of rooms) {
    const room = readSpaRoom(item);
    if (room && !out.some((have) => have.code === room.code)) out.push(room);
  }
  return out;
}

/** GET /api/v1/mascot/rooms/mine. Missing on an older server is an empty list. */
export async function listMySpaRooms(): Promise<SpaRoomRecord[]> {
  try {
    const data = await apiGet<unknown>(`${ROOMS}/mine`, roomCall);
    return readMySpaRooms(data);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 405)) return [];
    throw err;
  }
}

/** POST /api/v1/mascot/rooms. The server picks the 6-letter code. */
export async function createSpaRoom(): Promise<SpaRoomRecord> {
  const data = await apiPost<unknown>(ROOMS, undefined, roomCall);
  const room = readSpaRoom(data);
  if (!room) throw new ApiError("api", { status: 502, code: "bad_message" });
  return room;
}

/** GET /api/v1/mascot/rooms/:code. Shows x/8 before the socket hello. */
export async function getSpaRoom(code: string): Promise<SpaRoomRecord> {
  const data = await apiGet<unknown>(`${ROOMS}/${encodeURIComponent(code)}`, roomCall);
  const room = readSpaRoom(data);
  if (!room) throw new ApiError("api", { status: 502, code: "bad_message" });
  return room;
}

/** POST /api/v1/mascot/rooms/:code/join. Required before the socket join. */
export async function joinSpaRoom(code: string): Promise<SpaRoomRecord> {
  const data = await apiPost<unknown>(`${ROOMS}/${encodeURIComponent(code)}/join`, undefined, roomCall);
  const room = readSpaRoom(data);
  if (!room) throw new ApiError("api", { status: 502, code: "bad_message" });
  return room;
}

/** POST /api/v1/mascot/rooms/:code/leave. The last member closes the room. */
export async function leaveSpaRoom(code: string): Promise<void> {
  await apiPost(`${ROOMS}/${encodeURIComponent(code)}/leave`, undefined, roomCall);
}

/**
 * GET /api/v1/mascot/rooms/:code/board.
 * Members sorted by care_streak. Missing until the backend ships — callers fall back.
 */
export async function getSpaBoard(code: string): Promise<SpaBoardRow[]> {
  const data = await apiGet<unknown>(`${ROOMS}/${encodeURIComponent(code)}/board`, roomCall);
  const rows = readSpaBoard(data);
  if (!rows) throw new ApiError("api", { status: 502, code: "bad_message" });
  return rows;
}
