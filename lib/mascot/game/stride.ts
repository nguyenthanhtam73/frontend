/**
 * Private-room gait. She walks in a straight line, a little slower at the
 * start and the stop. Feet stay with the distance she covers, the body stays
 * upright, and a left/right turn eases through a narrow scale instead of flipping.
 */

import type { WalkGrid, WalkPoint } from "@/lib/mascot/game/lobby-walk";
import { roomRoute, roomStepTo } from "@/lib/mascot/game/room-walk";

export type KeyDirs = { up: boolean; down: boolean; left: boolean; right: boolean };

export type Travel = {
  x: number;
  y: number;
  speed: number;
  phase: number;
  /** Displayed facing. -1 is left, 1 is right. Passes through 0 on a turn. */
  face: number;
  faceTo: -1 | 1;
  goal: WalkPoint | null;
  route: WalkPoint[];
  heading: { x: number; y: number } | null;
  gone: number;
};

/**
 * One step covers this many seconds of cruise speed.
 * Short legs take short steps (~14px at the room's walk speed) so the
 * planted foot stays down without the pants flying apart.
 */
export const STEP_SEC = 0.16;
/** World units over which speed eases in and out. */
export const PACE_RAMP = 0.045;
export const STEP_LIFT_PX = 8;
/** Peak vertical bob. Kept under 2px so she does not rock. */
export const BOB_PX = 1.5;
/** Degrees added to the short hanging sleeves. The drawing itself does not change. */
export const ARM_DEG = 5;
const TURN_HALF_S = 0.075;
const ARRIVE = 0.004;

export function directionFromKeys(held: KeyDirs): { x: number; y: number } | null {
  const x = (held.right ? 1 : 0) - (held.left ? 1 : 0);
  const y = (held.down ? 1 : 0) - (held.up ? 1 : 0);
  if (x === 0 && y === 0) return null;
  const len = Math.hypot(x, y);
  return { x: x / len, y: y / len };
}

/** 0.38 at the first and last step of a trip, 1 along the middle. */
export function paceFactor(gone: number, left: number): number {
  const start = gone <= 0 ? 0 : Math.min(1, gone / PACE_RAMP);
  const stop = left <= 0 ? 0 : Math.min(1, left / PACE_RAMP);
  return 0.38 + 0.62 * Math.min(start, stop);
}

/** Full left-then-right cycle, in world units, at cruise speed. */
export function strideNorm(cruise: number): number {
  return Math.max(0.02, cruise) * STEP_SEC * 2;
}

/** Screen pixels one planted foot travels before the other one takes over. */
export function stepPixels(cruise: number, width: number): number {
  return (strideNorm(cruise) / 2) * Math.max(1, width);
}

export function createTravel(at: WalkPoint): Travel {
  return {
    x: at.x,
    y: at.y,
    speed: 0,
    phase: 0,
    face: 1,
    faceTo: 1,
    goal: null,
    route: [],
    heading: null,
    gone: 0,
  };
}

export function pathLeft(travel: Pick<Travel, "x" | "y" | "goal" | "route">): number {
  if (!travel.goal) return 0;
  let left = Math.hypot(travel.goal.x - travel.x, travel.goal.y - travel.y);
  let prev = travel.goal;
  for (const point of travel.route) {
    left += Math.hypot(point.x - prev.x, point.y - prev.y);
    prev = point;
  }
  return left;
}

/** Tap anywhere. Furniture and the wall become the nearest open floor, then a straight route. */
export function queueTap(travel: Travel, grid: WalkGrid, tap: WalkPoint): Travel {
  const route = roomRoute(grid, travel, { x: tap.x, y: tap.y });
  return {
    ...travel,
    goal: route[0] ?? null,
    route: route.slice(1),
    gone: 0,
    heading: null,
    speed: travel.speed,
  };
}

/**
 * ScaleX eases to 0, then out to the new side. A single frame never flips the sign
 * while the old facing is still wide.
 */
export function stepFace(shown: number, target: -1 | 1, dt: number): number {
  const delta = Math.max(0, dt) / TURN_HALF_S;
  const sign = shown < -0.001 ? -1 : shown > 0.001 ? 1 : 0;
  if (sign === 0 || sign === target) {
    const next = shown + Math.sign(target - shown || target) * Math.min(Math.abs(target - shown), delta);
    return Math.abs(next - target) < 0.02 ? target : next;
  }
  const next = shown - sign * Math.min(Math.abs(shown), delta);
  return Math.abs(next) < 0.02 ? 0 : next;
}

export type FootPose = {
  bob: number;
  lx: number;
  ly: number;
  rx: number;
  ry: number;
  arm: number;
};

const STILL: FootPose = { bob: 0, lx: 0, ly: 0, rx: 0, ry: 0, arm: 0 };

function liftOf(u: number): number {
  const lift = Math.sin(u * Math.PI) * STEP_LIFT_PX;
  return lift === 0 ? 0 : -lift;
}

