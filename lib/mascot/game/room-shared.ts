import { ApiError, apiGet, apiPost } from "@/lib/api-client";
import { bubbleColour } from "@/lib/mascot/game/bubble-colour";
import { formatGameCoins } from "@/lib/mascot/game/coins";
import {
  DEFAULT_LOADOUT,
  defaultSnapshot,
  permanentItem,
  resolveBeDaView,
  type BeDaView,
} from "@/lib/mascot/model";

/** REST shared-room batch: quest, today board, nudge. Same origin as the other room calls. */
const ROOMS = "/api/v1/mascot/rooms";

const roomCall = { toastOnError: false, credentials: "include" as const };

/** Chests the server pays. 5 / 15 / 30 member-days → 40 / 120 / 300 coins. */
export const ROOM_QUEST_LADDER = [
  { memberDays: 5, coins: 40, tier: "small" },
  { memberDays: 15, coins: 120, tier: "medium" },
  { memberDays: 30, coins: 300, tier: "big" },
] as const;

export type RoomQuestTier = (typeof ROOM_QUEST_LADDER)[number]["tier"];

/** What this member can do with one chest. */
export type ChestState = "locked" | "claimable" | "claimed" | "closed" | "expired";

export type RoomQuestMilestone = {
  memberDays: number;
  coins: number;
  tier: RoomQuestTier;
  reached: boolean;
  claimed: boolean;
  claimable: boolean;
};

export type RoomQuest = {
  progress: number;
  spanDays: number;
  memberCount: number;
  maxMemberDays: number;
  vnToday: string;
  milestones: RoomQuestMilestone[];
};

export type RoomChest = {
  memberDays: number;
  coins: number;
  tier: RoomQuestTier;
  state: ChestState;
};

export type RoomClaim = {
  memberDays: number;
  coins: number;
  tier: RoomQuestTier;
  balance: number;
  alreadyClaimed: boolean;
  progress: number;
};

export type RoomMascotLook = {
  body: string;
  hair: string;
  outfit: string;
  accessory: string;
  accessories: string[];
  roomItems: string[];
  gender?: "male";
  /** Equipped bubble colour. Missing until `look.bubble` is on the room payload. */
  bubble?: string;
};

export type RoomTodayMember = {
  userId: string;
  displayName: string;
  look: RoomMascotLook;
  caredToday: boolean;
  checkedToday: boolean;
};

export type RoomToday = {
  vnDate: string;
  members: RoomTodayMember[];
};

export type RoomNudge = {
  userId: string;
  message: string;
  vnDate: string;
  push: string;
};

const TIERS = new Set<string>(["small", "medium", "big"]);

function row(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function int(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.trunc(value));
}

function text(value: unknown, max = 80): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function tierOf(value: unknown, memberDays: number): RoomQuestTier {
  if (typeof value === "string" && TIERS.has(value)) return value as RoomQuestTier;
  return ROOM_QUEST_LADDER.find((item) => item.memberDays === memberDays)?.tier ?? "small";
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    const id = text(item, 64);
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}

/**
 * One chest for this member.
 * Claimed wins. Expired and closed come from the claim call, not from the progress flags.
 * Reached but not claimable is closed (the chest is not open for me).
 */
export function chestState(
  milestone: { reached: boolean; claimed: boolean; claimable: boolean },
  overlay?: "closed" | "expired" | null,
): ChestState {
  if (overlay === "expired") return "expired";
  if (milestone.claimed) return "claimed";
  if (overlay === "closed") return "closed";
  if (milestone.claimable) return "claimable";
  if (!milestone.reached) return "locked";
  return "closed";
}

export function readRoomQuest(data: unknown): RoomQuest | null {
  const body = row(data);
  if (!body) return null;
  const progress = int(body.progress);
  if (progress == null) return null;
  const raw = Array.isArray(body.milestones) ? body.milestones : [];
  const milestones: RoomQuestMilestone[] = [];
  for (const item of raw) {
    const chest = row(item);
    if (!chest) continue;
    const memberDays = int(chest.member_days);
    const coins = int(chest.coins);
    if (memberDays == null || coins == null || memberDays <= 0) continue;
    const claimed = chest.claimed === true;
    const reached = chest.reached === true || claimed;
    const claimable = chest.claimable === true && reached && !claimed;
    milestones.push({
      memberDays,
      coins,
      tier: tierOf(chest.tier, memberDays),
      reached,
      claimed,
      claimable,
    });
  }
  if (milestones.length === 0) return null;
  milestones.sort((a, b) => a.memberDays - b.memberDays);
  return {
    progress,
    spanDays: int(body.span_days) ?? 0,
    memberCount: int(body.member_count) ?? 0,
    maxMemberDays: int(body.max_member_days) ?? 0,
    vnToday: text(body.vn_today, 10),
    milestones,
  };
}

