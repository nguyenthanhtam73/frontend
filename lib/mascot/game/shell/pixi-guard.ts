/**
 * Lifetime checks for the Pixi shell. A load that finishes after unmount
 * must not touch the stage, and a pending recenter timer must be cleared.
 */

export type ShellLife = {
  destroyed: boolean;
  recenterTimer: number;
};

export function createShellLife(): ShellLife {
  return { destroyed: false, recenterTimer: 0 };
}

/** Run `attach` only while the shell is still mounted. Returns false if it was skipped. */
export function attachIfMounted<T>(life: ShellLife, value: T, attach: (value: T) => void): boolean {
  if (life.destroyed) return false;
  attach(value);
  return true;
}

export function scheduleRecenterResume(
  life: ShellLife,
  delayMs: number,
  resume: () => void,
  setTimer: (fn: () => void, ms: number) => number,
  clearTimer: (id: number) => void,
): void {
  if (life.recenterTimer) clearTimer(life.recenterTimer);
  life.recenterTimer = setTimer(() => {
    life.recenterTimer = 0;
    if (!life.destroyed) resume();
  }, delayMs);
}

export function destroyShellLife(life: ShellLife, clearTimer: (id: number) => void): void {
  life.destroyed = true;
  if (!life.recenterTimer) return;
  clearTimer(life.recenterTimer);
  life.recenterTimer = 0;
}

/** Drop the loading spinner. Report the failure only if the host is still on the page. */
export function notePixiInitFailed(
  dataset: { loading?: string },
  unmounted: boolean,
  onError?: () => void,
): void {
  delete dataset.loading;
  if (!unmounted) onError?.();
}
