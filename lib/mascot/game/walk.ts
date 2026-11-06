/**
 * Client-only motion for the shared lobby and the spa floor.
 * Positions stay in 0–1 world space. The screen draws them with transforms.
 * Server messages are unchanged; callers still send at the existing cap.
 */

import { LOBBY_WORLD } from "@/lib/mascot/game/lobby";

export const ZOOM_MIN = 0.6;
export const ZOOM_MAX = 2.5;
/** Shortest glide between presence ticks. Longer walks stretch with the distance. */
export const REMOTE_GLIDE_MS = 220;
/** A jump farther than this is a respawn, not a step. Snap instead of sliding across the room. */
export const REMOTE_SNAP_PX = 160;
export const REMOTE_SNAP_NORM = 0.28;

export type Point = { x: number; y: number };

export type Bounds = { minX: number; maxX: number; minY: number; maxY: number };

export type Obstacle = { x: number; y: number; rx: number; ry: number };

export type Camera = { x: number; y: number; scale: number };

/** Screen pixels the follow camera keeps clear. Zero on every side matches the old frame. */
export type CameraPad = { top: number; right: number; bottom: number; left: number };

function cameraPad(pad?: CameraPad): CameraPad {
  return { top: pad?.top ?? 0, right: pad?.right ?? 0, bottom: pad?.bottom ?? 0, left: pad?.left ?? 0 };
}

export type Walker = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  goal: Point | null;
  phase: number;
  squash: number;
  /** -1 faces left, 1 faces right. Smoothed, never zero. */
  face: number;
};

/** Plaza the feet may use. Same rectangle as `LOBBY_WORLD.walk`. */
export const LOBBY_BOUNDS: Bounds = LOBBY_WORLD.walk;

/** Fountain basin in the same space as lobby taps (authored depth, not pixels). */
export const LOBBY_FOUNTAIN: Obstacle = { x: 0.5, y: 0.44, rx: 0.08, ry: 0.045 };

/**
 * Walkable spa floor in the room box below the top bar.
 * Same range Android uses: x 0.08–0.92, y 0.46–0.70.
 */
export const SPA_BOUNDS: Bounds = { minX: 0.08, maxX: 0.92, minY: 0.46, maxY: 0.7 };

/** Fallback mat in that same room box. The spa hook measures the real mat. */
export const SPA_MAT: Obstacle = { x: 0.5, y: 0.3, rx: 0.42, ry: 0.15 };

const MAX_SPEED = 0.45;
const ACCEL = 2.4;
/** How fast lobby feet move across the screen. */
export const LOBBY_SCREEN_PX_PER_SEC = 90;

