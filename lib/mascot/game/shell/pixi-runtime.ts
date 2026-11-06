import { Application, Assets, Container, Graphics, Rectangle, RenderTexture, Sprite, Texture } from "pixi.js";
import { Viewport } from "pixi-viewport";

import { LOBBY_WORLD } from "@/lib/mascot/game/lobby";
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
import { ZOOM_MAX, ZOOM_MIN, clampPoint, walkPose, type Walker } from "@/lib/mascot/game/walk";

const ROOM_BOUNDS = { minX: 0.16, maxX: 0.84, minY: 0.58, maxY: 0.9 };
const TAP_PX = 10;

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
  const hit = new Rectangle(0, 0, viewW, viewH);
  viewport.forceHitArea = hit;

  const ground = new Container();
  const backdrop = new Graphics();
  ground.addChild(backdrop);
  viewport.addChild(ground);
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
  const labelNodes = new Map<string, HTMLElement>();
  let downAt = 0;

  function worldSize(scene: ShellSceneName, width: number, height: number) {
    if (scene === "room") return { worldW: width, worldH: height };
    const worldW = width * LOBBY_WORLD.viewportWidthScale;
    return { worldW, worldH: worldW * (LOBBY_WORLD.height / LOBBY_WORLD.width) };
  }

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
      backdrop.rect(0, 0, worldW, worldH * 0.62).fill({ color: 0xf6d7e4 });
      backdrop.rect(0, worldH * 0.62, worldW, worldH).fill({ color: 0xf3d2c2 });
      backdrop.roundRect(worldW * 0.08, worldH * 0.08, worldW * 0.42, worldH * 0.22, 12).fill({ color: 0xc9e7ff });
      backdrop.roundRect(worldW * 0.58, worldH * 0.58, worldW * 0.3, worldH * 0.16, 8).fill({ color: 0xfff6ea });
    } else {
      backdrop.rect(0, 0, worldW, worldH * 0.12).fill({ color: night ? 0x2c3e66 : 0xbfe7ff });
      backdrop.rect(0, worldH * 0.12, worldW, worldH).fill({ color: night ? 0x6f9474 : 0x9fd48e });
      backdrop.ellipse(worldW * 0.5, worldH * 0.44, worldW * 0.16, worldH * 0.045).fill({ color: 0xd7f4f8 });
    }
  };

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
    if (!walker) return;
    walker.goal = null;
    walker.vx = 0;
    walker.vy = 0;
  };

  const aim = (worldX: number, worldY: number) => {
    const snap = options.getSnapshot();
    const size = worldSize(snap.scene, viewW, viewH);
    const point = clampPoint(
      { x: worldX / size.worldW, y: worldY / size.worldH },
      snap.scene === "room" ? ROOM_BOUNDS : LOBBY_BOUNDS,
    );
    if (!walker) walker = lobbyWalker(point);
    walker.goal = point;
    owned = true;
  };

  if (lobby) {
    viewport
      .drag()
      .pinch()
      .wheel({ smooth: false, percent: 0.1 })
      .decelerate({ friction: 0.9, minSpeed: 0.4 })
      .clamp({ direction: "all", underflow: "center" })
      .clampZoom({ minScale: ZOOM_MIN, maxScale: ZOOM_MAX });
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
      const scale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, viewport.scale.x * factor));
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
    paintBackdrop(snap.scene, snap.sky, worldW, worldH);
    if (snap.sprites !== lastSprites) {
      lastSprites = snap.sprites;
      requestFigures(snap.sprites);
    }
    const local = snap.sprites.find((sprite) => sprite.local);
    if (!walker && local) walker = lobbyWalker(local);
    if (walker) {
      placeLocal(walker, local ? { x: local.x, y: local.y } : null, owned);
      const bounds = snap.scene === "room" ? ROOM_BOUNDS : LOBBY_BOUNDS;
      const obstacle = snap.scene === "lobby" ? LOBBY_FOUNTAIN : null;
      const span = snap.scene === "room" ? viewW : worldW;
      Object.assign(walker, stepLocal(walker, dt, bounds, obstacle, span, reduced));
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
    if (lobby) viewport.update(dt * 1000);
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
    for (const sprite of snap.sprites) {
      const figure = figures.get(sprite.id);
      if (!figure) continue;
      const at = sprite.local && walker ? walker : (remotes.get(sprite.id) ?? sprite);
      const moving = sprite.local && walker ? Math.hypot(walker.vx, walker.vy) > 0.02 : false;
      const pose = walkPose(sprite.local && walker ? walker.phase : moving ? now / 159 : now / 700, moving, true);
      const worldX = at.x * worldW;
      const worldY = at.y * worldH + pose.bob;
      figure.root.position.set(worldX, worldY);
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
        const drawnX = viewport.x + worldX * viewport.scale.x;
        const headY = viewport.y + worldY * viewport.scale.y - height * viewport.scale.y;
        const pos = `${Math.round(drawnX)}:${Math.round(headY)}`;
        if (labelPos.get(label) !== pos) {
          labelPos.set(label, pos);
          label.style.left = `${Math.round(drawnX)}px`;
          label.style.top = `${Math.round(headY)}px`;
        }
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
    walker.goal = clampPoint(goal, snap.scene === "room" ? ROOM_BOUNDS : LOBBY_BOUNDS);
    owned = true;
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
      viewport.destroy({ children: true });
      app.destroy(false, { children: true });
    },
  };
}
