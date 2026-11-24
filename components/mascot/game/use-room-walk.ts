"use client";

import { useEffect, useRef } from "react";

import { gestureKind } from "@/lib/game/core/input";
import { mascotAssetUrl } from "@/lib/mascot/asset-url";
import {
  gridFromMask,
  gridSize,
  nearestWalkable,
  type WalkGrid,
} from "@/lib/mascot/game/lobby-walk";
import {
  ROOM_SPAWN,
  ROOM_WALK_MASK,
  ROOM_WORLD,
  roomPropCovers,
  roomSortIndex,
  roomWalkGrid,
  roomWanderGoal,
  sealRoomNav,
} from "@/lib/mascot/game/room-walk";
import { lobbyWorldSpeed } from "@/lib/mascot/game/walk";
import {
  createTravel,
  directionFromKeys,
  footPose,
  queueTap,
  stepTravel,
  type KeyDirs,
  type Travel,
} from "@/lib/mascot/game/stride";

const WANDER_AFTER_S = 5.5;

function cloneGrid(grid: WalkGrid): WalkGrid {
  return { cols: grid.cols, rows: grid.rows, walk: grid.walk.slice() };
}

/**
 * Tap the personal-room floor. The mask is read once. She eases along the
 * route, and arrow keys (no on-screen pad) do the same walk while held.
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

    let base: WalkGrid | null = null;
    let grid: WalkGrid | null = null;
    let travel: Travel = createTravel(ROOM_SPAWN);
    const held: KeyDirs = { up: false, down: false, left: false, right: false };
    let idleFor = 0;
    let last = performance.now();
    let raf = 0;
    let timer = 0;
    let dead = false;
    let pointers = 0;
    let start: { x: number; y: number; t: number; id: number } | null = null;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = media.matches;

    const overlaps = (
      a: { left: number; right: number; top: number; bottom: number },
      b: { left: number; right: number; top: number; bottom: number },
    ) => a.left < b.right - 4 && a.right > b.left + 4 && a.top < b.bottom - 4 && a.bottom > b.top + 4;

    const placeBubble = (el: HTMLElement) => {
      const bubble = el.querySelector<HTMLElement>(".beda-bubble");
      if (!bubble) return;
      const pad = 8;
      const place = (side: "above" | "below", dx: number) => {
        el.dataset.bubbleSide = side;
        el.style.setProperty("--bubble-x", `${dx}px`);
      };
      const frameBox = frame.getBoundingClientRect();
      place("above", 0);
      el.style.setProperty("--bubble-y", "0px");
      const box = bubble.getBoundingClientRect();
      const side = box.top < frameBox.top + pad ? "below" : "above";
      place(side, 0);
      el.style.setProperty("--bubble-y", "0px");
      const baseBox = bubble.getBoundingClientRect();
      const props = [...frame.querySelectorAll<HTMLElement>(".beda-bed, .beda-cabinet, .beda-plant, .beda-sink")].map(
        (item) => item.getBoundingClientRect(),
      );
      const figure = el.querySelector(".bd-figure")?.getBoundingClientRect() ?? null;
      const label = el.querySelector(".beda-pretty")?.getBoundingClientRect() ?? null;
      const shifted = (dx: number, dy: number) => ({
        left: baseBox.left + dx,
        right: baseBox.right + dx,
        top: baseBox.top + dy,
        bottom: baseBox.bottom + dy,
      });
      const onScreen = (rect: { left: number; right: number; top: number; bottom: number }) =>
        rect.left >= frameBox.left + pad &&
        rect.right <= frameBox.right - pad &&
        rect.top >= frameBox.top + pad &&
        rect.bottom <= frameBox.bottom - pad;
      const hitsFurniture = (rect: { left: number; right: number; top: number; bottom: number }) =>
        props.some((item) => overlaps(rect, item)) ||
        (figure != null && overlaps(rect, figure)) ||
        (label != null && overlaps(rect, label));
      let best: { dx: number; dy: number; score: number } | null = null;
      for (const dy of [0, -36, -72, 64, 108, -108, 148]) {
        for (const dx of [0, 48, -48, 96, -96, 144, -144, 192, -192]) {
          const rect = shifted(dx, dy);
          if (!onScreen(rect) || hitsFurniture(rect)) continue;
          const score = Math.abs(dx) + Math.abs(dy);
          if (!best || score < best.score) best = { dx, dy, score };
        }
      }
      place(side, best?.dx ?? 0);
      el.style.setProperty("--bubble-y", `${best?.dy ?? 0}px`);
    };

    let stillFor = 0;
    const placeCaption = (el: HTMLElement, moving: boolean, rawDt: number) => {
      if (moving) stillFor = 0;
      else stillFor += rawDt;
      el.dataset.caption = !moving && stillFor > 1 ? "in" : "out";
    };

    const placeDepth = (el: HTMLElement) => {
      const feet = el.getBoundingClientRect().bottom;
      for (const item of frame.querySelectorAll<HTMLElement>(".beda-bed, .beda-cabinet, .beda-plant, .beda-sink")) {
        const base = item.getBoundingClientRect().bottom;
        item.style.zIndex = roomPropCovers(feet, base) ? "48" : "36";
      }
    };

    const applySeal = () => {
      if (!base) return;
      grid = cloneGrid(base);
      const root = frame.closest(".beda-game") ?? frame.parentElement;
      const nav = root?.querySelector<HTMLElement>(".beda-nav");
      if (!nav) return;
      const scene = frame.getBoundingClientRect();
      const box = nav.getBoundingClientRect();
      if (scene.height < 1) return;
      sealRoomNav(grid, (box.top - scene.top) / scene.height);
    };

    const paint = (moving: boolean, rawDt: number) => {
      const el = heroRef.current;
      if (!el) return;
      const width = frame.clientWidth || 390;
      const height = frame.clientHeight || 844;
      const cruise = lobbyWorldSpeed(width);
      const screenDir = travel.heading
        ? { x: travel.heading.x * width, y: travel.heading.y * height }
        : null;
      const pose = footPose(travel.phase, moving, reduced, screenDir, travel.face < 0 ? -1 : 1);
      el.style.setProperty("--rx", travel.x.toFixed(4));
      el.style.setProperty("--ry", travel.y.toFixed(4));
      el.style.setProperty("--bob", `${pose.bob.toFixed(2)}px`);
      el.style.setProperty("--lx", `${pose.lx.toFixed(2)}px`);
      el.style.setProperty("--ly", `${pose.ly.toFixed(2)}px`);
      el.style.setProperty("--rx-foot", `${pose.rx.toFixed(2)}px`);
      el.style.setProperty("--ry-foot", `${pose.ry.toFixed(2)}px`);
      el.style.setProperty("--arm", `${pose.arm.toFixed(2)}deg`);
      el.style.setProperty("--face-x", travel.face.toFixed(3));
      el.style.zIndex = String(roomSortIndex(travel.y));
      el.dataset.nx = travel.x.toFixed(4);
      el.dataset.ny = travel.y.toFixed(4);
      el.dataset.stepping = moving ? "1" : "0";
      el.dataset.face = travel.faceTo < 0 ? "left" : "right";
      placeBubble(el);
      placeCaption(el, moving, rawDt);
      placeDepth(el);
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
      applySeal();
      ripple(x, y);
      travel = queueTap(travel, grid, { x, y });
      idleFor = 0;
      kick();
    };

    const tick = (now: number) => {
      raf = 0;
      const rawDt = Math.max(0, (now - last) / 1000);
      const dt = Math.min(0.05, rawDt);
      last = now;
      if (grid && !holdRef.current) {
        const width = frame.clientWidth || 390;
        const height = frame.clientHeight || 844;
        const dir = directionFromKeys(held);
        const before = { x: travel.x, y: travel.y };
        travel = stepTravel(travel, dt, grid, { dir, cruise: lobbyWorldSpeed(width), width, height });
        if (!Number.isFinite(travel.x) || !Number.isFinite(travel.y)) {
          const stand = nearestWalkable(grid, before.x, before.y);
          travel = { ...createTravel(stand), face: travel.face, faceTo: travel.faceTo };
        }
        const going = Boolean(dir) || Boolean(travel.goal) || travel.speed > 0;
        if (!going) {
          idleFor += dt;
          if (!reduced && idleFor > WANDER_AFTER_S) {
            idleFor = 0;
            const goal = roomWanderGoal(grid, travel);
            if (goal) travel = queueTap(travel, grid, goal);
          }
        } else {
          idleFor = 0;
        }
      }
      const moving = Boolean(directionFromKeys(held)) || Boolean(travel.goal) || travel.speed > 0.01;
      paint(moving, rawDt);
      if (dead) return;
      if (moving && !holdRef.current) raf = requestAnimationFrame(tick);
      else
        timer = window.setTimeout(() => {
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

    const keyDir = (key: string): keyof KeyDirs | null =>
      key === "ArrowUp" ? "up" : key === "ArrowDown" ? "down" : key === "ArrowLeft" ? "left" : key === "ArrowRight" ? "right" : null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (holdRef.current) return;
      const target = event.target;
      if (target instanceof Element && target.closest("input, textarea, select")) return;
      const dir = keyDir(event.key);
      if (!dir) return;
      held[dir] = true;
      event.preventDefault();
      idleFor = 0;
      kick();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const dir = keyDir(event.key);
      if (!dir) return;
      held[dir] = false;
      kick();
    };
    const onBlur = () => {
      held.up = false;
      held.down = false;
      held.left = false;
      held.right = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    window.addEventListener("resize", applySeal);

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
        base = gridFromMask(imageData.data, canvas.width, canvas.height, size.cols, size.rows);
        applySeal();
        if (grid) {
          const stand = nearestWalkable(grid, travel.x, travel.y);
          travel = { ...travel, x: stand.x, y: stand.y };
        }
        paint(false, 0);
      })
      .catch(() => {
        if (dead) return;
        base = roomWalkGrid();
        applySeal();
      });

    paint(false, 0);
    kick();

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      media.removeEventListener("change", onReduce);
      frame.removeEventListener("pointerdown", onDown);
      frame.removeEventListener("pointerup", onUp);
      frame.removeEventListener("pointercancel", onUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("resize", applySeal);
    };
  }, [enabled]);

  return { frameRef, heroRef };
}
