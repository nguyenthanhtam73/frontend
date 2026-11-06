import type { GameClipId, GameHairId, GameOutfitId } from "@/lib/mascot/game/look";
import { defaultSnapshot, resolveBeDaView, type BeDaView } from "@/lib/mascot/model";

/**
 * SAMPLE lobby visitors.
 *
 * There is no friends endpoint. These are not accounts. Nicknames are playful
 * labels (weather, snacks), never a real name, email, or photo. The signed-in
 * person is drawn separately and labeled "Bạn" / "You".
 */
export type SampleLobbyFriend = {
  id: string;
  nickname: string;
  /** 0–1 across the wide world. */
  x: number;
  /** 0–1 down the plaza. Lower on the screen (higher y) draws larger. */
  y: number;
  mood: "normal" | "happy" | "sparkle" | "sleepy";
  /**
   * Which glow art to wear. Visual variety only — never printed.
   */
  glow: number;
  outfit: GameOutfitId;
  hair: GameHairId;
  clip: GameClipId | null;
  sample: true;
};

/**
 * Shared lobby world. Positions are normalized 0..1 over the whole world,
 * origin top-left, y at the feet. The server stores those fractions, not pixels.
 * Logical size is the square the 2048 texture is stretched onto.
 */
export const LOBBY_WORLD = {
  width: 2400,
  height: 2400,
  /**
   * At the minimum zoom the drawn world still covers the viewport by this
   * factor on both axes, so phone and iPad can pan in every direction.
   */
  minCover: 1.3,
  /**
   * Outer clamp. The walk mask is the real floor: paths and plazas only.
   * This rectangle just keeps feet off the extreme border.
   */
  walk: { minX: 0.05, maxX: 0.95, minY: 0.05, maxY: 0.95 },
  /** New arrivals. Random inside x±dx and y±dy. */
  spawn: { x: 0.5, y: 0.55, dx: 0.08, dy: 0.05 },
} as const;

/** Square pixel world. The long side of the viewport sets the size. */
export function lobbyWorldSize(viewW: number, viewH: number): { worldW: number; worldH: number } {
  const side = LOBBY_WORLD.minCover * Math.max(1, viewW, viewH);
  return { worldW: side, worldH: side };
}

/** Smallest scale that keeps the world at least `minCover` times the viewport. */
export function lobbyMinScale(viewW: number, viewH: number, worldW: number, worldH: number): number {
  return LOBBY_WORLD.minCover * Math.max(viewW / Math.max(1, worldW), viewH / Math.max(1, worldH));
}

/** Center of the arrival box. The live player uses `lobbySpawn` instead. */
export const LOBBY_PLAYER_SPOT = { x: LOBBY_WORLD.spawn.x, y: LOBBY_WORLD.spawn.y };

export type ScreenBox = { left: number; top: number; right: number; bottom: number };

/** Back button, zoom cluster, and the bottom menu, in screen pixels. */
export function lobbyChromePad(viewW: number): { top: number; right: number; bottom: number; left: number } {
  const nav = lobbyNavReservePx(viewW);
  return { top: 176, right: 148, bottom: nav, left: 68 };
}

export function lobbyExclusionZones(viewW: number, viewH: number): ScreenBox[] {
  const pad = lobbyChromePad(viewW);
  return [
    { left: 0, top: 0, right: pad.left, bottom: 68 },
    { left: viewW - pad.right, top: 0, right: viewW, bottom: pad.top },
    { left: 0, top: viewH - pad.bottom, right: viewW, bottom: viewH },
  ];
}

/** Approximate on-screen width of a name pill at the lobby's 12px weight. */
export function lobbyTagWidthPx(nickname: string): number {
  return Math.ceil(nickname.length * 7.8 + 28);
}

/** Figure plus the name pill, in world pixels at zoom 1. Origin is the top-left of the world. */
export function lobbyBodyBox(x: number, y: number, nickname: string, worldW: number, worldH: number): ScreenBox {
  const figW = 110 * (0.78 + 0.4 * y) * 0.78;
  const figH = figW * (250 / 220);
  const tagW = lobbyTagWidthPx(nickname) * 0.9;
  const width = Math.max(figW, tagW);
  const height = figH + 12;
  const cx = x * worldW;
  const feet = y * worldH;
  return { left: cx - width / 2, top: feet - height, right: cx + width / 2, bottom: feet + 4 };
}

export function screenBoxesOverlap(a: ScreenBox, b: ScreenBox, gap = 2): boolean {
  return a.left < b.right + gap && a.right + gap > b.left && a.top < b.bottom + gap && a.bottom + gap > b.top;
}

/**
 * How far apart figure boxes stay at the 390px lobby, zoom 1.
 * A pair that is closer than this on both axes counts as overlapping.
 */
export const LOBBY_FIGURE_GAP = 12;

/**
 * Figure plus name pill in world pixels at zoom 1.
 * Sized from the lobby art (84px) and the 11px name pill, which is what the screen measures.
 */
