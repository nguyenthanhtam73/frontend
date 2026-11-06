export type ShellClock = {
  stop: () => void;
};

/**
 * One animation loop. A hidden tab does not step, and the next visible frame
 * does not consume the time spent in the background.
 */
export function startShellClock(
  step: (dt: number, now: number) => void,
  hidden: () => boolean = () => document.hidden,
  raf: (cb: (now: number) => void) => number = (cb) => requestAnimationFrame(cb),
  cancel: (id: number) => void = (id) => cancelAnimationFrame(id),
): ShellClock {
  let id = 0;
  let last = 0;
  let stopped = false;

  const tick = (now: number) => {
    if (stopped) return;
    if (hidden()) {
      last = 0;
      id = raf(tick);
      return;
    }
    const dt = last === 0 ? 1 / 60 : Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt, now);
    id = raf(tick);
  };

  id = raf(tick);
  return {
    stop() {
      stopped = true;
      cancel(id);
    },
  };
}