export function readRoomClaim(data: unknown): RoomClaim | null {
  const body = row(data);
  if (!body) return null;
  const memberDays = int(body.member_days);
  const coins = int(body.coins);
  const balance = int(body.balance);
  const progress = int(body.progress);
  if (memberDays == null || coins == null || balance == null || progress == null) return null;
  return {
    memberDays,
    coins,
    tier: tierOf(body.tier, memberDays),
    balance,
    alreadyClaimed: body.already_claimed === true,
    progress,
  };
}

function readLook(value: unknown): RoomMascotLook {
  const body = row(value);
  const gender = body?.gender === "male" ? "male" : undefined;
  return {
    body: text(body?.body, 64),
    hair: text(body?.hair, 64),
    outfit: text(body?.outfit, 64),
    accessory: text(body?.accessory, 64),
    accessories: stringList(body?.accessories),
    roomItems: stringList(body?.room_items),
    ...(gender ? { gender } : {}),
    ...(bubbleColour(text(body?.bubble, 64)) ? { bubble: text(body?.bubble, 64) } : {}),
  };
}

const USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function readRoomToday(data: unknown): RoomToday | null {
  const body = row(data);
  if (!body || !Array.isArray(body.members)) return null;
  const members: RoomTodayMember[] = [];
  for (const item of body.members) {
    const member = row(item);
    if (!member) continue;
    const userId = text(member.user_id, 36).toLowerCase();
    if (!USER_ID.test(userId)) continue;
    const name = text(member.display_name, 48);
    members.push({
      userId,
      displayName: name || "Bạn trong phòng",
      look: readLook(member.look),
      caredToday: member.cared_today === true,
      checkedToday: member.checked_today === true,
    });
  }
  return { vnDate: text(body.vn_date, 10), members };
}

export function readRoomNudge(data: unknown): RoomNudge | null {
  const body = row(data);
  if (!body) return null;
  const userId = text(body.user_id, 36).toLowerCase();
  if (!USER_ID.test(userId)) return null;
  return {
    userId,
    message: text(body.message, 240),
    vnDate: text(body.vn_date, 10),
    push: text(body.push, 16),
  };
}

/** POST body is only member_days. A message field is invalid_body. */
export function questClaimBody(memberDays: number): { member_days: number } {
  return { member_days: memberDays };
}

/** POST body is only user_id. The server picks the sentence. */
export function nudgeBody(userId: string): { user_id: string } {
  return { user_id: userId };
}

export function sharedRoomError(err: unknown): { status: number | null; code: string; message: string } | null {
  if (!(err instanceof ApiError)) return null;
  return { status: err.status, code: err.code ?? "", message: err.serverMessage?.trim() ?? "" };
}

const ROOM_COPY: Record<string, string> = {
  chest_closed: "Rương này chưa mở.",
  chests_expired: "Phòng đã kết thúc, rương hết hạn",
  room_ended: "Phòng này đã kết thúc.",
  already_nudged: "Hôm nay bạn đã nhắc người này rồi.",
  already_done: "Bạn này hôm nay đã chăm da hoặc check-in rồi.",
  nudge_self: "Bạn không nhắc chính mình được.",
  not_in_room: "Người này không ở trong phòng.",
  unknown_chest: "Không có rương này.",
};

function hasVietnamese(value: string): boolean {
  return /[^\u0000-\u007f]/.test(value);
}

/**
 * Show the server's Vietnamese sentence when it sent one.
 * English codes fall back to the same lines the API translates.
 */
export function friendlyRoomMessage(code: string, serverMessage: string): string {
  const message = serverMessage.trim();
  if (message && hasVietnamese(message)) return message;
  if (ROOM_COPY[code]) return ROOM_COPY[code];
  if (message) return "Có lỗi xảy ra. Bạn thử lại giúp mình nhé.";
  return "Có lỗi xảy ra. Bạn thử lại giúp mình nhé.";
}

/** 409 room_ended. After the 3-day read window this is final: chests are expired. */
export function isQuestGrace(err: unknown): boolean {
  const problem = sharedRoomError(err);
  return problem?.status === 409 && problem.code === "room_ended";
}

/** The mascot gate is closed. Hide the panels the way a 404 hides the rest of Bé Da. */
export function isQuestHidden(err: unknown): boolean {
  const problem = sharedRoomError(err);
  return problem?.status === 404 && (problem.code === "not_found" || problem.code === "");
}

export function chestsFromQuest(
  quest: RoomQuest | null,
  options: { grace?: boolean; expired?: boolean; closedDays?: number | null } = {},
): RoomChest[] {
  if (options.expired) {
    const source = quest?.milestones ?? ROOM_QUEST_LADDER;
    return source.map((item) => ({
      memberDays: item.memberDays,
      coins: item.coins,
      tier: item.tier,
      state: "expired" as const,
    }));
  }
  if (!quest) {
    return ROOM_QUEST_LADDER.map((item) => ({
      memberDays: item.memberDays,
      coins: item.coins,
      tier: item.tier,
      state: options.grace ? ("claimable" as const) : ("locked" as const),
    }));
  }
  return quest.milestones.map((item) => ({
    memberDays: item.memberDays,
    coins: item.coins,
    tier: item.tier,
    state: chestState(item, options.closedDays === item.memberDays ? "closed" : null),
  }));
}