export function lobbyFigureBox(
  x: number,
  y: number,
  nickname: string,
  worldW: number,
  worldH: number,
  ms?: number,
): ScreenBox {
  const scale = ms ?? 0.78 + 0.4 * Math.min(1, Math.max(0, y));
  const figW = 84 * scale;
  const figH = figW * 1.45;
  const tagW = Math.ceil(nickname.length * 8.2 + 22);
  const width = Math.max(figW, tagW);
  const height = figH + 18;
  const cx = x * worldW;
  const feet = y * worldH;
  return { left: cx - width / 2, top: feet - height, right: cx + width / 2, bottom: feet + 6 };
}

/** Hard stop so a seat search cannot walk the cell list forever. */
export const LOBBY_SOLVE_MAX_PROBES = 128;

/** Seat searches while the camera is moving stay at least this far apart. */
export const LOBBY_SOLVE_INTERVAL_MS = 250;

export type LobbySeatInput = {
  id: string;
  nickname: string;
  homeX: number;
  homeY: number;
  /** Cell chosen last time, or -1. A clear cell is kept even when it is off screen. */
  cell: number;
};

export type LobbySeat = {
  id: string;
  cell: number;
  x: number;
  y: number;
  edge: number;
  hidden: boolean;
};

function lobbyScreenFigure(
  x: number,
  y: number,
  nickname: string,
  ms: number | undefined,
  cam: { x: number; y: number; scale: number },
  worldW: number,
  worldH: number,
): ScreenBox {
  const world = lobbyFigureBox(x, y, nickname, worldW, worldH, ms);
  const scale = cam.scale;
  return {
    left: cam.x + world.left * scale,
    top: cam.y + world.top * scale,
    right: cam.x + world.right * scale,
    bottom: cam.y + world.bottom * scale,
  };
}

function lobbySeatBlocked(
  box: ScreenBox,
  zones: readonly ScreenBox[],
  occupied: readonly ScreenBox[],
  viewW: number,
  viewH: number,
  edge: boolean,
): boolean {
  if (zones.some((zone) => screenBoxesOverlap(box, zone, 8))) return true;
  if (occupied.some((other) => screenBoxesOverlap(box, other, LOBBY_FIGURE_GAP))) return true;
  if (!edge) return false;
  const visible = box.bottom > 2 && box.top < viewH - 2 && box.right > 2 && box.left < viewW - 2;
  return visible && (box.left < 8 || box.right > viewW - 8);
}

/**
 * Pick a free cell for each sample visitor from their boxes, not from the DOM.
 * One probe checks one cell. A cell that is already clear stays put, on screen or not.
 */
export function solveLobbyCells(input: {
  samples: readonly LobbySeatInput[];
  player: { x: number; y: number; nickname: string };
  lives: readonly { x: number; y: number; nickname: string }[];
  cam: { x: number; y: number; scale: number };
  viewW: number;
  viewH: number;
  worldW: number;
  worldH: number;
}): { seats: LobbySeat[]; probes: number } {
  const zones = lobbyExclusionZones(input.viewW, input.viewH);
  // Own Bé Da and live people are not obstacles. A figure already placed stays
  // put when someone walks into them. Spawn and stroll choose a free cell first.
  void input.player;
  void input.lives;
  const occupied: ScreenBox[] = [];
  const used = new Set<number>();
  const seats: LobbySeat[] = [];
  let probes = 0;
  const sampleSize = (y: number) => 0.78 + Math.max(0, y) * 0.4;
  const probe = (index: number, nickname: string, edge: boolean): ScreenBox | null => {
    if (probes >= LOBBY_SOLVE_MAX_PROBES) return null;
    if (index < 0 || index >= LOBBY_SAMPLE_CELLS.length || used.has(index)) return null;
    probes += 1;
    const cell = LOBBY_SAMPLE_CELLS[index]!;
    const box = lobbyScreenFigure(cell.x, cell.y, nickname, sampleSize(cell.y), input.cam, input.worldW, input.worldH);
    if (lobbySeatBlocked(box, zones, occupied, input.viewW, input.viewH, edge)) return null;
    return box;
  };

  for (const sample of input.samples) {
    let chosen = -1;
    let box: ScreenBox | null = null;
    if (sample.cell >= 0) {
      // A seat they already have stays put when the camera slides them to the screen edge.
      box = probe(sample.cell, sample.nickname, false);
      if (box) chosen = sample.cell;
    }
    if (!box) {
      let best = Infinity;
      for (let index = 0; index < LOBBY_SAMPLE_CELLS.length; index += 1) {
        if (probes >= LOBBY_SOLVE_MAX_PROBES) break;
        const fit = probe(index, sample.nickname, true);
        if (!fit) continue;
        const cell = LOBBY_SAMPLE_CELLS[index]!;
        const onScreen = fit.bottom > 0 && fit.top < input.viewH && fit.right > 0 && fit.left < input.viewW;
        const dist = (cell.x - sample.homeX) ** 2 + (cell.y - sample.homeY) ** 2;
        const score = (onScreen ? 0 : 100) + dist;
        if (score < best) {
          best = score;
          chosen = index;
          box = fit;
        }
      }
    }
    if (chosen < 0 || !box) {
      seats.push({ id: sample.id, cell: -1, x: sample.homeX, y: sample.homeY, edge: 0, hidden: true });
      continue;
    }
    used.add(chosen);
    occupied.push(box);
    const cell = LOBBY_SAMPLE_CELLS[chosen]!;
    const tagW = lobbyTagWidthPx(sample.nickname);
    const center = input.cam.x + cell.x * input.worldW * input.cam.scale;
    const left = center - tagW / 2;
    const right = left + tagW;
    const tagVisible = right > 2 && left < input.viewW - 2;
    const edge = tagVisible ? tagEdgeDelta({ left, right }, { left: 0, right: input.viewW }) : 0;
    seats.push({ id: sample.id, cell: chosen, x: cell.x, y: cell.y, edge, hidden: false });
  }
  return { seats, probes };
}

