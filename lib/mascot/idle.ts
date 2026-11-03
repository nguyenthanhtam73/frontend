/**
 * Bé Da idle blink (motion.js `bdStart`, idle only).
 * Glow levels 1–2 are sleepy. Breathing duration lives in CSS on `.bd-figure`.
 * Tap, drag, hop, and split head/shadow motion are not part of this schedule.
 */

export type BeDaIdleTiming = {
  sleepy: boolean;
  /** Closed-lid fade. Levels 1–2 hold the blink longer. */
  blinkMs: number;
  /** Delay until the next blink. Awake 2.5–6s, sleepy 3–6s. */
  waitMs: (unit: number) => number;
  /**
   * Gap before a second blink, or null.
   * Awake ~18% and 260ms. Sleepy 8% and 420ms (after the longer fade).
   */
  doubleBlinkGapMs: (unit: number) => number | null;
};

/** Levels 1 and 2 match motion.css `[data-level="1"|"2"]`. Anything else is the awake idle. */
export function beDaIdleIsSleepy(level: number): boolean {
  return level === 1 || level === 2;
}

export function beDaIdleTiming(level: number): BeDaIdleTiming {
  const sleepy = beDaIdleIsSleepy(level);
  return {
    sleepy,
    blinkMs: sleepy ? 260 : 120,
    waitMs(unit: number) {
      const u = unitInterval(unit);
      return (sleepy ? 3000 : 2500) + u * (sleepy ? 3000 : 3500);
    },
    doubleBlinkGapMs(unit: number) {
      const chance = sleepy ? 0.08 : 0.18;
      if (!(unitInterval(unit) < chance)) return null;
      return sleepy ? 420 : 260;
    },
  };
}

function unitInterval(unit: number): number {
  if (!Number.isFinite(unit)) return 0;
  if (unit < 0) return 0;
  if (unit > 1) return 1;
  return unit;
}

/**
 * Schedules natural blinks. Returns a stop function that clears every timer.
 * `reducedMotion` schedules nothing. `schedule` must not run `fn` synchronously.
 */
export function startBeDaBlinkLoop(options: {
  level: number;
  reducedMotion: boolean;
  blink: () => void;
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
    arm(() => {
      options.blink();
      const gap = timing.doubleBlinkGapMs(random());
      if (gap != null) arm(() => options.blink(), gap);
      loop();
    }, timing.waitMs(random()));
  };

  loop();

  return () => {
    stopped = true;
    for (const id of pending) cancel(id);
    pending.clear();
  };
}
