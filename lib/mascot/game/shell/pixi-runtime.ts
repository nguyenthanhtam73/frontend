import { Application, Assets, Container, Graphics, Sprite, type Texture } from "pixi.js";

import { LOBBY_WORLD } from "@/lib/mascot/game/lobby";
import { startShellClock } from "@/lib/game/core/clock";
import { cappedDpr } from "@/lib/game/core/dpr";
import { arrowGoal, DRAG_PX, gestureKind, TAP_MS } from "@/lib/game/core/input";
import { applyPinch, easeZoom, panCamera, wheelZoomFactor, type PinchSample } from "@/lib/game/core/zoom";
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
import {
  clampPoint,
  followCamera,
  screenToWorld,
  walkPose,
  zoomAt,
  type Camera,
  type Walker,
} from "@/lib/mascot/game/walk";

const ROOM_BOUNDS = { minX: 0.16, maxX: 0.84, minY: 0.58, maxY: 0.9 };

type Figure = { key: string; root: Container };

/**
 * Pixi world for Góc bình yên and the lobby. Loaded only after the canvas mounts.
 * Positions for other people still come from the existing snapshot sync.
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
  await app.init({
    canvas: options.canvas,
    resizeTo: parent,
    resolution: cappedDpr(window.devicePixelRatio || 1),
    autoDensity: true,
    antialias: false,
    preference: "webgl",
    backgroundAlpha: 0,
  });
  app.ticker.stop();

  const world = new Container();
  app.stage.addChild(world);
  const backdrop = new Graphics();
  world.addChild(backdrop);
  const figures = new Map<string, Figure>();
  const book = emptyRemoteBook();
  let shown: Camera = { x: 0, y: 0, scale: 1 };
  let desired: Camera = { x: 0, y: 0, scale: 1 };
  let zoomFocus = { x: 0, y: 0 };
  let easing = false;
  let follow = true;
  let panning = false;
  let pinched = false;
  let owned = false;
  let walker: Walker | null = null;
  let lastSend = 0;
  let sentMoving = false;
  let reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let booted = false;
  let backdropScene = "";
  let backdropSky = "";
  let backdropW = -1;
  let backdropH = -1;
  let lastSprites: readonly ShellSprite[] | null = null;
  let zoomText = "";
  let followStill = false;
  let followX = Number.NaN;
  let followY = Number.NaN;
  const spriteSize = new WeakMap<Sprite, number>();
  let viewW = parent.clientWidth || 1;
  let viewH = parent.clientHeight || 1;
  const labelPos = new WeakMap<HTMLElement, string>();
  const labelNodes = new Map<string, HTMLElement>();
  const pointers = new Map<number, { x: number; y: number }>();
  let downState: { x: number; y: number; t: number; cam: Camera } | null = null;
  let pinch: PinchSample | null = null;

  const readView = () => {
    const nextW = parent.clientWidth || 1;
    const nextH = parent.clientHeight || 1;
    if (nextW === viewW && nextH === viewH) return;
    viewW = nextW;
    viewH = nextH;
    backdropW = -1;
  };
  const viewObserver = new ResizeObserver(readView);
  viewObserver.observe(parent);

  const worldSize = (scene: ShellSceneName) => {
    if (scene === "room") return { worldW: viewW, worldH: viewH };
    const worldW = viewW * LOBBY_WORLD.viewportWidthScale;
    return { worldW, worldH: worldW * (LOBBY_WORLD.height / LOBBY_WORLD.width) };
  };

  const paintBackdrop = (scene: ShellSceneName, sky: string, worldW: number, worldH: number) => {
    const rw = Math.round(worldW);
    const rh = Math.round(worldH);
    if (scene === backdropScene && sky === backdropSky && rw === backdropW && rh === backdropH) return;
    backdropScene = scene;
    backdropSky = sky;
    backdropW = rw;
    backdropH = rh;
    const night = sky === "night" || sky === "evening";
    backdrop.clear();
    if (scene === "room") {
      backdrop.rect(0, 0, worldW, worldH * 0.62).fill({ color: 0xf6d7e4 });
      backdrop.rect(0, worldH * 0.62, worldW, worldH).fill({ color: 0xf3d2c2 });
      backdrop.roundRect(worldW * 0.08, worldH * 0.08, worldW * 0.42, worldH * 0.22, 12).fill({ color: 0xc9e7ff });
      backdrop.roundRect(worldW * 0.58, worldH * 0.58, worldW * 0.3, worldH * 0.16, 8).fill({ color: 0xfff6ea });
      return;
    }
    backdrop.rect(0, 0, worldW, worldH * 0.12).fill({ color: night ? 0x2c3e66 : 0xbfe7ff });
    backdrop.rect(0, worldH * 0.12, worldW, worldH).fill({ color: night ? 0x6f9474 : 0x9fd48e });
    backdrop.ellipse(worldW * 0.5, worldH * 0.44, worldW * 0.16, worldH * 0.045).fill({ color: 0xd7f4f8 });
  };

  const syncFigures = async (sprites: readonly ShellSprite[]) => {
    const live = new Set(sprites.map((sprite) => sprite.id));
    for (const [id, figure] of figures) {
      if (!live.has(id)) {
        figure.root.destroy({ children: true });
        figures.delete(id);
      }
    }
    for (const sprite of sprites) {
      const key = sprite.art.join("|");
      const have = figures.get(sprite.id);
      if (have?.key === key) continue;
      const next = new Container();
      for (const src of sprite.art) {
        try {
          const texture = await Assets.load<Texture>(src);
          const plate = new Sprite(texture);
          plate.anchor.set(0.5, 1);
          next.addChild(plate);
        } catch {
          /* a missing plate does not block the rest of the figure */
        }
      }
      if (next.children.length === 0) {
        next.destroy();
        continue;
      }
      if (have) have.root.destroy({ children: true });
      world.addChild(next);
      figures.set(sprite.id, { key, root: next });
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

  const frameOf = () => {
    const snap = options.getSnapshot();
    const size = worldSize(snap.scene);
    return { w: viewW, h: viewH, ...size };
  };

  const aim = (clientX: number, clientY: number) => {
    const snap = options.getSnapshot();
    const box = options.canvas.getBoundingClientRect();
    const { worldW, worldH } = worldSize(snap.scene);
    const local = screenToWorld(clientX - box.left, clientY - box.top, shown);
    const point = clampPoint(
      { x: local.x / worldW, y: local.y / worldH },
      snap.scene === "room" ? ROOM_BOUNDS : LOBBY_BOUNDS,
    );
    if (!walker) walker = lobbyWalker(point);
    walker.goal = point;
    owned = true;
    easing = false;
    desired = shown;
    follow = true;
    followStill = false;
    panning = false;
  };

  const queueZoom = (next: Camera, focusX: number, focusY: number) => {
    const box = frameOf();
    desired = panCamera(next, 0, 0, box.w, box.h, box.worldW, box.worldH);
    zoomFocus = { x: focusX, y: focusY };
    easing = true;
    follow = false;
    panning = false;
    stopWalk();
  };

  const api: ShellApi = {
    zoomBy(factor) {
      queueZoom(zoomAt(desired, factor, viewW / 2, viewH / 2), viewW / 2, viewH / 2);
    },
    recenter() {
      easing = false;
      panning = false;
      desired = shown;
      follow = true;
      followStill = false;
    },
    panBy(dx, dy, user = true) {
      const box = frameOf();
      const next = panCamera(shown, dx, dy, box.w, box.h, box.worldW, box.worldH);
      shown = next;
      desired = next;
      if (user) {
        follow = false;
        easing = false;
        stopWalk();
      }
    },
  };
  if (options.api) options.api.current = api;

  const clock = startShellClock((dt, now) => {
    const snap = options.getSnapshot();
    const w = viewW;
    const h = viewH;
    const { worldW, worldH } = worldSize(snap.scene);
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
      const span = snap.scene === "room" ? w : worldW;
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
      if (snap.scene === "lobby" && easing) {
        shown = easeZoom(shown, desired, zoomFocus.x, zoomFocus.y, dt, reduced);
        if (shown === desired) easing = false;
      } else if (snap.scene === "lobby" && follow && !panning) {
        const parked = followStill && walker.x === followX && walker.y === followY;
        if (!parked) {
          if (!booted) {
            shown = followCamera(shown, walker.x, walker.y, w, h, worldW, worldH, 1, true);
            booted = true;
          }
          const nextCam = followCamera(shown, walker.x, walker.y, w, h, worldW, worldH, reduced ? 1 : dt, true);
          if (Math.abs(nextCam.x - shown.x) < 0.4 && Math.abs(nextCam.y - shown.y) < 0.4) {
            followStill = true;
            followX = walker.x;
            followY = walker.y;
          } else {
            followStill = false;
            shown = nextCam;
            desired = shown;
          }
        }
      }
    }
    if (world.position.x !== shown.x || world.position.y !== shown.y) world.position.set(shown.x, shown.y);
    if (world.scale.x !== shown.scale) world.scale.set(shown.scale);
    const remotes = stepRemotes(
      book,
      snap.sprites.filter((sprite) => !sprite.local),
      now,
      worldW,
      worldH,
      reduced,
    );
    const heightFor = (y: number) => (snap.scene === "room" ? Math.min(230, h * 0.36) : (96 + y * 36) * 1.2);
    for (const sprite of snap.sprites) {
      const figure = figures.get(sprite.id);
      if (!figure) continue;
      const at = sprite.local && walker ? walker : (remotes.get(sprite.id) ?? sprite);
      const moving = sprite.local && walker ? Math.hypot(walker.vx, walker.vy) > 0.02 : false;
      const pose = walkPose(sprite.local && walker ? walker.phase : moving ? now / 159 : now / 700, moving, true);
      const drawnX = shown.x + at.x * worldW * shown.scale;
      const drawnY = shown.y + at.y * worldH * shown.scale;
      figure.root.position.set(at.x * worldW, at.y * worldH + pose.bob);
      const face = sprite.local && walker ? walker.face : sprite.facing === "left" ? -1 : 1;
      const height = heightFor(at.y);
      if (figure.root.scale.x !== face) figure.root.scale.x = face;
      for (const child of figure.root.children) {
        if (!(child instanceof Sprite)) continue;
        const known = spriteSize.get(child);
        if (known === height) continue;
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
        const pos = `${Math.round(drawnX)}:${Math.round(drawnY)}`;
        if (labelPos.get(label) !== pos) {
          labelPos.set(label, pos);
          label.style.left = `${Math.round(drawnX)}px`;
          label.style.top = `${Math.round(drawnY)}px`;
        }
      }
    }
    const host = options.canvas.parentElement;
    if (host) {
      const nextZoom = shown.scale.toFixed(3);
      if (nextZoom !== zoomText) {
        zoomText = nextZoom;
        host.dataset.zoom = nextZoom;
      }
    }
    app.render();
  });

  const viewPoint = (clientX: number, clientY: number) => {
    const box = options.canvas.getBoundingClientRect();
    return { x: clientX - box.left, y: clientY - box.top };
  };

  const beginPinch = () => {
    const pts = [...pointers.values()];
    const a = pts[0];
    const b = pts[1];
    if (!a || !b) return;
    if (downState) {
      shown = downState.cam;
      desired = downState.cam;
    }
    easing = false;
    panning = false;
    pinched = true;
    follow = false;
    stopWalk();
    pinch = {
      dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
    };
  };

  const onDown = (event: PointerEvent) => {
    if (options.getSnapshot().scene !== "lobby") return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const target = event.target instanceof Element ? event.target : null;
    const onControl = !!target?.closest("button, a, input, textarea, .beda-zoom, .beda-actions, .beda-nick, .beda-spa-entry");
    if (onControl && pointers.size === 0) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    try {
      surface.setPointerCapture(event.pointerId);
    } catch {
      /* the pointer can end before the frame accepts capture */
    }
    if (pointers.size >= 2) {
      beginPinch();
      return;
    }
    downState = { x: event.clientX, y: event.clientY, t: performance.now(), cam: { ...shown } };
    panning = false;
  };
  const onMove = (event: PointerEvent) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (gestureKind(0, 0, pointers.size) === "pinch" && pinch) {
      event.preventDefault();
      const pts = [...pointers.values()];
      const a = pts[0];
      const b = pts[1];
      if (!a || !b) return;
      const next = {
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
      };
      const focus = viewPoint(next.x, next.y);
      queueZoom(applyPinch(desired, pinch, next, focus.x, focus.y), focus.x, focus.y);
      pinch = next;
      return;
    }
    if (pinched || !downState) return;
    const distance = Math.hypot(event.clientX - downState.x, event.clientY - downState.y);
    const elapsed = performance.now() - downState.t;
    if (gestureKind(elapsed, distance, 1) !== "pan") return;
    event.preventDefault();
    const box = frameOf();
    const next = panCamera(
      downState.cam,
      event.clientX - downState.x,
      event.clientY - downState.y,
      box.w,
      box.h,
      box.worldW,
      box.worldH,
    );
    easing = false;
    follow = false;
    panning = true;
    stopWalk();
    shown = next;
    desired = next;
  };
  const onUp = (event: PointerEvent) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    if (pointers.size >= 2) {
      beginPinch();
      return;
    }
    if (pointers.size > 0) {
      pinch = null;
      return;
    }
    const wasPinch = pinched;
    const state = downState;
    pinched = false;
    pinch = null;
    downState = null;
    const wasPan = panning;
    panning = false;
    if (wasPinch || !state) return;
    const distance = Math.hypot(event.clientX - state.x, event.clientY - state.y);
    const elapsed = performance.now() - state.t;
    if (wasPan) return;
    if (distance >= DRAG_PX) {
      const box = frameOf();
      const next = panCamera(
        state.cam,
        event.clientX - state.x,
        event.clientY - state.y,
        box.w,
        box.h,
        box.worldW,
        box.worldH,
      );
      easing = false;
      follow = false;
      stopWalk();
      shown = next;
      desired = next;
      return;
    }
    if (gestureKind(elapsed, distance, 1) === "tap" && elapsed <= TAP_MS) {
      aim(event.clientX, event.clientY);
      options.onEmptyTap?.();
    }
  };
  const onWheel = (event: WheelEvent) => {
    if (options.getSnapshot().scene !== "lobby") return;
    event.preventDefault();
    const focus = viewPoint(event.clientX, event.clientY);
    queueZoom(zoomAt(desired, wheelZoomFactor(event.deltaY), focus.x, focus.y), focus.x, focus.y);
  };
  const onGesture = (event: Event) => {
    event.preventDefault();
  };
  const surface = options.labels.current ?? parent;
  surface.addEventListener("pointerdown", onDown);
  surface.addEventListener("pointermove", onMove);
  surface.addEventListener("pointerup", onUp);
  surface.addEventListener("pointercancel", onUp);
  surface.addEventListener("wheel", onWheel, { passive: false });
  surface.addEventListener("gesturestart", onGesture);
  surface.addEventListener("gesturechange", onGesture);

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
    easing = false;
    desired = shown;
    follow = true;
    followStill = false;
    panning = false;
  };
  window.addEventListener("keydown", onKey);
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  const onReduce = () => {
    reduced = media.matches;
  };
  media.addEventListener("change", onReduce);

  const onResize = () => {
    const next = cappedDpr(window.devicePixelRatio || 1);
    if (app.renderer.resolution !== next) {
      app.renderer.resolution = next;
      app.resize();
    }
  };
  window.addEventListener("resize", onResize);

  return {
    destroy() {
      clock.stop();
      viewObserver.disconnect();
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      media.removeEventListener("change", onReduce);
      surface.removeEventListener("pointerdown", onDown);
      surface.removeEventListener("pointermove", onMove);
      surface.removeEventListener("pointerup", onUp);
      surface.removeEventListener("pointercancel", onUp);
      surface.removeEventListener("wheel", onWheel);
      surface.removeEventListener("gesturestart", onGesture);
      surface.removeEventListener("gesturechange", onGesture);
      app.destroy(false, { children: true });
    },
  };
}
