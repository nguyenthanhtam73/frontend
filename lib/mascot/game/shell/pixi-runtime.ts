import { Application, Assets, Container, Graphics, Rectangle, RenderTexture, Sprite, Texture } from "pixi.js";
import { Viewport } from "pixi-viewport";

import { lobbyMinScale, lobbyWorldSize, stackNameLabels } from "@/lib/mascot/game/lobby";
import {
  LOBBY_WALK_MASK,
  findRoute,
  gridFromMask,
  gridSize,
  isWalkable,
  nearestWalkable,
  type WalkGrid,
  type WalkPoint,
} from "@/lib/mascot/game/lobby-walk";
import { LOBBY_DECOR, LOBBY_DECOR_MAP, LOBBY_GROUND, LOBBY_LAYOUT, type ParkPiece } from "@/lib/mascot/game/lobby-park";
import { startShellClock } from "@/lib/game/core/clock";
import { rendererResolution } from "@/lib/game/core/dpr";
import { arrowGoal, TAP_MS } from "@/lib/game/core/input";
import {
  LOBBY_BOUNDS,
  LOBBY_FOUNTAIN,
  emptyRemoteBook,
  lobbyWalker,
  placeLocal,
  stepLocal,
  stepRemotes,
} from "@/lib/game/core/movement";
import type { ShellApi, ShellSceneName, ShellSnapshot, ShellSprite } from "@/lib/game/core/types";
import { ZOOM_MAX, clampPoint, walkPose, type Walker } from "@/lib/mascot/game/walk";

const ROOM_BOUNDS = { minX: 0.16, maxX: 0.84, minY: 0.58, maxY: 0.9 };
const TAP_PX = 10;
/** Screen pixels between the shoes and the top of the name. */
const NAME_GAP_PX = 6;

type Figure = { key: string; root: Container; sheet: RenderTexture | null };

/**
 * Pixi world for Góc bình yên and the lobby. Loaded only after the canvas mounts.
 * The lobby camera is pixi-viewport. Positions for other people still come from the snapshot.
 */
