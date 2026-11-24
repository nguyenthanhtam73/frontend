/**
 * Spendable xu is the coin wallet (`user_coin_wallets.balance`), the same
 * number the shop catalog returns as `balance`. Glow points are a separate
 * level total (check-in and a finished routine) and must not be labeled xu.
 *
 * `walletXu` is that wallet. `gameCoinCount` is the old glow display, kept
 * for payloads that never sent a wallet.
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

/** The coin-wallet balance, or null when the shop has not answered yet. */
export function walletXu(balance: number | null | undefined): number | null {
  if (typeof balance !== "number" || !Number.isFinite(balance)) return null;
  return Math.max(0, Math.trunc(balance));
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
