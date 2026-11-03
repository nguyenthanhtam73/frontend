import { isSessionComplete, poseForStep } from "@/lib/mascot/pose";
import type { RoutineToday } from "@/lib/mascot/model";
import { streakDateKey } from "@/lib/streak/history";

export const GAME_QUEST_IDS = ["wash", "spf", "wave"] as const;
export type GameQuestId = (typeof GAME_QUEST_IDS)[number];

export type GameQuest = {
  id: GameQuestId;
  done: boolean;
};

export type GameQuestStep = {
  category?: string;
  title?: string;
  completed?: boolean;
};

export type GameBubbleKind = "wash" | "washed" | "wave" | "done";

/**
 * Today's three tasks.
 * Wash and sunscreen come from routine ticks (the morning list when we have it,
 * otherwise the mascot `routine_today` counts). The lobby wave is a tap in this
 * screen, remembered for the Vietnam day. Nothing is purchased.
 */
export function gameQuests(input: {
  morning: GameQuestStep[];
  evening?: GameQuestStep[];
  routineToday: RoutineToday | null;
  wavedToday: boolean;
}): GameQuest[] {
  const morning = input.morning ?? [];
  return [
    { id: "wash", done: washDone(morning, input.routineToday) },
    { id: "spf", done: spfDone(morning, input.routineToday) },
    { id: "wave", done: input.wavedToday },
  ];
}

function washDone(morning: GameQuestStep[], routineToday: RoutineToday | null): boolean {
  if (morning.length === 0) return (routineToday?.amDone ?? 0) >= 1;
  const cleansers = morning.filter((step) => poseForStep(step) === "cleanser");
  if (cleansers.length > 0) return cleansers.some((step) => !!step.completed);
  const first = morning[0];
  return !!first?.completed && poseForStep(first) !== "spf";
}

function spfDone(morning: GameQuestStep[], routineToday: RoutineToday | null): boolean {
  if (morning.length === 0) {
    const done = routineToday?.amDone ?? 0;
    const total = routineToday?.amTotal ?? 0;
    return total > 0 && done >= total;
  }
  const screens = morning.filter((step) => poseForStep(step) === "spf");
  if (screens.length > 0) return screens.some((step) => !!step.completed);
  return isSessionComplete(morning);
}

export function openQuestCount(quests: GameQuest[]): number {
  return quests.filter((quest) => !quest.done).length;
}

export function allQuestsDone(quests: GameQuest[]): boolean {
  return quests.length > 0 && quests.every((quest) => quest.done);
}

/** Gift chest opens once every task is done and today's gift is still unclaimed. */
export function chestReady(quests: GameQuest[], claimedToday: boolean): boolean {
  return allQuestsDone(quests) && !claimedToday;
}

/** Hearts on the chest are the finished tasks. Not a separate score. */
export function chestHearts(quests: GameQuest[]): number {
  return quests.filter((quest) => quest.done).length;
}

export function gameBubbleKind(quests: GameQuest[]): GameBubbleKind {
  const done = (id: GameQuestId) => quests.find((quest) => quest.id === id)?.done === true;
  if (done("wash") && done("spf") && done("wave")) return "done";
  if (done("wash") && done("spf")) return "wave";
  if (done("wash")) return "washed";
  return "wash";
}

/** True when a check-in instant or a `YYYY-MM-DD` streak day falls on `today`. */
export function checkedInOnDay(value: string | null | undefined, today: string): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed === today;
  const parsed = Date.parse(trimmed);
  if (!Number.isFinite(parsed)) return false;
  return streakDateKey(new Date(parsed)) === today;
}
