"use client";

import { useEffect, useRef } from "react";

import { gestureKind } from "@/lib/game/core/input";
import {
  findRoute,
  gridFromMask,
  gridSize,
  isWalkable,
  nearestWalkable,
  type WalkGrid,
  type WalkPoint,
} from "@/lib/mascot/game/lobby-walk";
import {
  ROOM_BOUNDS,
  ROOM_SPAWN,
  ROOM_WALK_MASK,
  ROOM_WORLD,
  roomRoute,
  roomWalkGrid,
  roomWanderGoal,
} from "@/lib/mascot/game/room-walk";
import { createWalker, lobbyWorldSpeed, stepWalker, walkPose, type Walker } from "@/lib/mascot/game/walk";

const WANDER_AFTER_S = 5.5;

/**
 * Tap the personal-room floor. The mask is read once. A* runs on that tap,
 * then a short animation frame loop eases her along the route. Idle time
 * uses a slow timer so the iPad is not repainting an empty stroll.
 */
export function useRoomWalk(enabled: boolean, hold: boolean) {
  const frameRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const holdRef = useRef(hold);
  holdRef.current = hold;

  useEffect(() => {
    if (!enabled) return;
    const frame = frameRef.current;
    if (!frame) return;

    let grid: WalkGrid | null = null;
    let walker: Walker = createWalker(ROOM_SPAWN);
    let route: WalkPoint[] = [];
    let idleFor = 0;
    let last = performance.now();
    let raf = 0;
    let timer = 0;
    let dead = false;
    let pointers = 0;
    let start: { x: number; y: number; t: number; id: number } | null = null;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = media.matches;

    const paint = (moving: boolean) => {
      const el = heroRef.current;
      if (!el) return;
      const pose = walkPose(walker.phase, moving && !reduced);
      el.style.setProperty("--rx", walker.x.toFixed(4));
      el.style.setProperty("--ry", walker.y.toFixed(4));
      el.style.setProperty("--bob", pose.bob.toFixed(2));
      el.style.setProperty("--sway", pose.sway.toFixed(2));
      el.style.setProperty("--tilt", pose.tilt.toFixed(2));
      el.style.setProperty("--squash", pose.squash.toFixed(3));
      el.style.setProperty("--face", walker.face < 0 ? "-1" : "1");
      el.style.setProperty("--shadow-x", pose.shadowX.toFixed(3));
      el.style.setProperty("--shadow-y", pose.shadowY.toFixed(3));
      el.dataset.nx = walker.x.toFixed(4);
      el.dataset.ny = walker.y.toFixed(4);
      el.dataset.stepping = moving && !reduced ? "1" : "0";
    };

    const aim = (x: number, y: number) => {
      if (!grid || holdRef.current) return;
      if (!isWalkable(grid, walker.x, walker.y)) {
        const stand = nearestWalkable(grid, walker.x, walker.y);
        walker.x = stand.x;
        walker.y = stand.y;
      }
      route = roomRoute(grid, walker, { x, y });
      walker.goal = route.shift() ?? null;
      idleFor = 0;
      kick();
    };

    const tick = (now: number) => {
      raf = 0;
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      if (grid && !holdRef.current) {
        const width = frame.clientWidth || 390;
        if (reduced && (walker.goal || route.length > 0)) {
          const lastPoint = route.length > 0 ? route[route.length - 1]! : walker.goal!;
          walker.x = lastPoint.x;
          walker.y = lastPoint.y;
          walker.vx = 0;
          walker.vy = 0;
          walker.goal = null;
          route = [];
        } else {
          walker = stepWalker(walker, dt, null, ROOM_BOUNDS, reduced, lobbyWorldSpeed(width), true);
          if (!walker.goal && route.length > 0) walker.goal = route.shift() ?? null;
        }
        if (!walker.goal && route.length === 0) {
          idleFor += dt;
          if (!reduced && idleFor > WANDER_AFTER_S) {
            idleFor = 0;
            const goal = roomWanderGoal(grid, walker);
            if (goal) {
              route = findRoute(grid, walker, goal);
              walker.goal = route.shift() ?? null;
            }
          }
        } else {
          idleFor = 0;
        }
        if (!walker.goal && !isWalkable(grid, walker.x, walker.y)) {
          const stand = nearestWalkable(grid, walker.x, walker.y);
          walker.x = stand.x;
          walker.y = stand.y;
        }
      }
      const moving = Boolean(walker.goal) || route.length > 0;
      paint(moving);
      if (dead) return;
      if (moving && !holdRef.current) raf = requestAnimationFrame(tick);
      else timer = window.setTimeout(() => {
        raf = requestAnimationFrame(tick);
      }, 250);
    };

    const kick = () => {
      window.clearTimeout(timer);
      timer = 0;
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    const onReduce = () => {
      reduced = media.matches;
    };
    media.addEventListener("change", onReduce);

    const onDown = (event: PointerEvent) => {
      pointers += 1;
      if (event.button !== 0 || holdRef.current) return;
      const target = event.target;
      if (target instanceof Element && target.closest("button, a, input, textarea, select")) return;
      start = { x: event.clientX, y: event.clientY, t: performance.now(), id: event.pointerId };
    };
    const onUp = (event: PointerEvent) => {
      pointers = Math.max(0, pointers - 1);
      const began = start;
      if (began?.id === event.pointerId) start = null;
      if (!began || began.id !== event.pointerId || pointers > 0 || holdRef.current) return;
      const dist = Math.hypot(event.clientX - began.x, event.clientY - began.y);
      if (gestureKind(performance.now() - began.t, dist, 1) !== "tap") return;
      const rect = frame.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      aim((event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height);
    };
    frame.addEventListener("pointerdown", onDown);
    frame.addEventListener("pointerup", onUp);
    frame.addEventListener("pointercancel", onUp);

    const image = new Image();
    image.src = ROOM_WALK_MASK;
    void image
      .decode()
      .then(() => {
        if (dead) return;
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(image, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const size = gridSize(ROOM_WORLD, ROOM_WORLD);
        grid = gridFromMask(imageData.data, canvas.width, canvas.height, size.cols, size.rows);
        const stand = nearestWalkable(grid, walker.x, walker.y);
        walker.x = stand.x;
        walker.y = stand.y;
        paint(false);
      })
      .catch(() => {
        if (dead) return;
        grid = roomWalkGrid();
      });

    paint(false);
    kick();

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      media.removeEventListener("change", onReduce);
      frame.removeEventListener("pointerdown", onDown);
      frame.removeEventListener("pointerup", onUp);
      frame.removeEventListener("pointercancel", onUp);
    };
  }, [enabled]);

  return { frameRef, heroRef };
}
