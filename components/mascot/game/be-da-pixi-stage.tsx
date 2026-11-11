"use client";

import { useEffect, useRef } from "react";

import type { ShellApi, ShellSnapshot } from "@/lib/game/core/types";
import { notePixiInitFailed } from "@/lib/mascot/game/shell/pixi-guard";

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
    void import("@/lib/mascot/game/shell/pixi-runtime")
      .then((mod) =>
        mod.startPixiShell({
          canvas,
          labels,
          getSnapshot: () => snapshotRef.current(),
          onWalk: (x, y, pace) => walkRef.current?.(x, y, pace),
          onEmptyTap: () => emptyRef.current?.(),
          api,
        }),
      )
      .then((handle) => {
        if (dead) {
          handle.destroy();
          canvas.remove();
          return;
        }
        destroy = () => {
          handle.destroy();
          canvas.remove();
        };
        delete host.dataset.loading;
        onReady?.();
      })
      .catch(() => {
        canvas.remove();
        notePixiInitFailed(host.dataset, dead, onError);
      });
    return () => {
      dead = true;
      destroy();
    };
    // The snapshot is read from a ref so a position tick does not rebuild the canvas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  return (
    <div ref={hostRef} className="beda-pixi-host" data-testid="beda-pixi" data-scene={scene} data-art={art} />
  );
}
