/**
 * Client-only motion for the shared lobby and the spa floor.
 * Positions stay in 0–1 world space. The screen draws them with transforms.
 * Server messages are unchanged; callers still send at the existing cap.
 */

export const ZOOM_MIN = 0.6;
export const ZOOM_MAX = 2.5;
/** Glide remote players across the gap between 4 Hz ticks. */
export const REMOTE_GLIDE_MS = 220;

export type Point = { x: number; y: number };

export type Bounds = { minX: number; maxX: number; minY: number; maxY: number };

export type Obstacle = { x: number; y: number; rx: number; ry: number };

export type Camera = { x: number; y: number; scale: number };

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

/** Plaza the feet may use. Normalized 0–1, same space the server stores. */
export const LOBBY_BOUNDS: Bounds = { minX: 0.06, maxX: 0.94, minY: 0.18, maxY: 0.88 };

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
): Walker {
  const safeDt = Math.min(0.05, Math.max(0, dt));
  if (!walker.goal) {
    return { ...walker, vx: 0, vy: 0, squash: approach(walker.squash, 1, safeDt, 10) };
  }
  const goal = obstacle
    ? steerGoal(walker, walker.goal, obstacle, bounds)
    : clampPoint(walker.goal, bounds);
  const dx = goal.x - walker.x;
  const dy = goal.y - walker.y;
  const dist = Math.hypot(dx, dy);
  if (reduced || dist < 0.008) {
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
  const arrive = Math.min(1, dist / 0.18);
  const speed = MAX_SPEED * Math.max(0.22, arrive);
  const blend = 1 - Math.exp(-ACCEL * safeDt);
  let vx = walker.vx + ((dx / dist) * speed - walker.vx) * blend;
  let vy = walker.vy + ((dy / dist) * speed - walker.vy) * blend;
  let nx = walker.x + vx * safeDt;
  let ny = walker.y + vy * safeDt;
  if (vx * (goal.x - nx) + vy * (goal.y - ny) < 0) {
    nx = goal.x;
    ny = goal.y;
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
  const moving = Math.hypot(vx, vy) > 0.025;
  const phase = walker.phase + (moving ? safeDt * 11 : 0);
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
): Camera {
  const width = worldW * camera.scale;
  const height = worldH * camera.scale;
  let x = camera.x;
  let y = camera.y;
  if (width <= viewW) x = (viewW - width) / 2;
  else x = clamp(x, viewW - width, 0);
  if (height <= viewH) y = (viewH - height) / 2;
  else y = clamp(y, viewH - height, 0);
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
): Camera {
  if (!follow) return camera;
  const tx = viewW * 0.5 - playerX * worldW * camera.scale;
  const ty = viewH * 0.46 - playerY * worldH * camera.scale;
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
