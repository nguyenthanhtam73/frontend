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

/**
 * One missing spritesheet must not retry forever and block the other Bé Das.
 * A failed sheet falls back to the HTML figure. A sheet already on stage is drawn.
 * While another sheet is loading, wait.
 */
export function actorSheetPlan(input: {
  ready: boolean;
  failed: boolean;
  busy: boolean;
}): "draw" | "fallback" | "wait" | "start" {
  if (input.ready) return "draw";
  if (input.failed) return "fallback";
  if (input.busy) return "wait";
  return "start";
}

/**
 * The spritesheet flag lives on the HTML element. A remount starts blank, so
 * the draw path has to put it back every frame or the SVG and the canvas
 * both show. A new hair or outfit clears it until that sheet is on stage.
 */
export function setActorReady(dataset: { actorReady?: string }, ready: boolean): void {
  if (ready) dataset.actorReady = "1";
  else delete dataset.actorReady;
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
