"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { ApiError } from "@/lib/api-client";
import { mascotQueryKey } from "@/lib/api/mascot";
import {
  getRoomTree,
  markTreeSeen,
  msUntilVietnamMidnight,
  newTreeIdempotencyKey,
  prefersLightMotion,
  treeIsHidden,
  treeMotionMs,
  treeReasonFromError,
  treeStageName,
  vietnamDayKey,
  waterRoomTree,
  type RoomTree,
  type RoomTreeTick,
  type TreeMotion,
  type TreeReward,
} from "@/lib/mascot/game/room-tree";
import type { RoomEvent } from "@/lib/mascot/game/spa-room";

export type RoomTreePanel = {
  visible: boolean;
  tree: RoomTree | null;
  /** Snapshot from before the motion, so the count can wait for its beat. */
  before: RoomTree | null;
  watering: boolean;
  motion: TreeMotion | null;
  level: boolean;
  toastName: string | null;
  popup: TreeReward[] | null;
  /** Freeze the motion at this millisecond. Live play leaves this null. */
  animMs: number | null;
  /** Force the fade-only motion. Null follows the device. */
  reduced: boolean | null;
  onWater: () => void;
  onTakeGift: () => void;
  onMotionEnd: () => void;
};

const HIDDEN: RoomTreePanel = {
  visible: false,
  tree: null,
  before: null,
  watering: false,
  motion: null,
  level: false,
  toastName: null,
  popup: null,
  animMs: null,
  reduced: null,
  onWater: () => undefined,
  onTakeGift: () => undefined,
  onMotionEnd: () => undefined,
};

function gainedRewards(before: RoomTree | null, next: RoomTree): TreeReward[] {
  if (next.justGranted.length > 0) return next.justGranted;
  const had = new Set((before?.myRewards ?? []).map((reward) => reward.stage));
  return next.myRewards.filter((reward) => !had.has(reward.stage) && (reward.coins > 0 || reward.itemId !== ""));
}

function applyTick(prev: RoomTree, tick: RoomTreeTick): RoomTree {
  const stage = tick.op === "tree_level_up" ? tick.stage : prev.stage;
  return {
    ...prev,
    waters: tick.waters,
    required: tick.required,
    progress: tick.progress,
    stage,
    stageName: stage === prev.stage ? prev.stageName : treeStageName(stage),
    bloomed: stage >= 7 || prev.bloomed,
    canWater: stage >= 7 ? false : prev.canWater,
    reason: stage >= 7 ? "bloomed" : prev.reason,
    treeType: tick.treeType || prev.treeType,
  };
}

/**
 * Shared tree for the open room.
 * A 404 not_found hides it, the same gate as the rest of the room.
 */
