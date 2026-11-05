import { STREAK_TZ } from "@/lib/streak/history";

export type RoutineSession = "morning" | "evening";
export type SessionPhase = "open" | "early" | "late";

/** Morning opens at 04:00 Vietnam time. */
export const MORNING_OPEN_MINUTES = 4 * 60;
/** Evening opens at 16:00 Vietnam time. Morning closes at the same minute. */
export const EVENING_OPEN_MINUTES = 16 * 60;

export type SessionGate = {
  section: RoutineSession;
  phase: SessionPhase;
};

/**
 * Minutes since midnight in Asia/Ho_Chi_Minh.
 * hourCycle h23 keeps midnight as 0, not 24.
 */
export function vietnamMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: STREAK_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

/**
 * Morning is tickable from 04:00 inclusive until 16:00 exclusive.
 * Evening is tickable from 16:00 inclusive until 04:00 the next day.
 * Before a window the phase is early («Chưa tới giờ»). After it, late («Đã qua giờ»).
 * Evening during the morning window is early, because 16:00 today is still ahead.
 */
export function sessionGate(section: RoutineSession, date: Date = new Date()): SessionGate {
  const minutes = vietnamMinutes(date);
  const morningOpen = minutes >= MORNING_OPEN_MINUTES && minutes < EVENING_OPEN_MINUTES;
  if (section === "morning") {
    if (morningOpen) return { section, phase: "open" };
    if (minutes < MORNING_OPEN_MINUTES) return { section, phase: "early" };
    return { section, phase: "late" };
  }
  if (morningOpen) return { section, phase: "early" };
  return { section, phase: "open" };
}

export function sessionOpen(section: RoutineSession, date: Date = new Date()): boolean {
  return sessionGate(section, date).phase === "open";
}

/** A finished session is at least one real step, every one ticked. */
export function sessionComplete(steps: readonly { completed?: boolean }[]): boolean {
  return steps.length > 0 && steps.every((step) => step.completed === true);
}

/**
 * The chest that should open. Morning wins when both are waiting,
 * so each finished session still gets its own chest, one after the other.
 */
export function pendingChestSession(input: {
  morningDone: boolean;
  eveningDone: boolean;
  morningClaimed: boolean;
  eveningClaimed: boolean;
}): RoutineSession | null {
  if (input.morningDone && !input.morningClaimed) return "morning";
  if (input.eveningDone && !input.eveningClaimed) return "evening";
  return null;
}