/**
 * Offsets are in character pixels. A planted foot moves backward with the body
 * so it stays on the ground. The other foot lifts and swings forward.
 * Idle is feet together, no bob, no arm swing.
 */
export function footPose(phase: number, moving: boolean, stepPx: number, reduced: boolean): FootPose {
  if (!moving) return STILL;
  const turn = (phase / (Math.PI * 2)) % 1;
  const t = turn < 0 ? turn + 1 : turn;
  const half = stepPx / 2;
  const span = stepPx;
  let lx = 0;
  let ly = 0;
  let rx = 0;
  let ry = 0;
  if (t < 0.5) {
    const u = t / 0.5;
    lx = half - u * span;
    rx = -half + u * span;
    ry = liftOf(u);
  } else {
    const u = (t - 0.5) / 0.5;
    rx = half - u * span;
    lx = -half + u * span;
    ly = liftOf(u);
  }
  const bobMag = Math.abs(Math.sin(t * Math.PI * 2)) * BOB_PX;
  return {
    bob: reduced || bobMag === 0 ? 0 : -bobMag,
    lx,
    ly,
    rx,
    ry,
    arm: reduced ? 0 : Math.sin(t * Math.PI * 2) * ARM_DEG,
  };
}

function approach(current: number, target: number, dt: number, rate: number): number {
  const k = 1 - Math.exp(-rate * dt);
  return current + (target - current) * k;
}

function slideTo(grid: WalkGrid, from: WalkPoint, to: WalkPoint): WalkPoint {
  const direct = roomStepTo(grid, from, to);
  if (Math.hypot(direct.x - from.x, direct.y - from.y) > 1e-5) return direct;
  const xOnly = roomStepTo(grid, from, { x: to.x, y: from.y });
  const yOnly = roomStepTo(grid, from, { x: from.x, y: to.y });
  const xd = Math.hypot(xOnly.x - from.x, xOnly.y - from.y);
  const yd = Math.hypot(yOnly.x - from.x, yOnly.y - from.y);
  return xd >= yd ? xOnly : yOnly;
}

/**
 * `dir` is a held key vector (already normalized). Null follows a tap route,
 * then coasts to a stop. Reduced motion does not change the path.
 */
export function stepTravel(
  travel: Travel,
  dt: number,
  grid: WalkGrid,
  input: { dir: { x: number; y: number } | null; cruise: number },
): Travel {
  const safe = Math.min(0.05, Math.max(0, dt));
  const next: Travel = { ...travel, route: travel.route.slice() };
  const cruise = Math.max(0.02, input.cruise);

  if (input.dir) {
    next.goal = null;
    next.route = [];
    next.gone = 0;
    next.heading = input.dir;
    next.speed = approach(next.speed, cruise, safe, 6);
  } else if (next.goal) {
    const left = pathLeft(next);
    next.speed = cruise * paceFactor(next.gone, left);
    const dx = next.goal.x - next.x;
    const dy = next.goal.y - next.y;
    const dist = Math.hypot(dx, dy) || 1;
    next.heading = { x: dx / dist, y: dy / dist };
  } else if (next.heading && next.speed > 0) {
    next.speed = approach(next.speed, 0, safe, 7);
    if (next.speed < cruise * 0.08) next.speed = 0;
  } else {
    next.speed = 0;
    next.heading = null;
  }

  if (!next.heading || next.speed <= 0) {
    next.speed = 0;
    next.heading = next.goal ? next.heading : null;
    next.face = stepFace(next.face, next.faceTo, safe);
    return next;
  }

  const step = next.speed * safe;
  const want = { x: next.x + next.heading.x * step, y: next.y + next.heading.y * step };
  if (next.goal) {
    const dist = Math.hypot(next.goal.x - next.x, next.goal.y - next.y);
    if (dist <= step) {
      want.x = next.goal.x;
      want.y = next.goal.y;
    }
  }
  const from = { x: next.x, y: next.y };
  const placed = input.dir ? slideTo(grid, from, want) : roomStepTo(grid, from, want);
  const moved = Math.hypot(placed.x - from.x, placed.y - from.y);
  next.x = placed.x;
  next.y = placed.y;
  next.gone += moved;
  if (moved > 0) next.phase += (moved / strideNorm(cruise)) * Math.PI * 2;

  if (Math.abs(next.heading.x) > Math.abs(next.heading.y) * 0.45 && Math.abs(next.heading.x) > 0.001) {
    next.faceTo = next.heading.x < 0 ? -1 : 1;
  }
  next.face = stepFace(next.face, next.faceTo, safe);

  if (next.goal && Math.hypot(next.goal.x - next.x, next.goal.y - next.y) <= ARRIVE) {
    next.x = next.goal.x;
    next.y = next.goal.y;
    const following = next.route.shift() ?? null;
    next.goal = following;
    if (!following) {
      next.speed = 0;
      next.heading = null;
    }
  } else if (next.goal && moved < 1e-5 && step > 1e-4) {
    next.goal = null;
    next.route = [];
    next.speed = 0;
    next.heading = null;
  }
  return next;
}