export function useRoomTree(
  code: string | null,
  active: boolean,
  selfName: string,
  onBalance: (balance: number) => void,
  listen: { current: (event: RoomEvent & { tree: NonNullable<RoomEvent["tree"]> }) => void },
): RoomTreePanel {
  const [tree, setTree] = useState<RoomTree | null>(null);
  const [visible, setVisible] = useState(false);
  const [before, setBefore] = useState<RoomTree | null>(null);
  const [watering, setWatering] = useState(false);
  const [motion, setMotion] = useState<TreeMotion | null>(null);
  const [level, setLevel] = useState(false);
  const [toastName, setToastName] = useState<string | null>(null);
  const [popup, setPopup] = useState<TreeReward[] | null>(null);
  const treeRef = useRef<RoomTree | null>(null);
  const balanceRef = useRef(onBalance);
  const nameRef = useRef(selfName);
  const codeRef = useRef(code);
  const ownRef = useRef<{ at: number; waters: number; stage: number } | null>(null);
  const queueRef = useRef<RoomTreeTick[]>([]);
  const busyRef = useRef(false);
  const waterKey = useRef<string | null>(null);
  const wateringRef = useRef(false);
  const seenRef = useRef(new Set<number>());
  const queryClient = useQueryClient();
  balanceRef.current = onBalance;
  nameRef.current = selfName;
  codeRef.current = code;
  treeRef.current = tree;

  const publish = useCallback((next: RoomTree) => {
    treeRef.current = next;
    setTree(next);
    setVisible(true);
    balanceRef.current(next.balance);
    if (next.justGranted.length > 0) {
      void queryClient.invalidateQueries({ queryKey: mascotQueryKey });
    }
  }, [queryClient]);

  const showUnseen = useCallback((next: RoomTree) => {
    const fresh = next.unseenRewards.filter((reward) => !seenRef.current.has(reward.stage));
    if (fresh.length === 0) return;
    for (const reward of fresh) seenRef.current.add(reward.stage);
    setPopup(fresh);
    const room = codeRef.current;
    if (!room) return;
    void queryClient.invalidateQueries({ queryKey: mascotQueryKey });
    void markTreeSeen(room, fresh.map((reward) => reward.stage)).catch((err: unknown) => {
      const missing = err instanceof ApiError && (err.status === 404 || err.status === 405 || err.status === 501);
      if (missing) return;
      for (const reward of fresh) seenRef.current.delete(reward.stage);
    });
  }, [queryClient]);

  const finishMotion = useCallback(() => {
    setMotion(null);
    setToastName(null);
    setBefore(null);
  }, []);

  const runQueue = useCallback(async () => {
    if (busyRef.current) return;
    const room = codeRef.current;
    if (!room) return;
    const next = queueRef.current.shift();
    if (!next) return;
    busyRef.current = true;
    const grows = next.op === "tree_level_up";
    const prior = treeRef.current;
    setBefore(prior);
    setLevel(grows);
    setToastName(next.name || null);
    setMotion(grows && !next.name ? "grow" : "other");
    if (prior) publish(applyTick(prior, next));
    const light = prefersLightMotion(typeof window === "undefined" ? null : window);
    const motionKind: TreeMotion = grows && !next.name ? "grow" : "other";
    await wait(treeMotionMs(motionKind, grows, light));
    if (grows && codeRef.current === room) {
      try {
        const fresh = await getRoomTree(room);
        const gifts = gainedRewards(prior, fresh);
        publish(fresh);
        if (gifts.length > 0) setPopup(gifts);
      } catch {
        /* The tick already moved the plant. The next open refetches. */
      }
    }
    finishMotion();
    busyRef.current = false;
    if (queueRef.current.length > 0) {
      await wait(800);
      void runQueue();
    }
  }, [finishMotion, publish]);

  useEffect(() => {
    listen.current = (event) => {
      if (event.op !== "tree_watered" && event.op !== "tree_level_up") return;
      if (!event.tree) return;
      const own = ownRef.current;
      const recent = own != null && Date.now() - own.at < 5000;
      if (recent && event.op === "tree_watered" && event.tree.waters === own.waters) return;
      if (recent && event.op === "tree_level_up" && event.tree.stage === own.stage) return;
      const mine = nameRef.current.trim();
      if (mine && event.tree.name === mine) return;
      queueRef.current.push({
        op: event.op,
        name: event.tree.name,
        waters: event.tree.waters,
        required: event.tree.required,
        progress: event.tree.progress,
        stage: event.tree.stage,
        treeType: event.tree.treeType,
      });
      void runQueue();
    };
  }, [listen, runQueue]);

  useEffect(() => {
    if (!active || !code) {
      setVisible(false);
      setTree(null);
      setPopup(null);
      setMotion(null);
      return;
    }
    let cancel = false;
    waterKey.current = null;
    wateringRef.current = false;
    void getRoomTree(code)
      .then((next) => {
        if (cancel) return;
        publish(next);
        showUnseen(next);
      })
      .catch((err: unknown) => {
        if (cancel) return;
        if (treeIsHidden(err)) {
          setVisible(false);
          setTree(null);
        }
      });
    return () => {
      cancel = true;
    };
  }, [active, code, publish, showUnseen]);

  useEffect(() => {
    if (!active || !code) return;
    let cancel = false;
    let timer = 0;
    let day = vietnamDayKey(new Date());
    const refresh = () => {
      void getRoomTree(code)
        .then((next) => {
          if (cancel) return;
          publish(next);
          showUnseen(next);
        })
        .catch(() => undefined);
    };
    const arm = () => {
      timer = window.setTimeout(() => {
        if (cancel) return;
        day = vietnamDayKey(new Date());
        refresh();
        arm();
      }, msUntilVietnamMidnight(new Date()));
    };
    const onShow = () => {
      if (document.visibilityState === "hidden") return;
      const nextDay = vietnamDayKey(new Date());
      if (nextDay === day) return;
      day = nextDay;
      refresh();
    };
    arm();
    document.addEventListener("visibilitychange", onShow);
    return () => {
      cancel = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [active, code, publish, showUnseen]);

  const onWater = useCallback(() => {
    const room = code;
    const current = treeRef.current;
    if (!room || !current || wateringRef.current || !current.canWater) return;
    if (!waterKey.current) waterKey.current = newTreeIdempotencyKey();
    const key = waterKey.current;
    wateringRef.current = true;
    setWatering(true);
    void waterRoomTree(room, key)
      .then((next) => {
        waterKey.current = null;
        if (!next) return;
        if (!next.already) {
          ownRef.current = { at: Date.now(), waters: next.waters, stage: next.stage };
          setBefore(current);
          setLevel(next.leveled);
          setToastName(null);
          setMotion("water");
          if (next.justGranted.length > 0) setPopup(next.justGranted);
        }
        publish(next);
      })
      .catch((err: unknown) => {
        const reason = treeReasonFromError(err);
        if (reason) {
          waterKey.current = null;
          setTree((prev) =>
            prev
              ? {
                  ...prev,
                  canWater: false,
                  reason,
                  bloomed: reason === "bloomed" || prev.bloomed,
                }
              : prev,
          );
          void getRoomTree(room)
            .then((fresh) => publish(fresh))
            .catch(() => undefined);
        }
      })
      .finally(() => {
        wateringRef.current = false;
        setWatering(false);
      });
  }, [code, publish]);

  const onTakeGift = useCallback(() => setPopup(null), []);

  if (!visible || !tree) return { ...HIDDEN, onWater, onTakeGift, onMotionEnd: finishMotion };

  return {
    visible,
    tree,
    before,
    watering,
    motion,
    level,
    toastName,
    popup,
    animMs: null,
    reduced: null,
    onWater,
    onTakeGift,
    onMotionEnd: finishMotion,
  };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