export async function startPixiShell(options: {
  canvas: HTMLCanvasElement;
  labels: { current: HTMLElement | null };
  getSnapshot: () => ShellSnapshot;
  onWalk?: (x: number, y: number, pace?: "walk" | "idle") => void;
  onEmptyTap?: () => void;
  api?: { current: ShellApi };
}): Promise<{ destroy: () => void }> {
  const parent = options.canvas.parentElement ?? options.canvas;
  const app = new Application();
  let viewW = parent.clientWidth || 1;
  let viewH = parent.clientHeight || 1;
  await app.init({
    canvas: options.canvas,
    resizeTo: parent,
    resolution: rendererResolution(window.devicePixelRatio || 1, viewW, viewH),
    autoDensity: true,
    antialias: false,
    preference: "webgl",
    backgroundAlpha: 0,
  });
  app.ticker.stop();

  const lobby = options.getSnapshot().scene === "lobby";
  const { worldW: initialW, worldH: initialH } = worldSize(options.getSnapshot().scene, viewW, viewH);
  const viewport = new Viewport({
    screenWidth: viewW,
    screenHeight: viewH,
    worldWidth: initialW,
    worldHeight: initialH,
    events: app.renderer.events,
    threshold: TAP_PX,
    passiveWheel: false,
    noTicker: true,
    allowPreserveDragOutside: true,
  });
  app.stage.addChild(viewport);
  viewport.sortableChildren = true;
  const hit = new Rectangle(0, 0, viewW, viewH);
  viewport.forceHitArea = hit;

  const backdrop = new Graphics();
  backdrop.zIndex = 0;
  backdrop.eventMode = "none";
  viewport.addChild(backdrop);
  let parkGround: Sprite | null = null;
  const parkSprites: { sprite: Sprite; piece: ParkPiece; texture: Texture; baseX: number }[] = [];
  let maskPixels: Uint8ClampedArray | null = null;
  let maskW = 0;
  let maskH = 0;
  let walkGrid: WalkGrid | null = null;
  let walkGridKey = "";
  let route: WalkPoint[] = [];
  /** Nearest path cell for a person standing on black. Keyed by id, grid, and cell. */
  const standCache = new Map<string, WalkPoint>();
  let layoutPark: (worldW: number, worldH: number) => void = () => {};
  const feet = new Container();
  viewport.addChild(feet);

  const figures = new Map<string, Figure>();
  const book = emptyRemoteBook();
  let owned = false;
  let walker: Walker | null = null;
  let lastSend = 0;
  let sentMoving = false;
  let reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let centered = false;
  let backdropScene = "";
  let backdropSky = "";
  let backdropW = -1;
  let backdropH = -1;
  let lastSprites: readonly ShellSprite[] | null = null;
  const spriteSize = new WeakMap<Sprite, number>();
  const labelPos = new WeakMap<HTMLElement, string>();
  const labelSize = new WeakMap<HTMLElement, { w: number; h: number }>();
  const labelNodes = new Map<string, HTMLElement>();
  let downAt = 0;

  function worldSize(scene: ShellSceneName, width: number, height: number) {
    if (scene === "room") return { worldW: width, worldH: height };
    return lobbyWorldSize(width, height);
  }

  const applyMinZoom = (width: number, height: number, worldW: number, worldH: number) => {
    const cover = viewport.plugins.get("clamp-zoom");
    if (!cover) return;
    cover.options.minScale = lobbyMinScale(width, height, worldW, worldH);
    cover.options.maxScale = ZOOM_MAX;
    cover.clamp();
  };

  const readView = () => {
    const nextW = parent.clientWidth || 1;
    const nextH = parent.clientHeight || 1;
    if (nextW === viewW && nextH === viewH) return;
    viewW = nextW;
    viewH = nextH;
    backdropW = -1;
    const snap = options.getSnapshot();
    const size = worldSize(snap.scene, viewW, viewH);
    viewport.resize(viewW, viewH, size.worldW, size.worldH);
    applyMinZoom(viewW, viewH, size.worldW, size.worldH);
    layoutPark(size.worldW, size.worldH);
    const resolution = rendererResolution(window.devicePixelRatio || 1, viewW, viewH);
    if (app.renderer.resolution !== resolution) {
      app.renderer.resolution = resolution;
      app.resize();
    }
  };
  const viewObserver = new ResizeObserver(readView);
  viewObserver.observe(parent);

  const paintBackdrop = (scene: ShellSceneName, sky: string, worldW: number, worldH: number) => {
    const rw = Math.round(worldW);
    const rh = Math.round(worldH);
    if (scene === backdropScene && sky === backdropSky && rw === backdropW && rh === backdropH) return;
    backdropScene = scene;
    backdropSky = sky;
    backdropW = rw;
    backdropH = rh;
    backdrop.clear();
    const night = sky === "night" || sky === "evening";
    if (scene === "room") {
      // The personal room is the DOM scene. An opaque canvas hid the window and bed
      // and left Bé Da standing apart from her speech bubble.
      return;
    }
    backdrop.rect(0, 0, worldW, worldH * 0.12).fill({ color: night ? 0x2c3e66 : 0xbfe7ff });
    backdrop.rect(0, worldH * 0.12, worldW, worldH).fill({ color: night ? 0x6f9474 : 0x9fd48e });
    backdrop.ellipse(worldW * 0.5, worldH * 0.44, worldW * 0.16, worldH * 0.045).fill({ color: 0xd7f4f8 });
  };

  const pieceSort = (piece: ParkPiece, frameH: number) => {
    if (piece.kind === "sky") return 0.001;
    if (piece.kind === "stone") return 0.0002;
    const height = (frameH / LOBBY_GROUND.size) * piece.scale;
    const bottom = piece.anchor === "center" ? piece.y + height / 2 : piece.y;
    return bottom;
  };

  layoutPark = (worldW: number, worldH: number) => {
    if (parkGround) {
      parkGround.width = worldW;
      parkGround.height = worldH;
    }
    let fountainSort = 0.5;
    for (const item of parkSprites) {
      const frame = item.texture.frame;
      const height = (frame.height / LOBBY_GROUND.size) * item.piece.scale * worldH;
      const width = height * (frame.width / Math.max(1, frame.height));
      item.sprite.height = height;
      item.sprite.width = width;
      item.baseX = item.piece.x * worldW;
      item.sprite.position.set(item.baseX, item.piece.y * worldH);
      const sort = pieceSort(item.piece, frame.height);
      if (item.piece.frame === "02_fountain") fountainSort = sort;
      item.sprite.zIndex = Math.round(sort * 10000);
    }
    for (const item of parkSprites) {
      if (item.piece.kind !== "water") continue;
      item.sprite.zIndex = Math.round(fountainSort * 10000) + 1;
    }
  };

  const loadPark = async () => {
    try {
      const [groundTex, decorTex, frames, layout] = await Promise.all([
        Assets.load<Texture>(LOBBY_GROUND.src),
        Assets.load<Texture>(LOBBY_DECOR),
        fetch(LOBBY_DECOR_MAP).then((res) => res.json() as Promise<{ frames: Record<string, { x: number; y: number; w: number; h: number }> }>),
        fetch(LOBBY_LAYOUT).then((res) => res.json() as Promise<{ pieces: ParkPiece[] }>),
      ]);
      const ground = new Sprite(groundTex);
      ground.anchor.set(0, 0);
      ground.zIndex = 0;
      ground.eventMode = "none";
      viewport.addChild(ground);
      parkGround = ground;
      backdrop.visible = false;
      for (const piece of layout.pieces) {
        const frame = frames.frames[piece.frame];
        if (!frame) continue;
        const texture = new Texture({
          source: decorTex.source,
          frame: new Rectangle(frame.x, frame.y, frame.w, frame.h),
        });
        const sprite = new Sprite(texture);
        sprite.anchor.set(0.5, piece.anchor === "center" ? 0.5 : 1);
        sprite.eventMode = "none";
        viewport.addChild(sprite);
        parkSprites.push({ sprite, piece, texture, baseX: 0 });
      }
      const size = worldSize(options.getSnapshot().scene, viewW, viewH);
      layoutPark(size.worldW, size.worldH);
    } catch {
      /* the flat color backdrop stays until the pictures can load */
    }
  };
  const ensureWalkGrid = (worldW: number, worldH: number) => {
    if (!maskPixels) return walkGrid;
    if (worldW < 64 || worldH < 64) return walkGrid;
    const size = gridSize(worldW, worldH);
    const key = `${size.cols}x${size.rows}`;
    if (!walkGrid || walkGridKey !== key) {
      walkGrid = gridFromMask(maskPixels, maskW, maskH, size.cols, size.rows);
      walkGridKey = key;
      standCache.clear();
      maskPixels = null;
      maskW = 0;
      maskH = 0;
    }
    return walkGrid;
  };

  const snappedStand = (id: string, grid: WalkGrid, x: number, y: number): WalkPoint => {
    if (isWalkable(grid, x, y)) return { x, y };
    const c = Math.min(grid.cols - 1, Math.max(0, Math.floor(x * grid.cols)));
    const r = Math.min(grid.rows - 1, Math.max(0, Math.floor(y * grid.rows)));
    const key = `${id}|${walkGridKey}|${c},${r}`;
    const cached = standCache.get(key);
    if (cached) return cached;
    const stand = nearestWalkable(grid, x, y);
    standCache.set(key, stand);
    return stand;
  };

  const loadMask = () => {
    const image = new Image();
    image.src = LOBBY_WALK_MASK;
    void image
      .decode()
      .then(() => {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(image, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        maskPixels = imageData.data;
        maskW = canvas.width;
        maskH = canvas.height;
      })
      .catch(() => {
        /* without a mask the lobby keeps the fountain ellipse */
      });
  };

  if (lobby) {
    void loadPark();
    loadMask();
  }

  const packAtlas = async (srcs: readonly string[]) => {
    const loaded: Texture[] = [];
    for (const src of srcs) {
      try {
        loaded.push(await Assets.load<Texture>(src));
      } catch {
        /* a missing plate does not block the rest of the figure */
      }
    }
    if (loaded.length === 0) return null;
    let width = 1;
    let height = 0;
    for (const texture of loaded) {
      width = Math.max(width, Math.ceil(texture.width));
      height += Math.ceil(texture.height);
    }
    height = Math.max(1, height);
    if (width * height > 512 * 512) {
      const loose = new Container();
      for (const texture of loaded) {
        const plate = new Sprite(texture);
        plate.anchor.set(0.5, 1);
        loose.addChild(plate);
      }
      return { root: loose, sheet: null };
    }
    const sheet = RenderTexture.create({ width, height, resolution: 1 });
    const pack = new Container();
    let y = 0;
    const frames: Rectangle[] = [];
    for (const texture of loaded) {
      const plate = new Sprite(texture);
      plate.y = y;
      pack.addChild(plate);
      frames.push(new Rectangle(0, y, Math.max(1, texture.width), Math.max(1, texture.height)));
      y += Math.ceil(texture.height);
    }
    let baked = false;
    try {
      if (app.renderer) {
        app.renderer.render({ container: pack, target: sheet, clear: true });
        baked = true;
      }
    } catch {
      baked = false;
    }
    pack.destroy({ children: true });
    if (!baked) {
      sheet.destroy(true);
      const loose = new Container();
      for (const texture of loaded) {
        const plate = new Sprite(texture);
        plate.anchor.set(0.5, 1);
        loose.addChild(plate);
      }
      return { root: loose, sheet: null };
    }
    const root = new Container();
    for (const frame of frames) {
      const piece = new Sprite(new Texture({ source: sheet.source, frame }));
      piece.anchor.set(0.5, 1);
      root.addChild(piece);
    }
    return { root, sheet };
  };

  const syncFigures = async (sprites: readonly ShellSprite[]) => {
    const live = new Set(sprites.map((sprite) => sprite.id));
    for (const [id, figure] of figures) {
      if (!live.has(id)) {
        figure.root.destroy({ children: true });
        figure.sheet?.destroy(true);
        figures.delete(id);
      }
    }
    for (const sprite of sprites) {
      const key = sprite.art.join("|");
      const have = figures.get(sprite.id);
      if (have?.key === key) continue;
      const packed = await packAtlas(sprite.art);
      if (!packed) continue;
      if (have) {
        have.root.destroy({ children: true });
        have.sheet?.destroy(true);
      }
      viewport.addChild(packed.root);
      figures.set(sprite.id, { key, root: packed.root, sheet: packed.sheet });
    }
  };

  let syncing = false;
  let queued = false;
  const requestFigures = (sprites: readonly ShellSprite[]) => {
    if (syncing) {
      queued = true;
      return;
    }
    syncing = true;
    void syncFigures(sprites).finally(() => {
      syncing = false;
      if (!queued) return;
      queued = false;
      requestFigures(options.getSnapshot().sprites);
    });
  };

  const stopWalk = () => {
    route = [];
    if (!walker) return;
    walker.goal = null;
    walker.vx = 0;
    walker.vy = 0;
  };

  const aimNorm = (point: { x: number; y: number }, scene: ShellSceneName) => {
    const size = worldSize(scene, viewW, viewH);
    const grid = scene === "lobby" ? ensureWalkGrid(size.worldW, size.worldH) : null;
    if (!walker) {
      const origin = grid ? nearestWalkable(grid, point.x, point.y) : point;
      walker = lobbyWalker(origin);
    }
    if (grid) {
      if (!isWalkable(grid, walker.x, walker.y)) {
        const stand = nearestWalkable(grid, walker.x, walker.y);
        walker.x = stand.x;
        walker.y = stand.y;
      }
      const goal = nearestWalkable(grid, point.x, point.y);
      route = findRoute(grid, walker, goal);
      walker.goal = route.shift() ?? null;
    } else {
      route = [];
      walker.goal = point;
    }
    owned = true;
  };

  const aim = (worldX: number, worldY: number) => {
    const snap = options.getSnapshot();
    const size = worldSize(snap.scene, viewW, viewH);
    const point = clampPoint(
      { x: worldX / size.worldW, y: worldY / size.worldH },
      snap.scene === "room" ? ROOM_BOUNDS : LOBBY_BOUNDS,
    );
    aimNorm(point, snap.scene);
  };

  if (lobby) {
    viewport
      .drag()
      .pinch()
      .wheel({ smooth: false, percent: 0.1 })
      .decelerate({ friction: 0.9, minSpeed: 0.4 })
      .clamp({ direction: "all", underflow: "center" })
      .clampZoom({
        minScale: lobbyMinScale(viewW, viewH, initialW, initialH),
        maxScale: ZOOM_MAX,
      });
    viewport.on("drag-start", () => {
      stopWalk();
    });
    viewport.on("pinch-start", () => {
      stopWalk();
    });
    viewport.on("wheel-start", () => {
      stopWalk();
    });
    viewport.on("pointerdown", () => {
      downAt = performance.now();
    });
    viewport.on("clicked", (payload: { world?: { x: number; y: number } }) => {
      if (performance.now() - downAt > TAP_MS) return;
      const world = payload?.world;
      if (!world) return;
      aim(world.x, world.y);
      options.onEmptyTap?.();
    });
  }

  const api: ShellApi = {
    zoomBy(factor) {
      if (!lobby) return;
      stopWalk();
      const size = worldSize("lobby", viewW, viewH);
      const scale = Math.min(ZOOM_MAX, Math.max(lobbyMinScale(viewW, viewH, size.worldW, size.worldH), viewport.scale.x * factor));
      viewport.animate({
        time: reduced ? 1 : 220,
        scale,
        ease: "easeOutCubic",
        removeOnInterrupt: true,
      });
    },
    recenter() {
      if (!lobby) return;
      const snap = options.getSnapshot();
      const size = worldSize(snap.scene, viewW, viewH);
      const x = (walker?.x ?? 0.5) * size.worldW;
      const y = (walker?.y ?? 0.55) * size.worldH;
      viewport.animate({
        time: reduced ? 1 : 420,
        position: { x, y },
        ease: "easeOutCubic",
        removeOnInterrupt: true,
      });
    },
    panBy(dx, dy, user = true) {
      viewport.x += dx;
      viewport.y += dy;
      if (user) stopWalk();
    },
  };
  if (options.api) options.api.current = api;

  const clock = startShellClock((dt, now) => {
    const snap = options.getSnapshot();
    const { worldW, worldH } = worldSize(snap.scene, viewW, viewH);
    if (snap.scene !== "lobby" || !parkGround) paintBackdrop(snap.scene, snap.sky, worldW, worldH);
    if (snap.sprites !== lastSprites) {
      lastSprites = snap.sprites;
      requestFigures(snap.sprites);
    }
    const local = snap.sprites.find((sprite) => sprite.local);
    if (!walker && local) walker = lobbyWalker(local);
    const grid = snap.scene === "lobby" ? ensureWalkGrid(worldW, worldH) : null;
    if (walker) {
      placeLocal(walker, local ? { x: local.x, y: local.y } : null, owned);
      if (grid && !walker.goal && !isWalkable(grid, walker.x, walker.y)) {
        const stand = snappedStand(local?.id ?? "you", grid, walker.x, walker.y);
        walker.x = stand.x;
        walker.y = stand.y;
      }
      const bounds = snap.scene === "room" ? ROOM_BOUNDS : LOBBY_BOUNDS;
      const obstacle = snap.scene === "lobby" && !grid ? LOBBY_FOUNTAIN : null;
      const span = snap.scene === "room" ? viewW : worldW;
      if (reduced && route.length > 0) {
        const last = route[route.length - 1]!;
        walker.x = last.x;
        walker.y = last.y;
        walker.goal = null;
        walker.vx = 0;
        walker.vy = 0;
        route = [];
      }
      Object.assign(walker, stepLocal(walker, dt, bounds, obstacle, span, reduced));
      if (!walker.goal && route.length > 0) walker.goal = route.shift() ?? null;
      if (options.onWalk) {
        if (walker.goal) {
          if (now - lastSend > 480) {
            options.onWalk(walker.x, walker.y, "walk");
            lastSend = now;
            sentMoving = true;
          }
        } else if (sentMoving) {
          options.onWalk(walker.x, walker.y, "idle");
          sentMoving = false;
          lastSend = now;
        }
      }
      feet.position.set(walker.x * worldW, walker.y * worldH);
      if (lobby && !centered) {
        viewport.moveCenter(feet.x, feet.y);
        centered = true;
      }
    }
    if (lobby) {
      viewport.update(dt * 1000);
      if (parkSprites.length > 0 && !reduced) {
        const t = now / 1000;
        for (const item of parkSprites) {
          const kind = item.piece.kind;
          if (item.piece.sway) item.sprite.rotation = Math.sin(t * 1.2 + item.piece.x * 8) * 0.035;
          if (kind === "water") item.sprite.alpha = 0.72 + Math.sin(t * 2.4) * 0.28;
          if (kind === "sky") {
            item.sprite.x = item.baseX + Math.sin(t * 0.12 + item.piece.x * 6) * worldW * 0.02;
          } else if (kind === "petal") {
            const travel = (t * 0.04 + item.piece.y) % 0.7;
            const y = 0.16 + travel;
            item.sprite.y = y * worldH;
            item.sprite.x = item.piece.x * worldW + Math.sin(t * 0.8 + item.piece.x * 12) * 14;
            item.sprite.rotation = t * 0.6 + item.piece.x;
            item.sprite.zIndex = Math.round(y * 10000);
          } else if (kind === "butterfly") {
            item.sprite.x = item.baseX + Math.sin(t * 0.7 + item.piece.y * 10) * 18;
            item.sprite.y = item.piece.y * worldH + Math.cos(t * 0.55 + item.piece.x * 8) * 10;
            item.sprite.zIndex = Math.round((item.sprite.y / worldH) * 10000);
          }
        }
      }
    }
    if (hit.x !== viewport.left || hit.y !== viewport.top || hit.width !== viewport.worldScreenWidth || hit.height !== viewport.worldScreenHeight) {
      hit.x = viewport.left;
      hit.y = viewport.top;
      hit.width = viewport.worldScreenWidth;
      hit.height = viewport.worldScreenHeight;
    }
    const remotes = stepRemotes(
      book,
      snap.sprites.filter((sprite) => !sprite.local),
      now,
      worldW,
      worldH,
      reduced,
    );
    const heightFor = (y: number) => (snap.scene === "room" ? Math.min(230, viewH * 0.36) : (96 + y * 36) * 1.2);
    const pendingLabels: { el: HTMLElement; x: number; y: number; w: number; h: number }[] = [];
    for (const sprite of snap.sprites) {
      const figure = figures.get(sprite.id);
      if (!figure) continue;
      let at = sprite.local && walker ? walker : (remotes.get(sprite.id) ?? sprite);
      if (grid && !(sprite.local && walker) && !isWalkable(grid, at.x, at.y)) {
        at = snappedStand(sprite.id, grid, at.x, at.y);
      }
      const moving = sprite.local && walker ? Math.hypot(walker.vx, walker.vy) > 0.02 : false;
      const pose = walkPose(sprite.local && walker ? walker.phase : moving ? now / 159 : now / 700, moving, true);
      const worldX = at.x * worldW;
      const worldY = at.y * worldH + pose.bob;
      figure.root.position.set(worldX, worldY);
      figure.root.zIndex = Math.round(at.y * 10000);
      const face = sprite.local && walker ? walker.face : sprite.facing === "left" ? -1 : 1;
      const height = heightFor(at.y);
      if (figure.root.scale.x !== face) figure.root.scale.x = face;
      for (const child of figure.root.children) {
        if (!(child instanceof Sprite)) continue;
        if (spriteSize.get(child) === height) continue;
        spriteSize.set(child, height);
        const texH = child.texture.height || 250;
        const texW = child.texture.width || 220;
        child.height = height;
        child.width = height * (texW / texH);
        if (child.scale.x < 0) child.scale.x = -child.scale.x;
      }
      let label = labelNodes.get(sprite.id);
      if (!label || !label.isConnected) {
        label = options.labels.current?.querySelector<HTMLElement>(`[data-pixi-label="${sprite.id}"]`) ?? undefined;
        if (label) labelNodes.set(sprite.id, label);
      }
      if (label) {
        let size = labelSize.get(label);
        if (!size) {
          const tag = label.querySelector<HTMLElement>(".beda-tag") ?? label;
          const w = tag.offsetWidth;
          const h = tag.offsetHeight;
          if (w > 8 && h > 8) {
            size = { w, h };
            labelSize.set(label, size);
          } else {
            size = { w: 72, h: 22 };
          }
        }
        pendingLabels.push({
          el: label,
          x: viewport.x + worldX * viewport.scale.x,
          y: viewport.y + worldY * viewport.scale.y + NAME_GAP_PX,
          w: size.w,
          h: size.h,
        });
      }
    }
    for (const label of stackNameLabels(pendingLabels)) {
      const pos = `${Math.round(label.x)}:${Math.round(label.y)}:${label.w}`;
      if (labelPos.get(label.el) !== pos) {
        labelPos.set(label.el, pos);
        label.el.style.left = `${Math.round(label.x)}px`;
        label.el.style.top = `${Math.round(label.y)}px`;
      }
    }
    app.render();
  });

  const onGesture = (event: Event) => {
    event.preventDefault();
  };
  const gestureOpts: AddEventListenerOptions = { passive: false };
  let lastTouchEnd = 0;
  const onTouchEnd = (event: TouchEvent) => {
    const now = performance.now();
    if (now - lastTouchEnd < 300) event.preventDefault();
    lastTouchEnd = now;
  };
  const hosts = [options.canvas, parent];
  for (const host of hosts) {
    host.addEventListener("gesturestart", onGesture, gestureOpts);
    host.addEventListener("gesturechange", onGesture, gestureOpts);
    host.addEventListener("gestureend", onGesture, gestureOpts);
    host.addEventListener("touchend", onTouchEnd, gestureOpts);
  }
  options.canvas.style.touchAction = "none";
  if (parent instanceof HTMLElement) parent.style.touchAction = "none";

  const onKey = (event: KeyboardEvent) => {
    if ((event.target as HTMLElement).closest("input, textarea, button")) return;
    const root = options.labels.current;
    if (root && document.activeElement && !root.contains(document.activeElement)) return;
    const from = walker ?? lobbyWalker({ x: 0.5, y: 0.7 });
    const goal = arrowGoal(from, event.key);
    if (!goal) return;
    event.preventDefault();
    const snap = options.getSnapshot();
    walker = from;
    aimNorm(clampPoint(goal, snap.scene === "room" ? ROOM_BOUNDS : LOBBY_BOUNDS), snap.scene);
  };
  window.addEventListener("keydown", onKey);
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  const onReduce = () => {
    reduced = media.matches;
  };
  media.addEventListener("change", onReduce);

  return {
    destroy() {
      clock.stop();
      viewObserver.disconnect();
      window.removeEventListener("keydown", onKey);
      media.removeEventListener("change", onReduce);
      for (const host of hosts) {
        host.removeEventListener("gesturestart", onGesture);
        host.removeEventListener("gesturechange", onGesture);
        host.removeEventListener("gestureend", onGesture);
        host.removeEventListener("touchend", onTouchEnd);
      }
      for (const item of parkSprites) item.texture.destroy(false);
      viewport.destroy({ children: true });
      app.destroy(false, { children: true });
    },
  };
}
