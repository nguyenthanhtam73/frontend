const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** One open room the signed-in account can still enter. */
export type RoomSummary = {
  code: string;
  memberCount: number;
  cap: number;
};

/** Six letters from the room alphabet, or null. */
export function normalizeRoomCode(raw: string): string | null {
  const code = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (code.length !== 6) return null;
  for (const char of code) {
    if (!ROOM_ALPHABET.includes(char)) return null;
  }
  return code;
}

/** `data` from GET /api/v1/mascot/rooms/mine. Unknown rows are dropped. */
export function readRoomList(data: unknown): RoomSummary[] {
  if (!data || typeof data !== "object") return [];
  const rooms = (data as { rooms?: unknown }).rooms;
  if (!Array.isArray(rooms)) return [];
  const out: RoomSummary[] = [];
  for (const item of rooms) {
    if (!item || typeof item !== "object") continue;
    const row = item as { code?: unknown; cap?: unknown; member_count?: unknown };
    const code = typeof row.code === "string" ? normalizeRoomCode(row.code) : null;
    if (!code || out.some((have) => have.code === code)) continue;
    const cap = typeof row.cap === "number" && Number.isFinite(row.cap) ? row.cap : 8;
    const memberCount =
      typeof row.member_count === "number" && Number.isFinite(row.member_count) ? row.member_count : 0;
    out.push({ code, memberCount, cap });
  }
  return out;
}

/** Overlay button. The code is the only interpolated piece. */
export function roomEnterLabel(code: string): string {
  return `Vào phòng ${code}`;
}