/** Normalized units per second so the feet cover `LOBBY_SCREEN_PX_PER_SEC` CSS pixels. */
export function lobbyWorldSpeed(worldPx: number, scale = 1): number {
  const span = Math.max(1, worldPx) * Math.max(0.05, scale);
  return LOBBY_SCREEN_PX_PER_SEC / span;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function clampPoint(point: Point, bounds: Bounds): Point {
  return {
    x: clamp(point.x, bounds.minX, bounds.maxX),
    y: clamp(point.y, bounds.minY, bounds.maxY),
  };
}

export function ellipseContains(point: Point, obstacle: Obstacle): boolean {
  const nx = (point.x - obstacle.x) / obstacle.rx;
  const ny = (point.y - obstacle.y) / obstacle.ry;
  return nx * nx + ny * ny < 1;
}

export function segmentHits(from: Point, to: Point, obstacle: Obstacle): boolean {
  for (let i = 1; i <= 8; i += 1) {
    const t = i / 8;
    if (ellipseContains({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }, obstacle)) {
      return true;
    }
  }
  return false;
}

/** A point on the way to `goal` that does not cross the obstacle. */
export function steerGoal(from: Point, goal: Point, obstacle: Obstacle, bounds: Bounds): Point {
  const target = clampPoint(goal, bounds);
  if (!segmentHits(from, target, obstacle) && !ellipseContains(target, obstacle)) return target;
  const pads = [
    { x: -1.7, y: 0 },
    { x: 1.7, y: 0 },
    { x: 0, y: -1.7 },
    { x: 0, y: 1.7 },
    { x: -1.35, y: -1.35 },
    { x: 1.35, y: -1.35 },
    { x: -1.35, y: 1.35 },
    { x: 1.35, y: 1.35 },
  ]
    .map((pad) =>
      clampPoint(
        { x: obstacle.x + pad.x * obstacle.rx, y: obstacle.y + pad.y * obstacle.ry },
        bounds,
      ),
    )
    .filter((via) => !ellipseContains(via, obstacle) && !segmentHits(from, via, obstacle));
  const cost = (via: Point) =>
    Math.hypot(from.x - via.x, from.y - via.y) + Math.hypot(target.x - via.x, target.y - via.y);
  const clear = pads.filter((via) => !segmentHits(via, target, obstacle));
  const pool = (clear.length > 0 ? clear : pads).sort((a, b) => cost(a) - cost(b));
  const via = pool[0];
  if (via) return via;
  const sx = Math.sign(from.x - obstacle.x) || 1;
  const sy = Math.sign(from.y - obstacle.y) || 1;
  return clampPoint(
    { x: obstacle.x + sx * obstacle.rx * 1.7, y: obstacle.y + sy * obstacle.ry * 1.7 },
    bounds,
  );
}

function approach(current: number, target: number, dt: number, rate: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

export function createWalker(at: Point): Walker {
  return { x: at.x, y: at.y, vx: 0, vy: 0, goal: null, phase: 0, squash: 1, face: 1 };
}

/**
 * Ease toward the goal. Speed ramps up, then down near the point, and the
 * step never passes the steered goal. Reduced motion snaps.
 */
export function stepWalker(
  walker: Walker,
  dt: number,
  obstacle: Obstacle | null,
  bounds: Bounds,
  reduced: boolean,
  speed = MAX_SPEED,
  ease = false,
): Walker {
  const safeDt = Math.min(0.05, Math.max(0, dt));
  if (!walker.goal) {
    return {
      ...walker,
      vx: 0,
      vy: 0,
      squash: approach(walker.squash, 1, safeDt, 10),
      phase: walker.phase + safeDt * 1.4,
    };
  }
  const lobbyPace = ease;
  const goal = obstacle
    ? steerGoal(walker, walker.goal, obstacle, bounds)
    : clampPoint(walker.goal, bounds);
  const dx = goal.x - walker.x;
  const dy = goal.y - walker.y;
  const dist = Math.hypot(dx, dy);
  if (reduced || dist < (lobbyPace ? 0.002 : 0.008)) {
    const face = dx < -0.004 ? -1 : dx > 0.004 ? 1 : walker.face || 1;
    const real = clampPoint(walker.goal, bounds);
    const arrived = Math.hypot(real.x - goal.x, real.y - goal.y) < 0.02;
    return {
      ...walker,
      x: goal.x,
      y: goal.y,
      vx: 0,
      vy: 0,
      squash: 1,
      face,
      goal: arrived ? null : walker.goal,
    };
  }
  const easeDist = lobbyPace ? Math.max(0.02, (72 * speed) / LOBBY_SCREEN_PX_PER_SEC) : 0.18;
  const arrive = Math.min(1, dist / easeDist);
  const pace = speed * Math.max(lobbyPace ? 0.1 : 0.22, arrive);
  const blend = 1 - Math.exp(-(lobbyPace ? 1.15 : ACCEL) * safeDt);
  let vx = walker.vx + ((dx / dist) * pace - walker.vx) * blend;
  let vy = walker.vy + ((dy / dist) * pace - walker.vy) * blend;
  let nx = walker.x + vx * safeDt;
  let ny = walker.y + vy * safeDt;
  if (vx * (goal.x - nx) + vy * (goal.y - ny) < 0) {
    if (lobbyPace) {
      const step = Math.min(dist, Math.max(0, pace) * safeDt);
      nx = walker.x + (dx / dist) * step;
      ny = walker.y + (dy / dist) * step;
    } else {
      nx = goal.x;
      ny = goal.y;
    }
    vx = 0;
    vy = 0;
  }
  if (obstacle && ellipseContains({ x: nx, y: ny }, obstacle)) {
    const ox = (nx - obstacle.x) / obstacle.rx;
    const oy = (ny - obstacle.y) / obstacle.ry;
    const len = Math.hypot(ox, oy) || 1;
    nx = obstacle.x + (ox / len) * obstacle.rx * 1.04;
    ny = obstacle.y + (oy / len) * obstacle.ry * 1.04;
    vx *= 0.35;
    vy *= 0.35;
  }
  const placed = clampPoint({ x: nx, y: ny }, bounds);
  const moving = Math.hypot(vx, vy) > 0.02;
  const phase = walker.phase + (moving ? safeDt * (ease ? Math.PI * 2 : 11 * (speed / MAX_SPEED)) : 0);
  const squash = reduced
    ? 1
    : approach(walker.squash, moving ? 1 + Math.sin(phase) * 0.04 : 1, safeDt, moving ? 16 : 10);
  const wantFace = vx < -0.012 ? -1 : vx > 0.012 ? 1 : walker.face || 1;
  const face = reduced ? wantFace : approach(walker.face || wantFace, wantFace, safeDt, 9);
  const atGoal = Math.hypot(walker.goal.x - placed.x, walker.goal.y - placed.y) < 0.014 && Math.hypot(vx, vy) < 0.04;
  return {
    x: placed.x,
    y: placed.y,
    vx: atGoal ? 0 : vx,
    vy: atGoal ? 0 : vy,
    goal: atGoal ? null : walker.goal,
    phase,
    squash,
    face: face === 0 ? wantFace : face,
  };
}

export type Glide = {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  t0: number;
  dur: number;
  face: number;
};

/**
 * Step cycle. Bob is 0 when a foot plants, so the sprite rests on the ground,
 * and only lifts a few pixels between steps. Idle is a small breath, also up
 * from the ground. `lite` is accepted so older callers keep working; the cycle stays visible.
 */
export function walkPose(phase: number, moving: boolean, lite = false): {
  bob: number;
  sway: number;
  tilt: number;
  squash: number;
  shadowX: number;
  shadowY: number;
  plant: number;
} {
  void lite;
  if (!moving) {
    const breath = (1 - Math.cos(phase)) * 0.8;
    return { bob: breath === 0 ? 0 : -breath, sway: 0, tilt: 0, squash: 1, shadowX: 1, shadowY: 0.9, plant: 0 };
  }
  const step = Math.sin(phase);
  const lift = Math.abs(step);
  return {
    bob: lift === 0 ? 0 : -lift * 4,
    sway: step * 2.5,
    tilt: step * 5,
    squash: 1 - (1 - lift) * 0.04,
    shadowX: 0.86 + lift * 0.2,
    shadowY: 0.7 + (1 - lift) * 0.2,
    plant: step >= 0 ? 1 : -1,
  };
}

export function smoothstep(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

export function sampleGlide(glide: Glide, now: number): Point {
  const t = glide.dur <= 0 ? 1 : (now - glide.t0) / glide.dur;
  const s = smoothstep(t);
  return {
    x: glide.fromX + (glide.toX - glide.fromX) * s,
    y: glide.fromY + (glide.toY - glide.fromY) * s,
  };
}

/**
 * Glide from the figure's current drawn point to the next server point.
 * Duration matches the walk speed, so a 2 Hz update does not play as a dash.
 * A huge gap snaps. `previous` null means the figure is appearing now.
 */
export function planRemoteGlide(
  previous: Glide | null,
  x: number,
  y: number,
  now: number,
  worldW: number,
  worldH: number,
): Glide {
  const from = previous ? sampleGlide(previous, now) : { x, y };
  const dx = (x - from.x) * Math.max(1, worldW);
  const dy = (y - from.y) * Math.max(1, worldH);
  const dist = Math.hypot(dx, dy);
  const norm = Math.hypot(x - from.x, y - from.y);
  if (previous && (dist >= REMOTE_SNAP_PX || norm >= REMOTE_SNAP_NORM)) {
    const face = x - from.x < -0.003 ? -1 : x - from.x > 0.003 ? 1 : previous.face;
    return { fromX: x, fromY: y, toX: x, toY: y, t0: now, dur: 0, face };
  }
  const dur = Math.min(800, Math.max(REMOTE_GLIDE_MS, (dist / LOBBY_SCREEN_PX_PER_SEC) * 1000));
  return pushGlide(previous, x, y, now, dur);
}

/**
 * Local feet win. A server echo is applied before the player has walked,
 * or when it is far enough to be a different place. A stale nearby echo is ignored.
 */
export function adoptServerPoint(local: Point, server: Point, owned: boolean): Point {
  if (!owned) return { x: server.x, y: server.y };
  if (Math.hypot(server.x - local.x, server.y - local.y) >= REMOTE_SNAP_NORM) return { x: server.x, y: server.y };
  return local;
}

/** Start a glide from wherever the figure is drawn now. Same point is a no-op. */
export function pushGlide(previous: Glide | null, x: number, y: number, now: number, dur = REMOTE_GLIDE_MS): Glide {
  const from = previous ? sampleGlide(previous, now) : { x, y };
  const face = x - from.x < -0.003 ? -1 : x - from.x > 0.003 ? 1 : previous?.face ?? 1;
  if (Math.hypot(x - from.x, y - from.y) < 0.0008) {
    return { fromX: x, fromY: y, toX: x, toY: y, t0: now, dur, face };
  }
  return { fromX: from.x, fromY: from.y, toX: x, toY: y, t0: now, dur, face };
}

export function zoomAt(camera: Camera, factor: number, focusX: number, focusY: number): Camera {
  const scale = clamp(camera.scale * factor, ZOOM_MIN, ZOOM_MAX);
  const k = scale / camera.scale;
  return {
    x: focusX - (focusX - camera.x) * k,
    y: focusY - (focusY - camera.y) * k,
    scale,
  };
}

/** Keep the scaled world covering the frame, or center it when it is smaller. */
export function clampCamera(
  camera: Camera,
  viewW: number,
  viewH: number,
  worldW: number,
  worldH: number,
  pad?: CameraPad,
): Camera {
  const p = cameraPad(pad);
  const width = worldW * camera.scale;
  const height = worldH * camera.scale;
  let x = camera.x;
  let y = camera.y;
  if (width + p.left + p.right <= viewW) x = p.left + (viewW - p.left - p.right - width) / 2;
  else x = clamp(x, viewW - p.right - width, p.left);
  if (height + p.top + p.bottom <= viewH) y = p.top + (viewH - p.top - p.bottom - height) / 2;
  else y = clamp(y, viewH - p.bottom - height, p.top);
  return { x, y, scale: camera.scale };
}

export function screenToWorld(screenX: number, screenY: number, camera: Camera): Point {
  return { x: (screenX - camera.x) / camera.scale, y: (screenY - camera.y) / camera.scale };
}

/** Ease the camera toward Bé Da. Panning turns this off until the next walk. */
export function followCamera(
  camera: Camera,
  playerX: number,
  playerY: number,
  viewW: number,
  viewH: number,
  worldW: number,
  worldH: number,
  dt: number,
  follow: boolean,
  pad?: CameraPad,
): Camera {
  if (!follow) return camera;
  const p = cameraPad(pad);
  const anchorX = p.left + (viewW - p.left - p.right) * 0.5;
  const anchorY = p.top + (viewH - p.top - p.bottom) * 0.46;
  const tx = anchorX - playerX * worldW * camera.scale;
  const ty = anchorY - playerY * worldH * camera.scale;
  const k = 1 - Math.exp(-3.2 * Math.min(0.05, Math.max(0, dt)));
  return { ...camera, x: camera.x + (tx - camera.x) * k, y: camera.y + (ty - camera.y) * k };
}

export function viewportFrame(
  camera: Camera,
  viewW: number,
  viewH: number,
  worldW: number,
  worldH: number,
): { left: number; top: number; width: number; height: number } {
  const width = clamp(viewW / (camera.scale * worldW), 0.05, 1);
  const height = clamp(viewH / (camera.scale * worldH), 0.05, 1);
  const left = clamp(-camera.x / (camera.scale * worldW), 0, 1 - width);
  const top = clamp(-camera.y / (camera.scale * worldH), 0, 1 - height);
  return { left, top, width, height };
}
