/**
 * Coins shown as "xu". They are a view of data the app already has.
 * There is no wallet and nothing to buy.
 *
 * The server glow-point total is the balance when the mascot payload sent one.
 * Those points are never labeled as points or tied to a level on screen.
 * If the payload omitted them, today's routine ticks and check-in fill in a
 * display number only (10 per tick, 20 if today is checked in).
 */

export function gameCoinCount(input: {
  glowPoints: number | null;
  routineTicks: number;
  checkedInToday: boolean;
}): number {
  if (input.glowPoints != null && Number.isFinite(input.glowPoints)) {
    return Math.max(0, Math.trunc(input.glowPoints));
  }
  const ticks = Number.isFinite(input.routineTicks) ? Math.max(0, Math.trunc(input.routineTicks)) : 0;
  return ticks * 10 + (input.checkedInToday ? 20 : 0);
}

export function formatGameCoins(count: number, locale: string): string {
  const safe = Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;
  const loc = locale.toLowerCase().startsWith("vi") ? "vi-VN" : "en-US";
  return new Intl.NumberFormat(loc).format(safe);
}

export function countRoutineTicks(
  morning: { completed?: boolean }[],
  evening: { completed?: boolean }[],
  routineToday: { amDone: number; pmDone: number } | null,
): number {
  const steps = [...morning, ...evening];
  if (steps.length > 0) return steps.filter((step) => step.completed).length;
  return (routineToday?.amDone ?? 0) + (routineToday?.pmDone ?? 0);
}
