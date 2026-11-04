"use client";

import { useLayoutEffect, useRef } from "react";

import { LOBBY_WORLD, lobbyStackZ } from "@/lib/mascot/game/lobby";
import { spaFootScale } from "@/lib/mascot/game/spa-room";
import { sampleWander } from "@/lib/mascot/game/lobby-live";
import {
  LOBBY_BOUNDS,
  LOBBY_FOUNTAIN,
  SPA_BOUNDS,
  SPA_MAT,
  clampCamera,
  clampPoint,
  createWalker,
  ellipseContains,
  followCamera,
  pushGlide,
  sampleGlide,
  screenToWorld,
  stepWalker,
  zoomAt,
  type Camera,
  type Glide,
  type Obstacle,
} from "@/lib/mascot/game/walk";

const HOLD_MS = 280;
const PAN_PX = 10;

type ActorSpot = { id: string; x: number; y: number; sample: boolean; facing: "left" | "right" };

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function placeLobby(
  el: HTMLElement,
  x: number,
  y: number,
  worldW: number,
  worldH: number,
  size: number,
  squash: number,
) {
  el.style.setProperty("--mx", `${x * worldW}px`);
  el.style.setProperty("--my", `${y * worldH}px`);
  el.style.setProperty("--ms", String(size));
  el.style.setProperty("--sy", String(squash));
  el.style.zIndex = String(lobbyStackZ(y));
}

function setFacing(root: HTMLElement, face: number) {
  const art = root.querySelector<HTMLElement>(".beda-friend-art, .beda-spa-art");
  if (!art) return;
  const sign = face < 0 ? "-1" : "1";
  if (art.dataset.face === sign) return;
  art.dataset.face = sign;
  art.style.transform = face < 0 ? "scaleX(-1)" : "scaleX(1)";
}

/**
 * Draws the lobby with transforms: eased local walking, gliding guests,
 * and a camera that zooms around the fingers or the cursor.
 */
