"use client";

import { useEffect, useRef } from "react";

import type { ShellApi, ShellSnapshot } from "@/lib/game/core/types";
import { PIXI_READY_MS, createPixiStartGate, notePixiInitFailed } from "@/lib/mascot/game/shell/pixi-guard";

type PixiHandle = { destroy: () => void };

/**
 * Canvas host. Pixi itself is imported only after this mounts, and only on the
 * Bé Da routes that render the lobby or the private room.
 */
export function BeDaPixiStage({
  scene,
  art,
  snapshot,
  labels,
  onWalk,
  onEmptyTap,
  api,
  onReady,
  onError,
  readyTimeoutMs = PIXI_READY_MS,
  startShell,
}: {
  scene: ShellSnapshot["scene"];
  art: string;
  snapshot: () => ShellSnapshot;
  labels: { current: HTMLElement | null };
  onWalk?: (x: number, y: number, pace?: "walk" | "idle") => void;
  onEmptyTap?: () => void;
  api?: { current: ShellApi };
  onReady?: () => void;
  onError?: () => void;
  /** Tests can shorten the wait. The live room uses four seconds. */
  readyTimeoutMs?: number;
  /** Tests can hold the shell open. The live room loads Pixi. */
  startShell?: (canvas: HTMLCanvasElement) => Promise<PixiHandle>;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const snapshotRef = useRef(snapshot);
  const walkRef = useRef(onWalk);
  const emptyRef = useRef(onEmptyTap);
  snapshotRef.current = snapshot;
  walkRef.current = onWalk;
  emptyRef.current = onEmptyTap;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    host.dataset.loading = "1";
    host.appendChild(canvas);
    let dead = false;
    let destroy = () => canvas.remove();
    const gate = createPixiStartGate();
    const timer = window.setTimeout(() => {
      if (!gate.claim()) return;
      dead = true;
      destroy();
      notePixiInitFailed(host.dataset, false, onError);
    }, readyTimeoutMs);
    const begin =
      startShell ??
      ((node: HTMLCanvasElement) =>
        import("@/lib/mascot/game/shell/pixi-runtime").then((mod) =>
          mod.startPixiShell({
            canvas: node,
            labels,
            getSnapshot: () => snapshotRef.current(),
            onWalk: (x, y, pace) => walkRef.current?.(x, y, pace),
            onEmptyTap: () => emptyRef.current?.(),
            api,
          }),
        ));
    void begin(canvas)
      .then((handle) => {
        if (dead || !gate.claim()) {
          handle.destroy();
          canvas.remove();
          return;
        }
        window.clearTimeout(timer);
        destroy = () => {
          handle.destroy();
          canvas.remove();
        };
        delete host.dataset.loading;
        onReady?.();
      })
      .catch(() => {
        window.clearTimeout(timer);
        canvas.remove();
        if (!gate.claim()) return;
        notePixiInitFailed(host.dataset, dead, onError);
      });
    return () => {
      dead = true;
      gate.claim();
      window.clearTimeout(timer);
      destroy();
    };
    // The snapshot is read from a ref so a position tick does not rebuild the canvas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  return (
    <div ref={hostRef} className="beda-pixi-host" data-testid="beda-pixi" data-scene={scene} data-art={art} />
  );
}