/** Bar runs at least to the big chest so 5, 15, and 30 all sit on it. */
export function questScale(quest: Pick<RoomQuest, "progress" | "maxMemberDays">): number {
  return Math.max(30, quest.maxMemberDays, quest.progress, 1);
}

export function questFillPercent(quest: Pick<RoomQuest, "progress" | "maxMemberDays">): number {
  const scale = questScale(quest);
  return Math.max(0, Math.min(100, (quest.progress / scale) * 100));
}

export function formatRoomCoins(count: number, locale: string): string {
  return formatGameCoins(count, locale);
}

/** Small Bé Da for the today row. No room props, no photos. */
export function todayMemberView(look: RoomMascotLook, locale: string): BeDaView {
  const snap = defaultSnapshot();
  const accessories =
    look.accessories.length > 0
      ? look.accessories.map((id) => permanentItem(id))
      : look.accessory
        ? [permanentItem(look.accessory)]
        : [];
  snap.loadout = {
    ...DEFAULT_LOADOUT,
    body: permanentItem(look.body || DEFAULT_LOADOUT.body.id),
    hair: permanentItem(look.hair || DEFAULT_LOADOUT.hair.id),
    outfit: permanentItem(look.outfit || DEFAULT_LOADOUT.outfit.id),
    face: null,
    accessories,
    roomItems: [],
  };
  snap.gender = look.gender === "male" ? "male" : "female";
  snap.mood = "happy";
  snap.isDefault = false;
  snap.skinMarks = [];
  snap.skinMarksPrev = [];
  return resolveBeDaView({
    snapshot: snap,
    missedDays: 0,
    sessionHappy: true,
    locale,
  });
}

/** Someone still needs a nudge when neither the routine nor the skin check is done. */
export function canNudgeMember(member: Pick<RoomTodayMember, "userId" | "caredToday" | "checkedToday">, selfId: string | null): boolean {
  if (selfId && member.userId.toLowerCase() === selfId.toLowerCase()) return false;
  return !member.caredToday && !member.checkedToday;
}

const NUDGE_KEY = "beda-room-nudges";

export function readNudgedIds(storage: Pick<Storage, "getItem">, code: string, vnDate: string): string[] {
  if (!code || !vnDate) return [];
  const raw = storage.getItem(NUDGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { code?: unknown; vnDate?: unknown; ids?: unknown };
    if (parsed.code !== code || parsed.vnDate !== vnDate || !Array.isArray(parsed.ids)) return [];
    const ids: string[] = [];
    for (const item of parsed.ids) {
      const id = text(item, 36).toLowerCase();
      if (USER_ID.test(id) && !ids.includes(id)) ids.push(id);
    }
    return ids;
  } catch {
    return [];
  }
}

export function rememberNudgedId(
  storage: Pick<Storage, "getItem" | "setItem">,
  code: string,
  vnDate: string,
  userId: string,
): string[] {
  const id = userId.trim().toLowerCase();
  const ids = USER_ID.test(id) ? [...new Set([...readNudgedIds(storage, code, vnDate), id])] : readNudgedIds(storage, code, vnDate);
  if (code && vnDate) storage.setItem(NUDGE_KEY, JSON.stringify({ code, vnDate, ids }));
  return ids;
}

export async function getRoomQuest(code: string): Promise<RoomQuest> {
  const data = await apiGet<unknown>(`${ROOMS}/${encodeURIComponent(code)}/quest`, roomCall);
  const quest = readRoomQuest(data);
  if (!quest) throw new ApiError("api", { status: 502, code: "bad_message" });
  return quest;
}

export async function claimRoomChest(code: string, memberDays: number): Promise<RoomClaim> {
  const data = await apiPost<unknown>(
    `${ROOMS}/${encodeURIComponent(code)}/quest/claim`,
    questClaimBody(memberDays),
    roomCall,
  );
  const claim = readRoomClaim(data);
  if (!claim) throw new ApiError("api", { status: 502, code: "bad_message" });
  return claim;
}

export async function getRoomToday(code: string): Promise<RoomToday> {
  const data = await apiGet<unknown>(`${ROOMS}/${encodeURIComponent(code)}/today`, roomCall);
  const today = readRoomToday(data);
  if (!today) throw new ApiError("api", { status: 502, code: "bad_message" });
  return today;
}

export async function nudgeRoomMember(code: string, userId: string): Promise<RoomNudge> {
  const data = await apiPost<unknown>(`${ROOMS}/${encodeURIComponent(code)}/nudge`, nudgeBody(userId), roomCall);
  const nudge = readRoomNudge(data);
  if (!nudge) throw new ApiError("api", { status: 502, code: "bad_message" });
  return nudge;
}
