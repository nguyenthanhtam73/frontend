import { Application, Assets, Container, Graphics, Sprite, type Texture } from "pixi.js";

import { LOBBY_WORLD } from "@/lib/mascot/game/lobby";
import {
  LOBBY_BOUNDS,
  LOBBY_FOUNTAIN,
  emptyRemoteBook,
  lobbyWalker,
  placeLocal,
  stepLocal,
  stepRemotes,
} from "@/lib/mascot/game/shell/actors";
import { cappedDpr } from "@/lib/mascot/game/shell/dpr";
import { arrowGoal, pointerKind } from "@/lib/mascot/game/shell/input";
import { startShellClock } from "@/lib/mascot/game/shell/loop";
import type { ShellApi, ShellSceneName, ShellSnapshot, ShellSprite } from "@/lib/mascot/game/shell/types";
import {
  clampPoint,
  followCamera,
  screenToWorld,
  walkPose,
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
  let cam: Camera = { x: 0, y: 0, scale: 1 };
  let follow = true;
  let owned = false;
  let walker: Walker | null = null;
  let lastSend = 0;
  let sentMoving = false;
  let reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let booted = false;
  const pointers = new Map<number, { x: number; y: number }>();
  let down = { x: 0, y: 0 };
  let dragged = false;

  const view = () => ({
    w: parent.clientWidth || 1,
    h: parent.clientHeight || 1,
  });

  const worldSize = (scene: ShellSceneName) => {
    const { w } = view();
    if (scene === "room") return { worldW: w, worldH: view().h };
    const worldW = w * LOBBY_WORLD.viewportWidthScale;
    return { worldW, worldH: worldW * (LOBBY_WORLD.height / LOBBY_WORLD.width) };
  };

  const paintBackdrop = (scene: ShellSceneName, sky: string) => {
    const { worldW, worldH } = worldSize(scene);
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
      if (have) {
        have.root.destroy({ children: true });
        figures.delete(sprite.id);
      }
      const root = new Container();
      world.addChild(root);
      for (const src of sprite.art) {
        try {
          const texture = await Assets.load<Texture>(src);
          const plate = new Sprite(texture);
          plate.anchor.set(0.5, 1);
          root.addChild(plate);
        } catch {
          /* a missing plate does not block the rest of the figure */
        }
      }
      figures.set(sprite.id, { key, root });
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

  const aim = (clientX: number, clientY: number) => {
    const snap = options.getSnapshot();
    const box = options.canvas.getBoundingClientRect();
    const { worldW, worldH } = worldSize(snap.scene);
    const local = screenToWorld(clientX - box.left, clientY - box.top, cam);
    const point = clampPoint(
      { x: local.x / worldW, y: local.y / worldH },
      snap.scene === "room" ? ROOM_BOUNDS : LOBBY_BOUNDS,
    );
    if (!walker) walker = lobbyWalker(point);
    walker.goal = point;
    owned = true;
    follow = true;
  };

  const api: ShellApi = {
    zoomBy(factor) {
      cam = { ...cam, scale: Math.min(2.5, Math.max(0.6, cam.scale * factor)) };
      if (cam.scale > 1.05) follow = true;
    },
    recenter() {
      follow = true;
    },
    panBy(dx, dy, user = true) {
      if (user) follow = false;
      cam = { ...cam, x: cam.x + dx, y: cam.y + dy };
    },
  };
  if (options.api) options.api.current = api;

  const clock = startShellClock((dt, now) => {
    const snap = options.getSnapshot();
    const { w, h } = view();
    const { worldW, worldH } = worldSize(snap.scene);
    paintBackdrop(snap.scene, snap.sky);
    requestFigures(snap.sprites);
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
      if (snap.scene === "lobby" && follow) {
        if (!booted) {
          cam = followCamera(cam, walker.x, walker.y, w, h, worldW, worldH, 1, true);
          booted = true;
        }
        cam = followCamera(cam, walker.x, walker.y, w, h, worldW, worldH, reduced ? 1 : dt, true);
      }
    }
    world.position.set(cam.x, cam.y);
    world.scale.set(cam.scale);
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
      const drawnX = cam.x + at.x * worldW * cam.scale;
      const drawnY = cam.y + at.y * worldH * cam.scale;
      figure.root.position.set(at.x * worldW, at.y * worldH + pose.bob);
      const face = sprite.local && walker ? walker.face : sprite.facing === "left" ? -1 : 1;
      const height = heightFor(at.y);
      figure.root.scale.x = face;
      for (const child of figure.root.children) {
        if (!(child instanceof Sprite)) continue;
        const texH = child.texture.height || 250;
        const texW = child.texture.width || 220;
        child.height = height;
        child.width = height * (texW / texH);
        child.scale.x = Math.abs(child.scale.x);
      }
      const label = options.labels.current?.querySelector<HTMLElement>(`[data-pixi-label="${sprite.id}"]`);
      if (label) {
        label.style.left = `${drawnX}px`;
        label.style.top = `${drawnY}px`;
      }
    }
    app.render();
  });

  const onDown = (event: PointerEvent) => {
    if ((event.target as HTMLElement).closest("button, a, input, .beda-actions, .beda-zoom")) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    down = { x: event.clientX, y: event.clientY };
    dragged = false;
  };
  const onMove = (event: PointerEvent) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointerKind(Math.hypot(event.clientX - down.x, event.clientY - down.y)) === "drag") {
      dragged = true;
      aim(event.clientX, event.clientY);
    }
  };
  const onUp = (event: PointerEvent) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    if (!dragged && pointerKind(Math.hypot(event.clientX - down.x, event.clientY - down.y)) === "tap") {
      aim(event.clientX, event.clientY);
      options.onEmptyTap?.();
    }
  };
  parent.addEventListener("pointerdown", onDown);
  parent.addEventListener("pointermove", onMove);
  parent.addEventListener("pointerup", onUp);
  parent.addEventListener("pointercancel", onUp);

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
    follow = true;
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
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      media.removeEventListener("change", onReduce);
      parent.removeEventListener("pointerdown", onDown);
      parent.removeEventListener("pointermove", onMove);
      parent.removeEventListener("pointerup", onUp);
      parent.removeEventListener("pointercancel", onUp);
      app.destroy(false, { children: true });
    },
  };
}