export function useLobbyMotion(input: {
  frameRef: React.RefObject<HTMLDivElement | null>;
  worldRef: React.RefObject<HTMLDivElement | null>;
  you: { x: number; y: number };
  actors: readonly ActorSpot[];
  onWalk: (x: number, y: number, pace?: "walk" | "idle") => void;
  onEmptyTap?: () => void;
}) {
  const youProp = useRef(input.you);
  const actorsProp = useRef(input.actors);
  const onWalk = useRef(input.onWalk);
  const onEmptyTap = useRef(input.onEmptyTap);
  youProp.current = input.you;
  actorsProp.current = input.actors;
  onWalk.current = input.onWalk;
  onEmptyTap.current = input.onEmptyTap;

  const api = useRef({
    panBy(dx: number, dy: number, user?: boolean) {
      void dx;
      void dy;
      void user;
    },
    zoomBy(factor: number) {
      void factor;
    },
    recenter() {},
  });

  useLayoutEffect(() => {
    const frame = input.frameRef.current;
    const world = input.worldRef.current;
    if (!frame || !world) return;

    let cam: Camera = { x: 0, y: 0, scale: 1 };
    let follow = true;
    let pull = false;
    let reduced = reducedMotion();
    const walker = createWalker(youProp.current);
    const glides = new Map<string, Glide>();
    const glideTargets = new Map<string, { x: number; y: number }>();
    let lastSend = 0;
    let sentMoving = false;
    let echoed = { x: youProp.current.x, y: youProp.current.y };
    let last = performance.now();
    let frameId = 0;

    const pointers = new Map<number, { x: number; y: number }>();
    let downPoint = { x: 0, y: 0 };
    let gesture: "pending" | "pan" | "follow" = "pending";
    let pinch: { dist: number; x: number; y: number } | null = null;

    const viewSize = () => ({
      w: frame.clientWidth,
      h: frame.clientHeight,
      worldW: world.offsetWidth || 1,
      worldH: world.offsetHeight || 1,
    });

    const applyCamera = () => {
      const { w, h, worldW, worldH } = viewSize();
      cam = clampCamera(cam, w, h, worldW, worldH);
      world.style.transform = `translate3d(${cam.x}px, ${cam.y}px, 0) scale(${cam.scale})`;
      frame.style.setProperty("--beda-zoom", String(cam.scale));
    };

    const toLobby = (clientX: number, clientY: number) => {
      const box = frame.getBoundingClientRect();
      const worldPt = screenToWorld(clientX - box.left, clientY - box.top, cam);
      const { worldW, worldH } = viewSize();
      const depth = worldPt.y / worldH;
      if (depth < LOBBY_WORLD.walk.minY) return null;
      const point = clampPoint({ x: worldPt.x / worldW, y: depth }, LOBBY_BOUNDS);
      if (ellipseContains(point, LOBBY_FOUNTAIN)) {
        return clampPoint(
          {
            x: LOBBY_FOUNTAIN.x + Math.sign(point.x - LOBBY_FOUNTAIN.x || 1) * LOBBY_FOUNTAIN.rx * 1.15,
            y: LOBBY_FOUNTAIN.y + Math.sign(point.y - LOBBY_FOUNTAIN.y || 1) * LOBBY_FOUNTAIN.ry * 1.15,
          },
          LOBBY_BOUNDS,
        );
      }
      return point;
    };

    const aim = (clientX: number, clientY: number) => {
      const point = toLobby(clientX, clientY);
      if (!point) return;
      follow = true;
      walker.goal = point;
    };

    api.current.panBy = (dx, dy, user = true) => {
      if (dx === 0 && dy === 0) return;
      if (user) {
        follow = false;
        pull = false;
      }
      cam = { ...cam, x: cam.x + dx, y: cam.y + dy };
      applyCamera();
    };
    api.current.zoomBy = (factor) => {
      const { w, h } = viewSize();
      cam = zoomAt(cam, factor, w / 2, h / 2);
      if (cam.scale > 1.05) follow = true;
      applyCamera();
    };
    api.current.recenter = () => {
      follow = true;
      pull = true;
    };

    const { w, h, worldW, worldH } = viewSize();
    cam = clampCamera(
      {
        x: w / 2 - youProp.current.x * worldW,
        y: h * 0.42 - youProp.current.y * worldH,
        scale: 1,
      },
      w,
      h,
      worldW,
      worldH,
    );
    applyCamera();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const stepped = stepWalker(walker, dt, LOBBY_FOUNTAIN, LOBBY_BOUNDS, reduced);
      Object.assign(walker, stepped);
      const server = youProp.current;
      if (!walker.goal && Math.hypot(server.x - echoed.x, server.y - echoed.y) > 0.02) {
        walker.x = server.x;
        walker.y = server.y;
        echoed = { x: server.x, y: server.y };
      }
      const size = viewSize();
      if (walker.goal) {
        if (now - lastSend > 480) {
          onWalk.current(walker.x, walker.y, "walk");
          echoed = { x: walker.x, y: walker.y };
          lastSend = now;
          sentMoving = true;
        }
      } else if (sentMoving) {
        onWalk.current(walker.x, walker.y, "idle");
        echoed = { x: walker.x, y: walker.y };
        sentMoving = false;
        lastSend = now;
      }
      if (follow) {
        cam = followCamera(
          cam,
          walker.x,
          walker.y,
          size.w,
          size.h,
          size.worldW,
          size.worldH,
          reduced ? 1 : dt,
          true,
        );
        pull = false;
      } else if (pull && !reduced) {
        const tx = size.w * 0.5 - walker.x * size.worldW * cam.scale;
        const ty = size.h * 0.46 - walker.y * size.worldH * cam.scale;
        const k = 1 - Math.exp(-3.2 * dt);
        cam = { ...cam, x: cam.x + (tx - cam.x) * k, y: cam.y + (ty - cam.y) * k };
        if (Math.hypot(tx - cam.x, ty - cam.y) < 2) pull = false;
      }
      applyCamera();

      const youEl = world.querySelector<HTMLElement>("[data-lobby-you].beda-pose");
      if (youEl) {
        placeLobby(youEl, walker.x, walker.y, size.worldW, size.worldH, 1.2, walker.squash);
        setFacing(youEl, walker.face);
      }

      for (const actor of actorsProp.current) {
        const pose = world.querySelector<HTMLElement>(`[data-friend-id="${actor.id}"].beda-pose`);
        if (!pose) continue;
        let x = actor.x;
        let y = actor.y;
        let face = actor.facing === "left" ? -1 : 1;
        if (actor.sample && !reduced) {
          const wandered = sampleWander(actor.id, now, actor.x, actor.y);
          x = wandered.x;
          y = wandered.y;
          face = wandered.facing === "left" ? -1 : 1;
        } else {
          const known = glideTargets.get(actor.id);
          if (!known || Math.hypot(known.x - actor.x, known.y - actor.y) > 0.0008) {
            glides.set(actor.id, pushGlide(glides.get(actor.id) ?? null, actor.x, actor.y, now));
            glideTargets.set(actor.id, { x: actor.x, y: actor.y });
          }
          const glide = glides.get(actor.id);
          const drawn = glide ? sampleGlide(glide, now) : { x: actor.x, y: actor.y };
          x = drawn.x;
          y = drawn.y;
          const moving = glide ? Math.hypot(glide.toX - glide.fromX, glide.toY - glide.fromY) > 0.0008 : false;
          face = moving ? glide!.face : face;
        }
        placeLobby(pose, x, y, size.worldW, size.worldH, 0.78 + y * 0.4, 1);
        setFacing(pose, face);
      }
      frameId = window.requestAnimationFrame(tick);
    };
    tick(last);

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const box = frame.getBoundingClientRect();
      cam = zoomAt(cam, Math.exp(-event.deltaY * 0.0016), event.clientX - box.left, event.clientY - box.top);
      if (cam.scale > 1.05) follow = true;
      applyCamera();
    };
    frame.addEventListener("wheel", onWheel, { passive: false });
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onReduce = () => {
      reduced = media.matches;
    };
    media.addEventListener("change", onReduce);

    const down = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const target = event.target as HTMLElement;
      if (target.closest("button, a, .beda-actions, .beda-nick, .beda-switch, .beda-zoom")) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      downPoint = { x: event.clientX, y: event.clientY };
      frame.setPointerCapture(event.pointerId);
      if (pointers.size === 2) {
        gesture = "pan";
        follow = false;
        const [a, b] = [...pointers.values()];
        pinch = {
          dist: Math.hypot(a!.x - b!.x, a!.y - b!.y) || 1,
          x: (a!.x + b!.x) / 2,
          y: (a!.y + b!.y) / 2,
        };
        return;
      }
      gesture = "pending";
    };
    const move = (event: PointerEvent) => {
      const prev = pointers.get(event.pointerId);
      if (!prev) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size >= 2 && pinch) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y) || 1;
        const midX = (a!.x + b!.x) / 2;
        const midY = (a!.y + b!.y) / 2;
        const box = frame.getBoundingClientRect();
        cam = zoomAt(cam, dist / pinch.dist, midX - box.left, midY - box.top);
        cam = { ...cam, x: cam.x + (midX - pinch.x), y: cam.y + (midY - pinch.y) };
        pinch = { dist, x: midX, y: midY };
        follow = cam.scale > 1.05;
        pull = false;
        applyCamera();
        return;
      }
      if (gesture === "pending" && Math.hypot(event.clientX - downPoint.x, event.clientY - downPoint.y) > PAN_PX) {
        gesture = "follow";
      }
      if (gesture === "follow") aim(event.clientX, event.clientY);
    };
    const up = (event: PointerEvent) => {
      const start = pointers.get(event.pointerId);
      pointers.delete(event.pointerId);
      pinch = null;
      if ((gesture === "pending" || gesture === "follow") && start && pointers.size === 0) {
        aim(event.clientX, event.clientY);
        if (gesture === "pending") onEmptyTap.current?.();
      }
      gesture = "pending";
    };
    frame.addEventListener("pointerdown", down);
    frame.addEventListener("pointermove", move);
    frame.addEventListener("pointerup", up);
    frame.addEventListener("pointercancel", up);

    return () => {
      window.cancelAnimationFrame(frameId);
      frame.removeEventListener("wheel", onWheel);
      frame.removeEventListener("pointerdown", down);
      frame.removeEventListener("pointermove", move);
      frame.removeEventListener("pointerup", up);
      frame.removeEventListener("pointercancel", up);
      media.removeEventListener("change", onReduce);
    };
  }, [input.frameRef, input.worldRef]);

  return api;
}

