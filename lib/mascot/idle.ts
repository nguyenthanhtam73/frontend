/**
 * Bé Da idle blink. Each caller keeps its own clock.
 * Glow levels 1–2 are sleepy for the breath only. Blink timing does not change with level.
 * Breathing duration lives in CSS on `.bd-figure`.
 * Tap, drag, hop, and split head/shadow motion are not part of this schedule.
 *
 * Eyes stay open when the viewer asks for reduced motion.
 */

export type BeDaIdleTiming = {
  sleepy: boolean;
  /** Soft close, 120–150ms. */
  blinkMs: (unit: number) => number;
  /** Delay until the next blink. 6–8s. */
  waitMs: (unit: number) => number;
  /** First blink only, so two characters that mount together do not match. 0–8s. */
  offsetMs: (unit: number) => number;
};

export const BLINK_CLOSED_MIN_MS = 120;
export const BLINK_CLOSED_MAX_MS = 150;
export const BLINK_GAP_MIN_MS = 6000;
export const BLINK_GAP_MAX_MS = 8000;

/** Levels 1 and 2 match motion.css `[data-level="1"|"2"]`. Anything else is the awake idle. */
export function beDaIdleIsSleepy(level: number): boolean {
  return level === 1 || level === 2;
}

export function blinkClosedMs(unit: number): number {
  return BLINK_CLOSED_MIN_MS + unitInterval(unit) * (BLINK_CLOSED_MAX_MS - BLINK_CLOSED_MIN_MS);
}

export function blinkGapMs(unit: number): number {
  return BLINK_GAP_MIN_MS + unitInterval(unit) * (BLINK_GAP_MAX_MS - BLINK_GAP_MIN_MS);
}

/** Random phase. A full gap, so the first blink is not on the same beat as the loop. */
export function blinkOffsetMs(unit: number): number {
  return unitInterval(unit) * BLINK_GAP_MAX_MS;
}

export function beDaIdleTiming(level: number): BeDaIdleTiming {
  return {
    sleepy: beDaIdleIsSleepy(level),
    blinkMs: blinkClosedMs,
    waitMs: blinkGapMs,
    offsetMs: blinkOffsetMs,
  };
}

function unitInterval(unit: number): number {
  if (!Number.isFinite(unit)) return 0;
  if (unit < 0) return 0;
  if (unit > 1) return 1;
  return unit;
}

/**
 * Smoothstep. 0 at the edges of the blink, 1 while the eyes are shut.
 * The shut hold is the middle 56% of the 120–150ms window.
 */
export function blinkEase(t: number): number {
  if (!(t > 0) || t >= 1) return 0;
  const edge = 0.22;
  const smooth = (u: number) => {
    const x = Math.min(1, Math.max(0, u));
    return x * x * (3 - 2 * x);
  };
  if (t < edge) return smooth(t / edge);
  if (t > 1 - edge) return smooth((1 - t) / edge);
  return 1;
}

export type BlinkClock = {
  waitLeft: number;
  /** Milliseconds into the current close. 0 means the eyes are open. */
  active: number;
  dur: number;
};

export function createBlinkClock(unit: number): BlinkClock {
  return { waitLeft: blinkOffsetMs(unit), active: 0, dur: 0 };
}

/**
 * Advance one character's blink. Returns the eyelid alpha for this step.
 * `reduced` keeps the eyes open and does not burn the timer.
 */
export function stepBlinkClock(clock: BlinkClock, dtMs: number, random: () => number, reduced: boolean): number {
  if (reduced) {
    clock.active = 0;
    clock.dur = 0;
    return 0;
  }
  const dt = Number.isFinite(dtMs) && dtMs > 0 ? dtMs : 0;
  if (clock.active > 0) {
    clock.active += dt;
    if (clock.active >= clock.dur) {
      clock.active = 0;
      clock.dur = 0;
      clock.waitLeft = blinkGapMs(random());
      return 0;
    }
    return blinkEase(clock.active / clock.dur);
  }
  clock.waitLeft -= dt;
  if (clock.waitLeft > 0) return 0;
  clock.dur = blinkClosedMs(random());
  clock.active = Math.max(dt, 0.001);
  if (clock.active >= clock.dur) {
    clock.active = 0;
    clock.dur = 0;
    clock.waitLeft = blinkGapMs(random());
    return 0;
  }
  return blinkEase(clock.active / clock.dur);
}

/**
 * Schedules one character's blinks. Returns a stop function that clears every timer.
 * `reducedMotion` schedules nothing, so the eyes stay open.
 * `schedule` must not run `fn` synchronously.
 * The first wait is `offsetMs`, then every later wait is `waitMs`.
 */
export function startBeDaBlinkLoop(options: {
  level: number;
  reducedMotion: boolean;
  blink: (closedMs: number) => void;
  random?: () => number;
  schedule?: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  cancel?: (id: ReturnType<typeof setTimeout>) => void;
}): () => void {
  if (options.reducedMotion) return () => {};

  const timing = beDaIdleTiming(options.level);
  const random = options.random ?? Math.random;
  const schedule = options.schedule ?? ((fn, ms) => setTimeout(fn, ms));
  const cancel = options.cancel ?? ((id) => clearTimeout(id));
  let stopped = false;
  let first = true;
  const pending = new Set<ReturnType<typeof setTimeout>>();

  const arm = (fn: () => void, ms: number) => {
    const id = schedule(() => {
      pending.delete(id);
      if (!stopped) fn();
    }, ms);
    pending.add(id);
  };

  const loop = () => {
    if (stopped) return;
    const wait = first ? timing.offsetMs(random()) : timing.waitMs(random());
    first = false;
    arm(() => {
      options.blink(timing.blinkMs(random()));
      loop();
    }, wait);
  };

  loop();

  return () => {
    stopped = true;
    for (const id of pending) cancel(id);
    pending.clear();
  };
}
