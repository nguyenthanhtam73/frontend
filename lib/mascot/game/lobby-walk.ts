/**
 * Lobby foot traffic. The mask image is white where Bé Da may stand and black
 * everywhere else. Swap `public/mascot/lobby/walk-mask.png` when the designer
 * sends the real paths. Cells are about 20 world pixels, inside the 16–24 range.
 */

export const LOBBY_WALK_MASK = "/mascot/lobby/walk-mask.png?v=4cf563d3f4";
export const WALK_CELL_PX = 20;

export type WalkPoint = { x: number; y: number };

export type WalkGrid = {
  cols: number;
  rows: number;
  /** 1 = walkable, row-major. */
  walk: Uint8Array;
};

const DIRS: readonly { dc: number; dr: number; cost: number }[] = [
  { dc: 1, dr: 0, cost: 1 },
  { dc: -1, dr: 0, cost: 1 },
  { dc: 0, dr: 1, cost: 1 },
  { dc: 0, dr: -1, cost: 1 },
  { dc: 1, dr: 1, cost: Math.SQRT2 },
  { dc: 1, dr: -1, cost: Math.SQRT2 },
  { dc: -1, dr: 1, cost: Math.SQRT2 },
  { dc: -1, dr: -1, cost: Math.SQRT2 },
];

/** Downsample a white/black mask. A cell is walkable when most of its pixels are light. */
export function gridFromMask(
  pixels: Uint8Array | Uint8ClampedArray,
  imageW: number,
  imageH: number,
  cols: number,
  rows: number,
  stride = 4,
): WalkGrid {
  const walk = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r += 1) {
    const y0 = Math.floor((r * imageH) / rows);
    const y1 = Math.max(y0 + 1, Math.floor(((r + 1) * imageH) / rows));
    for (let c = 0; c < cols; c += 1) {
      const x0 = Math.floor((c * imageW) / cols);
      const x1 = Math.max(x0 + 1, Math.floor(((c + 1) * imageW) / cols));
      let light = 0;
      let count = 0;
      for (let y = y0; y < y1; y += 2) {
        for (let x = x0; x < x1; x += 2) {
          light += pixels[(y * imageW + x) * stride] >= 128 ? 1 : 0;
          count += 1;
        }
      }
      walk[r * cols + c] = light * 2 >= count ? 1 : 0;
    }
  }
  return { cols, rows, walk };
}

export function gridSize(worldW: number, worldH: number): { cols: number; rows: number } {
  return {
    cols: Math.max(8, Math.round(worldW / WALK_CELL_PX)),
    rows: Math.max(8, Math.round(worldH / WALK_CELL_PX)),
  };
}

function cellOf(grid: WalkGrid, x: number, y: number): { c: number; r: number } {
  return {
    c: Math.min(grid.cols - 1, Math.max(0, Math.floor(x * grid.cols))),
    r: Math.min(grid.rows - 1, Math.max(0, Math.floor(y * grid.rows))),
  };
}

function centerOf(grid: WalkGrid, c: number, r: number): WalkPoint {
  return { x: (c + 0.5) / grid.cols, y: (r + 0.5) / grid.rows };
}

export function isWalkable(grid: WalkGrid, x: number, y: number): boolean {
  const { c, r } = cellOf(grid, x, y);
  return grid.walk[r * grid.cols + c] === 1;
}

/** Closest walkable cell center. The point itself when it is already on a path. */
export function nearestWalkable(grid: WalkGrid, x: number, y: number): WalkPoint {
  const start = cellOf(grid, x, y);
  const startIndex = start.r * grid.cols + start.c;
  if (grid.walk[startIndex]) return centerOf(grid, start.c, start.r);
  const seen = new Uint8Array(grid.walk.length);
  const queue = [startIndex];
  seen[startIndex] = 1;
  let head = 0;
  while (head < queue.length) {
    const cur = queue[head]!;
    head += 1;
    const c = cur % grid.cols;
    const r = Math.floor(cur / grid.cols);
    for (const dir of DIRS) {
      const nc = c + dir.dc;
      const nr = r + dir.dr;
      if (nc < 0 || nr < 0 || nc >= grid.cols || nr >= grid.rows) continue;
      const next = nr * grid.cols + nc;
      if (seen[next]) continue;
      if (grid.walk[next]) return centerOf(grid, nc, nr);
      seen[next] = 1;
      queue.push(next);
    }
  }
  return centerOf(grid, start.c, start.r);
}

function walkableCell(grid: WalkGrid, c: number, r: number): boolean {
  if (c < 0 || r < 0 || c >= grid.cols || r >= grid.rows) return false;
  return grid.walk[r * grid.cols + c] === 1;
}

/**
 * Every cell the segment crosses, including the two sides of a diagonal step.
 * Rounding the line onto one cell used to skip a blocked corner and cut the fountain.
 */
function lineClear(grid: WalkGrid, from: { c: number; r: number }, to: { c: number; r: number }): boolean {
  let c = from.c;
  let r = from.r;
  const dc = Math.abs(to.c - from.c);
  const dr = Math.abs(to.r - from.r);
  const sc = to.c > from.c ? 1 : to.c < from.c ? -1 : 0;
  const sr = to.r > from.r ? 1 : to.r < from.r ? -1 : 0;
  let err = dc - dr;
  while (true) {
    if (!walkableCell(grid, c, r)) return false;
    if (c === to.c && r === to.r) return true;
    const doubled = err * 2;
    const stepC = doubled > -dr;
    const stepR = doubled < dc;
    if (stepC && stepR && (!walkableCell(grid, c + sc, r) || !walkableCell(grid, c, r + sr))) return false;
    if (stepC) {
      err -= dr;
      c += sc;
    }
    if (stepR) {
      err += dc;
      r += sr;
    }
  }
}