type SpaSpot = { id: string; x: number; y: number; facing: "left" | "right" };

/** Spa floor uses the same camera and walk, with the mat instead of the fountain. */
export function useSpaMotion(input: {
  frameRef: React.RefObject<HTMLDivElement | null>;
  viewRef: React.RefObject<HTMLDivElement | null>;
  stageRef: React.RefObject<HTMLDivElement | null>;
  guests?: readonly SpaSpot[];
  you?: { x: number; y: number } | null;
  onWalk?: (x: number, y: number, pace?: "walk" | "idle") => void;
}) {
  const guestsProp = useRef(input.guests ?? []);
  const youProp = useRef(input.you ?? null);
  const onWalk = useRef(input.onWalk);
  guestsProp.current = input.guests ?? [];
  youProp.current = input.you ?? null;
  onWalk.current = input.onWalk;

  const api = useRef({
    zoomBy(factor: number) {
      void factor;
    },
    recenter() {},
  });

  useLayoutEffect(() => {
    const frame = input.frameRef.current;
    const view = input.viewRef.current;
    const stage = input.stageRef.current;
    if (!frame || !view || !stage) return;
    let cam: Camera = { x: 0, y: 0, scale: 1 };
    let follow = true;
    let pull = false;
    let reduced = reducedMotion();
    const start = youProp.current ?? { x: 0.5, y: SPA_BOUNDS.maxY };
    const walker = createWalker(start);
    let last = performance.now();
    let frameId = 0;
    let lastSend = 0;
    let sentMoving = false;
    let seenServer = youProp.current ? { x: youProp.current.x, y: youProp.current.y } : null;
    const glides = new Map<string, Glide>();
    const glideTargets = new Map<string, { x: number; y: number }>();
    const pointers = new Map<number, { x: number; y: number }>();
    let gesture: "pending" | "pan" | "follow" = "pending";
    let pinch: { dist: number; x: number; y: number } | null = null;
    let holdTimer = 0;
    let downPoint = { x: 0, y: 0 };

    const apply = () => {
      cam = clampCamera(cam, frame.clientWidth, frame.clientHeight, view.offsetWidth || 1, view.offsetHeight || 1);
      view.style.transform = `translate3d(${cam.x}px, ${cam.y}px, 0) scale(${cam.scale})`;
      frame.style.setProperty("--beda-zoom", String(cam.scale));
    };

    const obstacle = (): Obstacle => {
      const mat = view.querySelector<HTMLElement>(".beda-spa-mat");
      if (!mat) return SPA_MAT;
      const scale = cam.scale || 1;
      const viewBox = view.getBoundingClientRect();
      const matBox = mat.getBoundingClientRect();
      const localX = (matBox.left - viewBox.left) / scale;
      const localY = (matBox.top - viewBox.top) / scale;
      const localW = matBox.width / scale;
      const localH = matBox.height / scale;
      const stageX = stage.offsetLeft;
      const stageY = stage.offsetTop;
      return {
        x: (localX + localW / 2 - stageX) / (stage.offsetWidth || 1),
        y: (localY + localH / 2 - stageY) / (stage.offsetHeight || 1),
        rx: localW / 2 / (stage.offsetWidth || 1),
        ry: localH / 2 / (stage.offsetHeight || 1),
      };
    };

    const toStage = (clientX: number, clientY: number) => {
      const box = frame.getBoundingClientRect();
      const local = screenToWorld(clientX - box.left, clientY - box.top, cam);
      return clampPoint(
        {
          x: (local.x - stage.offsetLeft) / (stage.offsetWidth || 1),
          y: (local.y - stage.offsetTop) / (stage.offsetHeight || 1),
        },
        SPA_BOUNDS,
      );
    };

    const aim = (clientX: number, clientY: number) => {
      let point = toStage(clientX, clientY);
      const mat = obstacle();
      if (ellipseContains(point, mat)) {
        const sx = Math.sign(point.x - mat.x) || 1;
        const sy = Math.sign(point.y - mat.y) || 1;
        point = clampPoint(
          { x: mat.x + sx * mat.rx * 1.08, y: mat.y + sy * mat.ry * 1.08 },
          SPA_BOUNDS,
        );
      }
      walker.goal = point;
    };

    api.current.zoomBy = (factor) => {
      cam = zoomAt(cam, factor, frame.clientWidth / 2, frame.clientHeight / 2);
      if (cam.scale > 1.05) follow = true;
      apply();
    };
    api.current.recenter = () => {
      follow = true;
      pull = true;
    };
    apply();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      Object.assign(walker, stepWalker(walker, dt, obstacle(), SPA_BOUNDS, reduced));
      const server = youProp.current;
      if (server && (!seenServer || Math.hypot(server.x - seenServer.x, server.y - seenServer.y) > 0.0008)) {
        seenServer = { x: server.x, y: server.y };
        if (!walker.goal) {
          walker.x = server.x;
          walker.y = server.y;
        }
      }
      if (onWalk.current) {
        if (walker.goal) {
          if (now - lastSend > 480) {
            onWalk.current(walker.x, walker.y, "walk");
            lastSend = now;
            sentMoving = true;
          }
        } else if (sentMoving) {
          onWalk.current(walker.x, walker.y, "idle");
          sentMoving = false;
          lastSend = now;
        }
      }
      if (!reduced && follow && cam.scale > 1.05) {
        const px = (stage.offsetLeft + walker.x * stage.offsetWidth) / (view.offsetWidth || 1);
        const py = (stage.offsetTop + walker.y * stage.offsetHeight) / (view.offsetHeight || 1);
        cam = followCamera(
          cam,
          px,
          py,
          frame.clientWidth,
          frame.clientHeight,
          view.offsetWidth || 1,
          view.offsetHeight || 1,
          dt,
          true,
        );
        pull = false;
      } else if (pull && !reduced) {
        const px = (stage.offsetLeft + walker.x * stage.offsetWidth) / (view.offsetWidth || 1);
        const py = (stage.offsetTop + walker.y * stage.offsetHeight) / (view.offsetHeight || 1);
        const tx = frame.clientWidth * 0.5 - px * (view.offsetWidth || 1) * cam.scale;
        const ty = frame.clientHeight * 0.46 - py * (view.offsetHeight || 1) * cam.scale;
        const k = 1 - Math.exp(-3.2 * dt);
        cam = { ...cam, x: cam.x + (tx - cam.x) * k, y: cam.y + (ty - cam.y) * k };
        if (Math.hypot(tx - cam.x, ty - cam.y) < 2) pull = false;
      }
      apply();
      const pose = stage.querySelector<HTMLElement>("[data-spa-you].beda-pose");
      if (pose) {
        pose.style.setProperty("--mx", `${walker.x * stage.offsetWidth}px`);
        pose.style.setProperty("--my", `${walker.y * stage.offsetHeight}px`);
        pose.style.setProperty("--sy", String(walker.squash));
        pose.style.zIndex = String(20 + Math.round(walker.y * 20));
        setFacing(pose, walker.face);
      }
      for (const guest of guestsProp.current) {
        const guestPose = stage.querySelector<HTMLElement>(`[data-friend-id="${guest.id}"].beda-pose`);
        if (!guestPose) continue;
        const known = glideTargets.get(guest.id);
        if (!known || Math.hypot(known.x - guest.x, known.y - guest.y) > 0.0008) {
          glides.set(guest.id, pushGlide(glides.get(guest.id) ?? null, guest.x, guest.y, now));
          glideTargets.set(guest.id, { x: guest.x, y: guest.y });
        }
        const glide = glides.get(guest.id);
        const drawn = glide && !reduced ? sampleGlide(glide, now) : { x: guest.x, y: guest.y };
        const moving = glide ? Math.hypot(glide.toX - glide.fromX, glide.toY - glide.fromY) > 0.0008 : false;
        guestPose.style.setProperty("--mx", `${drawn.x * stage.offsetWidth}px`);
        guestPose.style.setProperty("--my", `${drawn.y * stage.offsetHeight}px`);
        guestPose.style.setProperty("--scale", String(spaFootScale(drawn.y)));
        guestPose.style.zIndex = String(8 + Math.round(drawn.y * 24));
        setFacing(guestPose, moving ? glide!.face : guest.facing === "left" ? -1 : 1);
      }
      frameId = window.requestAnimationFrame(tick);
    };
    tick(last);

    const onWheel = (event: WheelEvent) => {
      if (!(event.target as HTMLElement).closest(".beda-spa-view, .beda-spa-stage")) return;
      event.preventDefault();
      const box = frame.getBoundingClientRect();
      cam = zoomAt(cam, Math.exp(-event.deltaY * 0.0016), event.clientX - box.left, event.clientY - box.top);
      if (cam.scale > 1.05) follow = true;
      apply();
    };
    frame.addEventListener("wheel", onWheel, { passive: false });
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onReduce = () => {
      reduced = media.matches;
    };
    media.addEventListener("change", onReduce);

    const down = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("button, a, .beda-actions, .beda-zoom, .beda-spa-invite, .beda-spa-head")) return;
      if (!target.closest(".beda-spa-view")) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      downPoint = { x: event.clientX, y: event.clientY };
      if (pointers.size >= 2) {
        window.clearTimeout(holdTimer);
        gesture = "pan";
        const [a, b] = [...pointers.values()];
        pinch = { dist: Math.hypot(a!.x - b!.x, a!.y - b!.y) || 1, x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 };
        return;
      }
      gesture = "pending";
      window.clearTimeout(holdTimer);
      holdTimer = window.setTimeout(() => {
        if (gesture !== "pending") return;
        gesture = "follow";
        aim(downPoint.x, downPoint.y);
      }, HOLD_MS);
    };
    const move = (event: PointerEvent) => {
      const prev = pointers.get(event.pointerId);
      if (!prev) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size >= 2 && pinch) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y) || 1;
        const midX = (a!.x + b!.x) / 2;
        const midY = (a!.y + b!.y) / 2;
        const box = frame.getBoundingClientRect();
        cam = zoomAt(cam, dist / pinch.dist, midX - box.left, midY - box.top);
        cam = { ...cam, x: cam.x + midX - pinch.x, y: cam.y + midY - pinch.y };
        pinch = { dist, x: midX, y: midY };
        follow = false;
        pull = false;
        apply();
        return;
      }
      const dx = event.clientX - prev.x;
      const dy = event.clientY - prev.y;
      if (gesture === "pending" && Math.hypot(event.clientX - downPoint.x, event.clientY - downPoint.y) > PAN_PX) {
        gesture = "pan";
        follow = false;
        pull = false;
        window.clearTimeout(holdTimer);
      }
      if (gesture === "pan") {
        cam = { ...cam, x: cam.x + dx, y: cam.y + dy };
        apply();
      } else if (gesture === "follow") aim(event.clientX, event.clientY);
    };
    const up = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return;
      pointers.delete(event.pointerId);
      window.clearTimeout(holdTimer);
      pinch = null;
      if (gesture === "pending" && Math.hypot(event.clientX - downPoint.x, event.clientY - downPoint.y) <= PAN_PX) {
        aim(event.clientX, event.clientY);
      }
      gesture = "pending";
    };
    frame.addEventListener("pointerdown", down);
    frame.addEventListener("pointermove", move);
    frame.addEventListener("pointerup", up);
    frame.addEventListener("pointercancel", up);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(holdTimer);
      frame.removeEventListener("wheel", onWheel);
      frame.removeEventListener("pointerdown", down);
      frame.removeEventListener("pointermove", move);
      frame.removeEventListener("pointerup", up);
      frame.removeEventListener("pointercancel", up);
      media.removeEventListener("change", onReduce);
    };
  }, [input.frameRef, input.viewRef, input.stageRef]);

  return api;
}
