/**
 * Private-room gait. She walks in a straight line, a little slower at the
 * start and the stop. One footfall is a fixed screen distance, so the planted
 * foot stays on the ground. The body stays upright. Facing flips in one frame.
 */

import type { WalkGrid, WalkPoint } from "@/lib/mascot/game/lobby-walk";
import { roomRoute, roomStepTo } from "@/lib/mascot/game/room-walk";

export type KeyDirs = { up: boolean; down: boolean; left: boolean; right: boolean };

export type Travel = {
  x: number;
  y: number;
  speed: number;
  phase: number;
  /** Displayed facing. -1 is left, 1 is right. Flips in one frame. */
  face: number;
  faceTo: -1 | 1;
  goal: WalkPoint | null;
  route: WalkPoint[];
  heading: { x: number; y: number } | null;
  gone: number;
};

/** One footfall per this many screen pixels. Same on a phone, an iPad, and a close-up. */
export const STEP_PX = 20;
/** World units over which speed eases in and out. */
export const PACE_RAMP = 0.045;
export const STEP_LIFT_PX = 8;
/** Peak vertical bob. Kept under 2px so she does not rock. */
export const BOB_PX = 1.5;
/** Degrees added to the short hanging sleeves. The drawing itself does not change. */
export const ARM_DEG = 5;
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

/** Screen pixels the body just moved. X uses the room width, Y the room height. */
export function screenTravel(dx: number, dy: number, width: number, height: number): number {
  return Math.hypot(dx * Math.max(1, width), dy * Math.max(1, height));
}

/** Half a cycle (one footfall) per STEP_PX. */
export function phaseForPixels(screenPx: number): number {
  if (screenPx <= 0) return 0;
  return (screenPx / STEP_PX) * Math.PI;
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

/** Her face is nearly symmetric, so a turn is one frame. No horizontal squeeze. */
export function stepFace(_shown: number, target: -1 | 1): -1 | 1 {
  return target;
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
 * Offsets are inside the facing flip: screen X is local X times `face`.
 * `dir` is the screen direction she is moving (not normalized). A planted foot
 * travels STEP_PX backward along that line, so it stays on the ground.
 * Idle is feet together, no bob, no arm swing.
 */
export function footPose(
  phase: number,
  moving: boolean,
  reduced: boolean,
  dir: { x: number; y: number } | null,
  face: -1 | 1,
): FootPose {
  if (!moving || !dir) return STILL;
  const len = Math.hypot(dir.x, dir.y);
  if (len < 1e-6) return STILL;
  const ux = dir.x / len;
  const uy = dir.y / len;
  const turn = (phase / (Math.PI * 2)) % 1;
  const t = turn < 0 ? turn + 1 : turn;
  const half = STEP_PX / 2;
  const place = (along: number, lift: number) => ({
    x: (ux * along) / face,
    y: uy * along + lift,
  });
  const u = t < 0.5 ? t / 0.5 : (t - 0.5) / 0.5;
  const planted = place(half - u * STEP_PX, 0);
  const swing = place(-half + u * STEP_PX, liftOf(u));
  const left = t < 0.5 ? planted : swing;
  const right = t < 0.5 ? swing : planted;
  const bobMag = Math.abs(Math.sin(t * Math.PI * 2)) * BOB_PX;
  return {
    bob: reduced || bobMag === 0 ? 0 : -bobMag,
    lx: left.x,
    ly: left.y,
    rx: right.x,
    ry: right.y,
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
  input: { dir: { x: number; y: number } | null; cruise: number; width: number; height: number },
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
    next.face = stepFace(next.face, next.faceTo);
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
  const pixels = screenTravel(placed.x - from.x, placed.y - from.y, input.width, input.height);
  if (pixels > 0) next.phase += phaseForPixels(pixels);

  if (Math.abs(next.heading.x) > Math.abs(next.heading.y) * 0.45 && Math.abs(next.heading.x) > 0.001) {
    next.faceTo = next.heading.x < 0 ? -1 : 1;
  }
  next.face = stepFace(next.face, next.faceTo);

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