/** True when the straight segment between two points stays on walkable cells. */
export function segmentStaysWalkable(grid: WalkGrid, from: WalkPoint, to: WalkPoint): boolean {
  return lineClear(grid, cellOf(grid, from.x, from.y), cellOf(grid, to.x, to.y));
}

/**
 * The fountain basin is not a path, even when a coarse cell is mostly the ring around it.
 * A cell is blocked when any corner or its center sits inside the ellipse.
 */
export function blockEllipse(
  grid: WalkGrid,
  obstacle: { x: number; y: number; rx: number; ry: number },
): void {
  const { cols, rows, walk } = grid;
  for (let r = 0; r < rows; r += 1) {
    const y0 = r / rows;
    const y1 = (r + 1) / rows;
    for (let c = 0; c < cols; c += 1) {
      const x0 = c / cols;
      const x1 = (c + 1) / cols;
      const samples = [
        [x0, y0],
        [x1, y0],
        [x0, y1],
        [x1, y1],
        [(x0 + x1) / 2, (y0 + y1) / 2],
      ];
      for (const [x, y] of samples) {
        const nx = (x - obstacle.x) / obstacle.rx;
        const ny = (y - obstacle.y) / obstacle.ry;
        if (nx * nx + ny * ny <= 1) {
          walk[r * cols + c] = 0;
          break;
        }
      }
    }
  }
}

function reconstruct(parent: Int32Array, goal: number, cols: number): { c: number; r: number }[] {
  const cells: { c: number; r: number }[] = [];
  let cur = goal;
  while (cur >= 0) {
    cells.push({ c: cur % cols, r: Math.floor(cur / cols) });
    cur = parent[cur] ?? -1;
  }
  cells.reverse();
  return cells;
}

/** 8-direction A*, then string-pull so the route only keeps corners. One call per tap. */
export function findRoute(grid: WalkGrid, from: WalkPoint, to: WalkPoint): WalkPoint[] {
  const startPoint = nearestWalkable(grid, from.x, from.y);
  const start = cellOf(grid, startPoint.x, startPoint.y);
  const goalPoint = nearestWalkable(grid, to.x, to.y);
  const goal = cellOf(grid, goalPoint.x, goalPoint.y);
  const startIndex = start.r * grid.cols + start.c;
  const goalIndex = goal.r * grid.cols + goal.c;
  if (grid.walk[startIndex] !== 1) return [];
  if (startIndex === goalIndex) return [];

  const open: number[] = [startIndex];
  const gScore = new Float64Array(grid.walk.length);
  gScore.fill(Number.POSITIVE_INFINITY);
  gScore[startIndex] = 0;
  const parent = new Int32Array(grid.walk.length);
  parent.fill(-1);
  const seen = new Uint8Array(grid.walk.length);
  let best = startIndex;
  let bestDist = (start.c - goal.c) ** 2 + (start.r - goal.r) ** 2;

  while (open.length > 0) {
    let pick = 0;
    let bestF = Number.POSITIVE_INFINITY;
    for (let i = 0; i < open.length; i += 1) {
      const id = open[i]!;
      const c = id % grid.cols;
      const r = Math.floor(id / grid.cols);
      const f = gScore[id]! + Math.hypot(goal.c - c, goal.r - r);
      if (f < bestF) {
        bestF = f;
        pick = i;
      }
    }
    const current = open.splice(pick, 1)[0]!;
    if (current === goalIndex) {
      best = current;
      break;
    }
    if (seen[current]) continue;
    seen[current] = 1;
    const c = current % grid.cols;
    const r = Math.floor(current / grid.cols);
    for (const dir of DIRS) {
      const nc = c + dir.dc;
      const nr = r + dir.dr;
      if (nc < 0 || nr < 0 || nc >= grid.cols || nr >= grid.rows) continue;
      const next = nr * grid.cols + nc;
      if (grid.walk[next] !== 1 || seen[next]) continue;
      if (dir.dc !== 0 && dir.dr !== 0) {
        const sideA = r * grid.cols + nc;
        const sideB = nr * grid.cols + c;
        if (grid.walk[sideA] !== 1 || grid.walk[sideB] !== 1) continue;
      }
      const score = gScore[current]! + dir.cost;
      if (score >= gScore[next]!) continue;
      gScore[next] = score;
      parent[next] = current;
      open.push(next);
      const dist = (nc - goal.c) ** 2 + (nr - goal.r) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        best = next;
      }
    }
  }

  if (parent[best] < 0 && best !== startIndex) return [centerOf(grid, goal.c, goal.r)];
  const cells = reconstruct(parent, best, grid.cols);
  if (cells.length < 2) return [];
  const kept = [cells[0]!];
  let anchor = 0;
  while (anchor < cells.length - 1) {
    let next = cells.length - 1;
    while (next > anchor + 1 && !lineClear(grid, cells[anchor]!, cells[next]!)) next -= 1;
    kept.push(cells[next]!);
    anchor = next;
  }
  return kept.slice(1).map((cell) => centerOf(grid, cell.c, cell.r));
}
