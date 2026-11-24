/**
 * Home quest chest (the one on «Nhiệm vụ» after a care session).
 * The server has no claim for this chest, so the screen persists a local day
 * flag and passes an empty grant. A balance, when a later API sends one,
 * is what the header pill counts up to.
 */

export const QUEST_CHEST_OPEN_MS = 1500;
export const QUEST_CHEST_FADE_MS = 400;
export const QUEST_CHEST_LID_MS = 450;

export type QuestChestItem = {
  name: string;
  src: string;
};

export type QuestChestGrant = {
  coins: number;
  balance: number | null;
  item: QuestChestItem | null;
};

export function emptyQuestGrant(): QuestChestGrant {
  return { coins: 0, balance: null, item: null };
}

export function questChestOpenMs(reducedMotion: boolean): number {
  return reducedMotion ? QUEST_CHEST_FADE_MS : QUEST_CHEST_OPEN_MS;
}

/** A second tap while the first claim is in flight, or after it succeeded, does nothing. */
export function claimClick(state: { pending: boolean; done: boolean }): "run" | "ignore" {
  if (state.pending || state.done) return "ignore";
  return "run";
}

const ADDRESS = /\b(bạn|mình)\b/i;

/** At most two «mày», and never bạn/mình as you or I. */
export function questChestCopyOk(text: string): boolean {
  const may = text.match(/mày/gi)?.length ?? 0;
  return may <= 2 && !ADDRESS.test(text);
}

export function normalizeQuestGrant(value: QuestChestGrant | void | null): QuestChestGrant {
  if (!value) return emptyQuestGrant();
  const coins = Number.isFinite(value.coins) ? Math.max(0, Math.trunc(value.coins)) : 0;
  const balance =
    value.balance == null || !Number.isFinite(value.balance) ? null : Math.max(0, Math.trunc(value.balance));
  const name = value.item?.name?.trim() ?? "";
  const src = value.item?.src?.trim() ?? "";
  return {
    coins,
    balance,
    item: name && src ? { name: name.slice(0, 80), src: src.slice(0, 240) } : null,
  };
}

/** Cubic ease-out from `from` to `to`. `t` is 0..1. */
export function coinAt(from: number, to: number, t: number): number {
  const p = Math.min(1, Math.max(0, t));
  const eased = 1 - (1 - p) ** 3;
  return Math.round(from + (to - from) * eased);
}