/**
 * Push overlapping name pills apart on the vertical axis.
 * The pill that is already lower on the screen moves further down, so a
 * neighbor's body never covers the letters. `x` is the pill center, `y` its top.
 */
export function stackNameLabels<T extends { x: number; y: number; w: number; h: number }>(labels: readonly T[]): T[] {
  const placed = labels.map((label) => ({ ...label }));
  for (let pass = 0; pass < 6; pass += 1) {
    placed.sort((a, b) => a.y - b.y || a.x - b.x);
    let moved = false;
    for (let i = 0; i < placed.length; i += 1) {
      const a = placed[i]!;
      for (let j = i + 1; j < placed.length; j += 1) {
        const b = placed[j]!;
        if (b.y >= a.y + a.h) break;
        const overlapX = (a.w + b.w) / 2 - Math.abs(a.x - b.x);
        const overlapY = (a.h + b.h) / 2 - Math.abs(a.y + a.h / 2 - (b.y + b.h / 2));
        if (overlapX <= 1 || overlapY <= 1) continue;
        const lower = a.y >= b.y ? a : b;
        lower.y += overlapY + 2;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return placed;
}

/** Shift or fade name labels that sit on each other. Never returns a new body position. */
export function nudgeLobbyLabels(
  tags: readonly { id: string; left: number; top: number; right: number; bottom: number }[],
): { id: string; nudge: number; fade: boolean }[] {
  const placed = tags.map((tag) => ({ ...tag, nudge: 0, fade: false }));
  const cap = Math.min(32, Math.max(1, placed.length * placed.length));
  let steps = 0;
  for (let i = 0; i < placed.length; i += 1) {
    for (let j = i + 1; j < placed.length; j += 1) {
      if (steps >= cap) break;
      steps += 1;
      const a = placed[i]!;
      const b = placed[j]!;
      const ix = Math.min(a.right + a.nudge, b.right + b.nudge) - Math.max(a.left + a.nudge, b.left + b.nudge);
      const iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ix <= 2 || iy <= 2) continue;
      const shift = Math.min(16, ix / 2 + 2);
      const front = a.top >= b.top ? a : b;
      const back = front === a ? b : a;
      front.nudge += front.left <= back.left ? -shift : shift;
    }
  }
  for (let i = 0; i < placed.length; i += 1) {
    for (let j = i + 1; j < placed.length; j += 1) {
      const a = placed[i]!;
      const b = placed[j]!;
      const ix = Math.min(a.right + a.nudge, b.right + b.nudge) - Math.max(a.left + a.nudge, b.left + b.nudge);
      const iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ix > 2 && iy > 2) {
        const back = a.top < b.top ? a : b;
        back.fade = true;
      }
    }
  }
  return placed.map((tag) => ({ id: tag.id, nudge: tag.nudge, fade: tag.fade }));
}

/** True when this figure's box meets a control while the camera is looking at them. */
export function lobbyFigureHitsChrome(
  x: number,
  y: number,
  nickname: string,
  ms?: number,
  view: { viewW: number; viewH: number } = { viewW: 390, viewH: 844 },
): boolean {
  const cam = lobbyOpeningCamera({ x, y }, view);
  const box = lobbyFigureBox(x, y, nickname, cam.worldW, cam.worldH, ms);
  const screen = {
    left: cam.x + box.left,
    top: cam.y + box.top,
    right: cam.x + box.right,
    bottom: cam.y + box.bottom,
  };
  if (screen.bottom <= 0 || screen.top >= cam.viewH || screen.right <= 0 || screen.left >= view.viewW) return false;
  return lobbyExclusionZones(view.viewW, view.viewH).some((zone) => screenBoxesOverlap(screen, zone, 8));
}

/** 2×6 floor cells, plus spare seats above the world. Floor spacing at 390px is wider than a figure and its name. */
const SAMPLE_COLS = [0.3, 0.7] as const;
const SAMPLE_ROWS = [0.24, 0.36, 0.48, 0.6, 0.72, 0.8] as const;

export const LOBBY_SAMPLE_CELLS: readonly { x: number; y: number }[] = (() => {
  const cells: { x: number; y: number }[] = [];
  for (const y of SAMPLE_ROWS) {
    for (const x of SAMPLE_COLS) cells.push({ x, y });
  }
  for (const y of [-0.42, -0.7, -0.98]) {
    cells.push({ x: 0.28, y }, { x: 0.72, y });
  }
  return cells;
})();

/** One visitor per staggered floor cell, so the homes themselves stay apart. */
export const LOBBY_SAMPLE_HOMES: readonly { x: number; y: number }[] = [
  { x: 0.3, y: 0.24 },
  { x: 0.7, y: 0.36 },
  { x: 0.3, y: 0.48 },
  { x: 0.7, y: 0.6 },
  { x: 0.3, y: 0.72 },
  { x: 0.7, y: 0.8 },
];

export const LOBBY_SAMPLE_CAP = LOBBY_SAMPLE_HOMES.length;

export const LOBBY_SAMPLE_IDS = ["suong-mai", "may-hong", "meo-may", "keo-deo", "chanh-leo", "gau-mo"] as const;

/**
 * Another floor cell whose figure box misses everyone already placed and the opening controls.
 * Spare cells above the world are not returned here; the lobby frame uses those only when the screen is full.
 */
export function lobbyFreeCell(
  prefer: { x: number; y: number },
  others: readonly { x: number; y: number; nickname: string }[],
  nickname: string,
  viewW = 390,
  viewH = 844,
): { x: number; y: number } {
  const { worldW, worldH } = lobbyWorldSize(viewW, viewH);
  const floor = LOBBY_SAMPLE_CELLS.filter((cell) => cell.y >= LOBBY_WORLD.walk.minY);
  const ordered = [...floor].sort((a, b) => {
    const da = (a.x - prefer.x) ** 2 + (a.y - prefer.y) ** 2;
    const db = (b.x - prefer.x) ** 2 + (b.y - prefer.y) ** 2;
    return da - db;
  });
  for (const cell of ordered) {
    const mine = lobbyFigureBox(cell.x, cell.y, nickname, worldW, worldH);
    const crowded = others.some((other) =>
      screenBoxesOverlap(mine, lobbyFigureBox(other.x, other.y, other.nickname, worldW, worldH), LOBBY_FIGURE_GAP),
    );
    if (crowded || lobbyFigureHitsChrome(cell.x, cell.y, nickname, undefined, { viewW, viewH })) continue;
    return cell;
  }
  return ordered[0] ?? clampLobbyPoint(prefer.x, prefer.y);
}

/** Camera on the spawn center, inset by the control pads. */
export function lobbyOpeningCamera(
  player: { x: number; y: number } = LOBBY_PLAYER_SPOT,
  view: { viewW: number; viewH: number } = { viewW: 390, viewH: 844 },
) {
  const { worldW, worldH } = lobbyWorldSize(view.viewW, view.viewH);
  const pad = lobbyChromePad(view.viewW);
  let x = pad.left + (view.viewW - pad.left - pad.right) * 0.5 - player.x * worldW;
  let y = pad.top + (view.viewH - pad.top - pad.bottom) * 0.46 - player.y * worldH;
  x = Math.min(pad.left, Math.max(view.viewW - pad.right - worldW, x));
  y = Math.min(pad.top, Math.max(view.viewH - pad.bottom - worldH, y));
  return { x, y, worldW, worldH, viewW: view.viewW, viewH: view.viewH, scale: 1 };
}

function bodyHitsZones(
  x: number,
  y: number,
  nickname: string,
  cam: { x: number; y: number; worldW: number; worldH: number; viewH: number },
  zones: readonly ScreenBox[],
): boolean {
  const box = lobbyBodyBox(x, y, nickname, cam.worldW, cam.worldH);
  const screen = {
    left: cam.x + box.left,
    top: cam.y + box.top,
    right: cam.x + box.right,
    bottom: cam.y + box.bottom,
  };
  if (screen.bottom <= 0 || screen.top >= cam.viewH) return false;
  return zones.some((zone) => screenBoxesOverlap(screen, zone, 0));
}

/**
 * A free floor cell for this visitor. A blocked cell is skipped — the figure is not slid a few pixels.
 */
export function sampleRenderSpot(
  spot: { x: number; y: number; nickname: string },
  others: readonly { x: number; y: number; nickname: string }[],
  viewW = 390,
  viewH = 844,
): { x: number; y: number } {
  return lobbyFreeCell(spot, others, spot.nickname, viewW, viewH);
}

/** True when this visitor's figure or name would sit under a control at the opening camera. */
export function sampleStandsUnderOpeningChrome(x: number, y: number, nickname = ""): boolean {
  const cam = lobbyOpeningCamera();
  return bodyHitsZones(x, y, nickname, cam, lobbyExclusionZones(cam.viewW, cam.viewH));
}

/**
 * Even spots across the whole walkable floor. Boxes do not overlap at zoom 1,
 * at most three stand near the arrival box, and none sit under the opening controls.
 */
export function layoutSampleSpots<T extends { id: string; nickname: string }>(people: readonly T[]): (T & { x: number; y: number })[] {
  // Four columns clear the fountain ellipse. Only six of these are drawn at once.
  const cols = [0.28, 0.4, 0.6, 0.72];
  const rows = [0.22, 0.32, 0.42, 0.56, 0.68, 0.76, 0.84];
  return people.map((person, index) => {
    const spot = { x: cols[index % cols.length] ?? 0.5, y: rows[Math.floor(index / cols.length)] ?? 0.55 };
    return { ...person, ...clampLobbyPoint(spot.x, spot.y) };
  });
}

const SAMPLE_ROSTER: readonly Omit<SampleLobbyFriend, "x" | "y">[] = [
  { id: "nang-som", nickname: "Nắng Sớm", mood: "normal", glow: 1, outfit: "outfit_ao_dai", hair: "hair_twin_tails", clip: "accessory_flower_clip", sample: true },
  { id: "suong-mai", nickname: "Sương Mai", mood: "happy", glow: 3, outfit: "outfit_vay_hoa", hair: "hair_high_pony", clip: "accessory_ribbon_bow", sample: true },
  { id: "tra-sua", nickname: "Trà Sữa", mood: "sparkle", glow: 3, outfit: "outfit_hoodie", hair: "hair_short_bob", clip: null, sample: true },
  { id: "may-hong", nickname: "Mây Hồng", mood: "happy", glow: 4, outfit: "outfit_ao_len", hair: "hair_sleep_buns", clip: "accessory_flower_clip", sample: true },
  { id: "chanh-leo", nickname: "Chanh Leo", mood: "normal", glow: 2, outfit: "outfit_ao_thun_yem", hair: "hair_twin_tails", clip: "accessory_ribbon_bow", sample: true },
  { id: "oc-que", nickname: "Ốc Quế", mood: "happy", glow: 4, outfit: "outfit_pajamas", hair: "hair_high_pony", clip: null, sample: true },
  { id: "meo-may", nickname: "Mèo Máy", mood: "happy", glow: 5, outfit: "outfit_ao_dai", hair: "hair_short_bob", clip: "accessory_ribbon_bow", sample: true },
  { id: "banh-flan", nickname: "Bánh Flan", mood: "happy", glow: 3, outfit: "outfit_vay_hoa", hair: "hair_sleep_buns", clip: "accessory_flower_clip", sample: true },
  { id: "keo-deo", nickname: "Kẹo Dẻo", mood: "sleepy", glow: 4, outfit: "outfit_hoodie", hair: "hair_twin_tails", clip: null, sample: true },
  { id: "cun-con", nickname: "Cún Con", mood: "normal", glow: 2, outfit: "outfit_ao_len", hair: "hair_high_pony", clip: "accessory_flower_clip", sample: true },
  { id: "hat-de", nickname: "Hạt Dẻ", mood: "happy", glow: 3, outfit: "outfit_ao_thun_yem", hair: "hair_sleep_buns", clip: "accessory_ribbon_bow", sample: true },
  { id: "gau-mo", nickname: "Gấu Mơ", mood: "normal", glow: 2, outfit: "outfit_pajamas", hair: "hair_short_bob", clip: "accessory_flower_clip", sample: true },
  { id: "dau-tay", nickname: "Dâu Tây", mood: "sparkle", glow: 4, outfit: "outfit_vay_hoa", hair: "hair_twin_tails", clip: null, sample: true },
  { id: "bo-xanh", nickname: "Bơ Xanh", mood: "happy", glow: 5, outfit: "outfit_ao_dai", hair: "hair_high_pony", clip: "accessory_ribbon_bow", sample: true },
  { id: "be-mit", nickname: "Bé Mít", mood: "sleepy", glow: 1, outfit: "outfit_hoodie", hair: "hair_sleep_buns", clip: "accessory_flower_clip", sample: true },
  { id: "su-kem", nickname: "Su Kem", mood: "sparkle", glow: 5, outfit: "outfit_ao_len", hair: "hair_short_bob", clip: null, sample: true },
  { id: "bong-gon", nickname: "Bông Gòn", mood: "happy", glow: 4, outfit: "outfit_ao_thun_yem", hair: "hair_twin_tails", clip: "accessory_ribbon_bow", sample: true },
  { id: "gio-mat", nickname: "Gió Mát", mood: "normal", glow: 2, outfit: "outfit_ao_dai", hair: "hair_short_bob", clip: null, sample: true },
  { id: "mua-nho", nickname: "Mưa Nhỏ", mood: "happy", glow: 3, outfit: "outfit_vay_hoa", hair: "hair_twin_tails", clip: "accessory_flower_clip", sample: true },
  { id: "sao-dem", nickname: "Sao Đêm", mood: "sparkle", glow: 4, outfit: "outfit_hoodie", hair: "hair_high_pony", clip: "accessory_ribbon_bow", sample: true },
  { id: "com-nguoi", nickname: "Cơm Nguội", mood: "normal", glow: 1, outfit: "outfit_ao_len", hair: "hair_sleep_buns", clip: null, sample: true },
  { id: "tra-dao", nickname: "Trà Đào", mood: "happy", glow: 5, outfit: "outfit_pajamas", hair: "hair_short_bob", clip: "accessory_flower_clip", sample: true },
  { id: "sen-hong", nickname: "Sen Hồng", mood: "sparkle", glow: 3, outfit: "outfit_ao_thun_yem", hair: "hair_high_pony", clip: null, sample: true },
  { id: "lac-rang", nickname: "Lắc Răng", mood: "happy", glow: 2, outfit: "outfit_hoodie", hair: "hair_twin_tails", clip: "accessory_ribbon_bow", sample: true },
  { id: "mo-uoc", nickname: "Mơ Ước", mood: "normal", glow: 4, outfit: "outfit_vay_hoa", hair: "hair_sleep_buns", clip: null, sample: true },
  { id: "ca-phe", nickname: "Cà Phê", mood: "happy", glow: 1, outfit: "outfit_ao_dai", hair: "hair_short_bob", clip: "accessory_flower_clip", sample: true },
  { id: "yen-nhe", nickname: "Yên Nhẹ", mood: "sleepy", glow: 2, outfit: "outfit_ao_len", hair: "hair_high_pony", clip: "accessory_ribbon_bow", sample: true },
];

export const SAMPLE_LOBBY_FRIENDS: readonly SampleLobbyFriend[] = layoutSampleSpots(SAMPLE_ROSTER);

/**
 * The visitors actually drawn in an empty hall.
 * The rest of the roster stays available for the spa and for backfill when one of these is hidden.
 * Homes sit on staggered cells so their boxes clear each other at 390px.
 */
export function lobbyShownSamples(hidden: ReadonlySet<string> = new Set()): SampleLobbyFriend[] {
  const picked: SampleLobbyFriend[] = [];
  const seen = new Set<string>();
  const take = (friend: SampleLobbyFriend) => {
    if (picked.length >= LOBBY_SAMPLE_CAP || hidden.has(friend.id) || seen.has(friend.id)) return;
    const home = LOBBY_SAMPLE_HOMES[picked.length];
    if (!home) return;
    seen.add(friend.id);
    picked.push({ ...friend, x: home.x, y: home.y });
  };
  for (const id of LOBBY_SAMPLE_IDS) {
    const friend = SAMPLE_LOBBY_FRIENDS.find((item) => item.id === id);
    if (friend) take(friend);
  }
  for (const friend of SAMPLE_LOBBY_FRIENDS) take(friend);
  return picked;
}

/** Sample visitors plus the player's own Bé Da. */
export function lobbyHeadCount(): number {
  return SAMPLE_LOBBY_FRIENDS.length + 1;
}

function unit(roll: number): number {
  const u = Number.isFinite(roll) ? Math.min(0.999999, Math.max(0, roll)) : 0.5;
  return u * 2 - 1;
}

/** Keep feet on the walkable floor. Missing numbers fall back to the spawn center. */
export function clampLobbyPoint(x: number, y: number): { x: number; y: number } {
  const { walk, spawn } = LOBBY_WORLD;
  const cx = Number.isFinite(x) ? x : spawn.x;
  const cy = Number.isFinite(y) ? y : spawn.y;
  return {
    x: Math.min(walk.maxX, Math.max(walk.minX, cx)),
    y: Math.min(walk.maxY, Math.max(walk.minY, cy)),
  };
}

/** Feet closer than this in both axes are standing on each other. */
export const LOBBY_CLEAR_X = 0.08;
export const LOBBY_CLEAR_Y = 0.04;
const SPAWN_TRIES = 8;

export function lobbyTooClose(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  return Math.abs(a.x - b.x) < LOBBY_CLEAR_X - 1e-4 && Math.abs(a.y - b.y) < LOBBY_CLEAR_Y - 1e-4;
}

/** Larger means the spot has more room. Infinity when nobody else is there. */
export function lobbyCrowding(spot: { x: number; y: number }, others: readonly { x: number; y: number }[]): number {
  let best = Infinity;
  for (const other of others) {
    const nx = Math.abs(spot.x - other.x) / LOBBY_CLEAR_X;
    const ny = Math.abs(spot.y - other.y) / LOBBY_CLEAR_Y;
    best = Math.min(best, Math.hypot(nx, ny));
  }
  return best;
}

function rawSpawn(random: () => number): { x: number; y: number } {
  const { spawn } = LOBBY_WORLD;
  return clampLobbyPoint(spawn.x + unit(random()) * spawn.dx, spawn.y + unit(random()) * spawn.dy);
}

/**
 * A point in the arrival box that is not on top of anyone.
 * Tries a few random points, then keeps the least crowded.
 */
function spawnBlocked(spot: { x: number; y: number }, other: { x: number; y: number; nickname?: string }): boolean {
  if (lobbyTooClose(spot, other)) return true;
  const { worldW, worldH } = lobbyWorldSize(390, 844);
  const name = other.nickname ?? "Mây Hồng";
  return screenBoxesOverlap(
    lobbyFigureBox(spot.x, spot.y, "Bé Da 0000", worldW, worldH, 1.2),
    lobbyFigureBox(other.x, other.y, name, worldW, worldH),
    LOBBY_FIGURE_GAP,
  );
}

function spawnCandidates(random: () => number): { x: number; y: number }[] {
  const { spawn } = LOBBY_WORLD;
  const fixed = [
    { x: spawn.x, y: spawn.y },
    { x: spawn.x, y: spawn.y - spawn.dy * 0.5 },
    { x: spawn.x, y: spawn.y + spawn.dy * 0.5 },
    { x: spawn.x - spawn.dx * 0.45, y: spawn.y },
    { x: spawn.x + spawn.dx * 0.45, y: spawn.y },
  ];
  const rolls = Array.from({ length: SPAWN_TRIES }, () => rawSpawn(random));
  return [...fixed, ...rolls].map((spot) => clampLobbyPoint(spot.x, spot.y));
}

export function lobbySpawn(
  random: () => number = Math.random,
  others: readonly { x: number; y: number; nickname?: string }[] = lobbyShownSamples(),
): { x: number; y: number } {
  const spots = spawnCandidates(random);
  let fallback = spots[0] ?? { x: LOBBY_WORLD.spawn.x, y: LOBBY_WORLD.spawn.y };
  let fallbackScore = -1;
  for (const spot of spots) {
    if (lobbyFigureHitsChrome(spot.x, spot.y, "Bé Da 0000", 1.2)) continue;
    if (!others.some((other) => spawnBlocked(spot, other))) return spot;
    if (others.some((other) => lobbyTooClose(spot, other))) continue;
    const score = lobbyCrowding(spot, others);
    if (score > fallbackScore) {
      fallback = spot;
      fallbackScore = score;
    }
  }
  return fallback;
}

function hashedSpawn(id: string, salt: number): { x: number; y: number } {
  let hash = (2166136261 ^ salt) >>> 0;
  for (let i = 0; i < id.length; i += 1) hash = Math.imul(hash ^ id.charCodeAt(i), 16777619) >>> 0;
  const a = (hash & 0xffff) / 0x10000;
  const b = ((hash >>> 16) & 0xffff) / 0x10000;
  const { spawn } = LOBBY_WORLD;
  return clampLobbyPoint(spawn.x + (a * 2 - 1) * spawn.dx, spawn.y + (b * 2 - 1) * spawn.dy);
}

/** Stable arrival spot when a person shows up without coordinates. */
export function lobbySpawnForId(
  id: string,
  others: readonly { x: number; y: number; nickname?: string }[] = lobbyShownSamples(),
): { x: number; y: number } {
  const clear = (spot: { x: number; y: number }) =>
    !lobbyFigureHitsChrome(spot.x, spot.y, "Bé Da 0000", 1.2) && !others.some((other) => spawnBlocked(spot, other));
  let best = hashedSpawn(id, 0);
  let bestScore = lobbyCrowding(best, others);
  if (clear(best)) return best;
  for (let salt = 1; salt < SPAWN_TRIES; salt += 1) {
    const spot = hashedSpawn(id, salt);
    if (clear(spot)) return spot;
    if (others.some((other) => lobbyTooClose(spot, other))) continue;
    const score = lobbyCrowding(spot, others);
    if (score > bestScore) {
      best = spot;
      bestScore = score;
    }
  }
  return best;
}

/** True when some point in the arrival box is within the old point clearance of these feet. */
export function sampleBlocksSpawn(x: number, y: number): boolean {
  const { spawn } = LOBBY_WORLD;
  const nx = Math.min(Math.max(x, spawn.x - spawn.dx), spawn.x + spawn.dx);
  const ny = Math.min(Math.max(y, spawn.y - spawn.dy), spawn.y + spawn.dy);
  return lobbyTooClose({ x, y }, { x: nx, y: ny });
}

export type LobbySpot = { id: string; x: number; y: number };

/** Gap between the floating action card and the friend's head or the nav. */
export const FRIEND_CARD_GAP = 8;

/** Name tags stay this far inside the screen edge. */
export const TAG_VIEW_MARGIN = 8;

/**
 * Horizontal screen shift that pulls a name tag inside the frame.
 * Moves it only as far as the edge requires, so it stays under its Bé Da.
 */
export function tagEdgeDelta(
  tag: { left: number; right: number },
  frame: { left: number; right: number },
  margin = TAG_VIEW_MARGIN,
): number {
  const min = frame.left + margin;
  const max = frame.right - margin;
  let dx = 0;
  if (tag.left < min) dx = min - tag.left;
  if (tag.right + dx > max) dx -= tag.right + dx - max;
  if (tag.left + dx < min) dx = min - tag.left;
  return dx;
}

/** Round-nav block. Mirrors `--beda-nav-reserve` in be-da-game.css, before measurement. */
export function lobbyNavReservePx(viewportWidth: number, safeAreaBottom = 0): number {
  const padTop = 10;
  const gap = 4;
  const padBottom = 18 + safeAreaBottom;
  if (viewportWidth >= 768) return padTop + 80 + gap + 20 + padBottom;
  const orb = Math.min(72, Math.max(58, viewportWidth * 0.16));
  return padTop + orb + gap + 18 + padBottom;
}

/** Tags stay centered under their Bé Da. The screen clamp slides them in from the edges. */
export function lobbyTagNudgePx(spot: LobbySpot, spots: readonly LobbySpot[]): number {
  void spot;
  void spots;
  return 0;
}

/** Lower on the screen (larger y) paints in front. */
export function lobbyStackZ(y: number): number {
  return 20 + Math.round(y * 1000);
}

export type FriendCardPlacement = {
  top: number;
  left: number;
  /** Card sits under the friend when there is no room above the head. */
  flipped: boolean;
};

/**
 * Small card above the friend's head. Flips below the tag when the top of the
 * frame can't hold it, then clamps so the card never crosses the round nav.
 */
export function placeFriendCard(input: {
  frameWidth: number;
  frameHeight: number;
  friendTop: number;
  friendLeft: number;
  friendWidth: number;
  friendHeight: number;
  cardWidth: number;
  cardHeight: number;
  navTop: number;
  gap?: number;
  margin?: number;
  /** Screen box the card must not cover, such as the zoom cluster. */
  avoid?: { left: number; top: number; right: number; bottom: number };
}): FriendCardPlacement {
  const gap = input.gap ?? FRIEND_CARD_GAP;
  const margin = input.margin ?? 8;
  let left = input.friendLeft + input.friendWidth / 2 - input.cardWidth / 2;
  const maxLeft = input.frameWidth - input.cardWidth - margin;
  if (input.cardWidth + margin * 2 <= input.frameWidth) {
    left = Math.min(Math.max(margin, left), maxLeft);
  } else {
    left = Math.max(0, (input.frameWidth - input.cardWidth) / 2);
  }

  const above = input.friendTop - input.cardHeight - gap;
  const below = input.friendTop + input.friendHeight + gap;
  const maxTop = input.navTop - gap - input.cardHeight;
  let top = above;
  let flipped = false;
  if (above < margin) {
    top = below;
    flipped = true;
  }
  if (top > maxTop) top = maxTop;
  if (top + input.cardHeight > input.navTop - gap) {
    top = input.navTop - gap - input.cardHeight;
  }
  const overlapsFriend =
    top < input.friendTop + input.friendHeight && top + input.cardHeight > input.friendTop;
  if (overlapsFriend && input.friendTop + input.cardHeight <= maxTop) {
    top = input.friendTop;
    flipped = true;
    const right = input.friendLeft + input.friendWidth + gap;
    const leftSide = input.friendLeft - input.cardWidth - gap;
    if (right + input.cardWidth <= input.frameWidth - margin) left = right;
    else if (leftSide >= margin) left = leftSide;
  }
  const avoid = input.avoid;
  if (avoid) {
    const hits =
      left < avoid.right + gap &&
      left + input.cardWidth + gap > avoid.left &&
      top < avoid.bottom + gap &&
      top + input.cardHeight + gap > avoid.top;
    if (hits) {
      const shiftLeft = avoid.left - gap - input.cardWidth;
      if (shiftLeft >= margin) left = shiftLeft;
      else {
        const under = avoid.bottom + gap;
        if (under + input.cardHeight <= maxTop) top = under;
      }
    }
  }
  if (input.cardWidth + margin * 2 <= input.frameWidth) {
    left = Math.min(Math.max(margin, left), maxLeft);
  }
  if (top < margin) top = margin;
  if (top > maxTop) top = maxTop;
  return { top, left, flipped };
}

const sampleViews = new Map<string, BeDaView>();

/** Art for a sample visitor. Missed days stay 0 so the chosen face is kept. */
export function sampleFriendView(friend: SampleLobbyFriend): BeDaView {
  const cached = sampleViews.get(friend.id);
  if (cached) return cached;
  const view = resolveBeDaView({
    snapshot: {
      ...defaultSnapshot(),
      isDefault: false,
      mood: friend.mood,
      missedDays: 0,
      glowLevel: friend.glow,
      glowProgress: null,
      nearLevelUp: false,
      levelUp: false,
      skinMarks: [],
      skinMarksPrev: [],
    },
    missedDays: 0,
    sessionHappy: false,
    locale: "vi",
  });
  sampleViews.set(friend.id, view);
  return view;
}

let neutralView: BeDaView | null = null;

/** Face for a real person. No level, points, marks, or glow — outfit comes from the wire. */
export function lobbyNeutralView(): BeDaView {
  if (neutralView) return neutralView;
  neutralView = resolveBeDaView({
    snapshot: {
      ...defaultSnapshot(),
      isDefault: false,
      mood: "happy",
      missedDays: 0,
      glowLevel: 1,
      glowProgress: null,
      nearLevelUp: false,
      levelUp: false,
      skinMarks: [],
      skinMarksPrev: [],
    },
    missedDays: 0,
    sessionHappy: false,
    locale: "vi",
  });
  return neutralView;
}
