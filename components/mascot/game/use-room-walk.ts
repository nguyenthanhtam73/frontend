"use client";

import { useEffect, useRef } from "react";

import { gestureKind } from "@/lib/game/core/input";
import { mascotAssetUrl } from "@/lib/mascot/asset-url";
import {
  gridFromMask,
  gridSize,
  nearestWalkable,
  type WalkGrid,
  type WalkPoint,
} from "@/lib/mascot/game/lobby-walk";
import {
  ROOM_BOUNDS,
  ROOM_SPAWN,
  ROOM_WALK_MASK,
  ROOM_WORLD,
  roomDepthScale,
  roomNudge,
  roomRoute,
  roomSortIndex,
  roomStepTo,
  roomWalkGrid,
  roomWanderGoal,
  type RoomDir,
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
    let held: RoomDir | null = null;
    let idleFor = 0;
    let last = performance.now();
    let raf = 0;
    let timer = 0;
    let dead = false;
    let pointers = 0;
    let start: { x: number; y: number; t: number; id: number } | null = null;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = media.matches;

    const overlaps = (a: DOMRect, b: DOMRect) =>
      a.left < b.right - 4 && a.right > b.left + 4 && a.top < b.bottom - 4 && a.bottom > b.top + 4;

    const placeBubble = (el: HTMLElement) => {
      const bubble = el.querySelector<HTMLElement>(".beda-bubble");
      if (!bubble) return;
      const pad = 8;
      const padEl = frame.querySelector<HTMLElement>(".beda-pad:not(.is-hidden)");
      const place = (side: "above" | "below", dx: number) => {
        el.dataset.bubbleSide = side;
        el.style.setProperty("--bubble-x", `${dx}px`);
      };
      place("above", 0);
      const frameBox = frame.getBoundingClientRect();
      let box = bubble.getBoundingClientRect();
      const side = box.top < frameBox.top + pad ? "below" : "above";
      place(side, 0);
      box = bubble.getBoundingClientRect();
      let dx = 0;
      if (box.left < frameBox.left + pad) dx += frameBox.left + pad - box.left;
      if (box.right > frameBox.right - pad) dx -= box.right - (frameBox.right - pad);
      place(side, Math.round(dx));
      if (!padEl) return;
      box = bubble.getBoundingClientRect();
      const padBox = padEl.getBoundingClientRect();
      if (overlaps(box, padBox)) {
        dx += padBox.left - 8 - box.right;
        place(side, Math.round(dx));
      }
    };

    const paint = (moving: boolean) => {
      const el = heroRef.current;
      if (!el) return;
      const pose = walkPose(walker.phase, moving && !reduced);
      const depth = roomDepthScale(walker.y);
      // Room-only: the lobby bob is a few pixels. On this larger figure a
      // stronger lift and lean is what reads as a step and a turn.
      const sort = String(roomSortIndex(walker.y));
      el.style.setProperty("--rx", walker.x.toFixed(4));
      el.style.setProperty("--ry", walker.y.toFixed(4));
      el.style.setProperty("--bob", (pose.bob * 2.4).toFixed(2));
      el.style.setProperty("--sway", (pose.sway * 1.6).toFixed(2));
      el.style.setProperty("--tilt", (pose.tilt * 1.8).toFixed(2));
      el.style.setProperty("--squash", pose.squash.toFixed(3));
      el.style.setProperty("--face", walker.face < 0 ? "-1" : "1");
      el.style.setProperty("--shadow-x", pose.shadowX.toFixed(3));
      el.style.setProperty("--shadow-y", pose.shadowY.toFixed(3));
      el.style.setProperty("--depth", depth.toFixed(3));
      el.style.zIndex = sort;
      el.dataset.nx = walker.x.toFixed(4);
      el.dataset.ny = walker.y.toFixed(4);
      const stepping = moving && !reduced;
      el.dataset.stepping = stepping ? "1" : "0";
      el.dataset.face = walker.face < 0 ? "left" : "right";
      el.dataset.depth = depth.toFixed(3);
      placeBubble(el);
      placeCaption(el, stepping);
      placeDepth(el);
    };

    const placeCaption = (el: HTMLElement, moving: boolean) => {
      const pretty = el.querySelector<HTMLElement>(".beda-pretty");
      if (!pretty) return;
      if (moving) {
        pretty.style.opacity = "0";
        pretty.style.visibility = "hidden";
        return;
      }
      pretty.style.visibility = "visible";
      pretty.style.opacity = "1";
      const scene = frame.getBoundingClientRect();
      const hero = el.getBoundingClientRect();
      const width = pretty.offsetWidth || 160;
      const center = hero.left + hero.width / 2;
      const half = width / 2;
      const minCenter = scene.left + 8 + half;
      let maxCenter = scene.right - 8 - half;
      const pad = frame.querySelector<HTMLElement>(".beda-pad:not(.is-hidden)");
      if (pad) {
        const padBox = pad.getBoundingClientRect();
        const labelTop = hero.bottom + 8;
        const labelBottom = labelTop + (pretty.offsetHeight || 24);
        const overlapsPad = labelBottom > padBox.top && labelTop < padBox.bottom;
        if (overlapsPad) maxCenter = Math.min(maxCenter, padBox.left - 8 - half);
      }
      const clamped = Math.max(minCenter, Math.min(center, maxCenter));
      pretty.style.setProperty("--pretty-x", `${Math.round(clamped - center)}px`);
    };

    const placeDepth = (el: HTMLElement) => {
      const feet = el.getBoundingClientRect().bottom;
      const host = frame.querySelector<HTMLElement>(".beda-pixi-host");
      if (host) host.style.zIndex = "42";
      for (const item of frame.querySelectorAll<HTMLElement>(".beda-bed, .beda-cabinet, .beda-plant, .beda-sink")) {
        const box = item.getBoundingClientRect();
        // The box sits on the back of the floor. Its front edge is further down the planks.
        const base = box.bottom + 80;
        item.style.zIndex = feet < base ? "48" : "36";
      }
    };

    const ripple = (x: number, y: number) => {
      const mark = frame.querySelector<HTMLElement>(".beda-tap");
      if (!mark) return;
      mark.style.left = `${x * 100}%`;
      mark.style.top = `${y * 100}%`;
      mark.classList.remove("is-on");
      void mark.offsetWidth;
      mark.classList.add("is-on");
    };

    const aim = (x: number, y: number) => {
      if (!grid || holdRef.current) return;
      ripple(x, y);
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
        if (held) {
          const next = roomNudge(grid, walker, held);
          route = [];
          walker.goal = next;
          if (held === "left") walker.face = -1;
          if (held === "right") walker.face = 1;
          idleFor = 0;
        }
        const before = { x: walker.x, y: walker.y };
        walker = stepWalker(walker, dt, null, ROOM_BOUNDS, false, lobbyWorldSpeed(width), true);
        if (!walker.goal && route.length > 0) walker.goal = route.shift() ?? null;
        const stepped = roomStepTo(grid, before, walker);
        if (Math.hypot(stepped.x - walker.x, stepped.y - walker.y) > 0.0001) {
          walker = { ...walker, x: stepped.x, y: stepped.y, vx: 0, vy: 0, goal: null };
          route = [];
        }
        if (!held && !walker.goal && route.length === 0) {
          idleFor += dt;
          if (!reduced && idleFor > WANDER_AFTER_S) {
            idleFor = 0;
            const goal = roomWanderGoal(grid, walker);
            if (goal) {
              route = roomRoute(grid, walker, goal);
              walker.goal = route.shift() ?? null;
            }
          }
        } else {
          idleFor = 0;
        }
      }
      const moving = Boolean(walker.goal) || route.length > 0;
      paint(moving);
      if (dead) return;
      if ((moving || held) && !holdRef.current) raf = requestAnimationFrame(tick);
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

    const padButtons = [...frame.querySelectorAll<HTMLButtonElement>("[data-room-dir]")];
    const onPadDown = (event: PointerEvent) => {
      if (holdRef.current || event.button !== 0) return;
      const button = event.currentTarget;
      if (!(button instanceof HTMLButtonElement)) return;
      const dir = button.dataset.roomDir;
      if (dir !== "up" && dir !== "down" && dir !== "left" && dir !== "right") return;
      held = dir;
      button.setPointerCapture(event.pointerId);
      event.preventDefault();
      event.stopPropagation();
      kick();
    };
    const onPadUp = (event: PointerEvent) => {
      const button = event.currentTarget;
      if (button instanceof HTMLButtonElement && button.hasPointerCapture(event.pointerId)) {
        button.releasePointerCapture(event.pointerId);
      }
      held = null;
    };
    for (const button of padButtons) {
      button.addEventListener("pointerdown", onPadDown);
      button.addEventListener("pointerup", onPadUp);
      button.addEventListener("pointercancel", onPadUp);
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (holdRef.current) return;
      if ((event.target as HTMLElement | null)?.closest("input, textarea")) return;
      const dir =
        event.key === "ArrowUp" ? "up" : event.key === "ArrowDown" ? "down" : event.key === "ArrowLeft" ? "left" : event.key === "ArrowRight" ? "right" : null;
      if (!dir || event.repeat) return;
      held = dir;
      event.preventDefault();
      kick();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const dir =
        event.key === "ArrowUp" ? "up" : event.key === "ArrowDown" ? "down" : event.key === "ArrowLeft" ? "left" : event.key === "ArrowRight" ? "right" : null;
      if (dir && held === dir) held = null;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const image = new Image();
    image.src = mascotAssetUrl(ROOM_WALK_MASK);
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
      for (const button of padButtons) {
        button.removeEventListener("pointerdown", onPadDown);
        button.removeEventListener("pointerup", onPadUp);
        button.removeEventListener("pointercancel", onPadUp);
      }
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [enabled]);

  return { frameRef, heroRef };
}
