"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import type { ShellApi, ShellSnapshot } from "@/lib/game/core/types";
import { GAME_GATE_RETRY_MS } from "@/components/mascot/game/be-da-game-gate";
import { PIXI_READY_MS, createFrameWatch, notePixiInitFailed } from "@/lib/mascot/game/shell/pixi-guard";

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
  startShell?: (canvas: HTMLCanvasElement, hooks: { onFirstFrame: () => void }) => Promise<PixiHandle>;
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
    let torn = false;
    let handle: PixiHandle | null = null;
    const watch = createFrameWatch();
    const teardown = () => {
      if (torn) return;
      torn = true;
      window.clearTimeout(timer);
      canvas.removeEventListener("webglcontextlost", onLost);
      try {
        handle?.destroy();
      } catch {
        /* already destroyed */
      }
      handle = null;
      canvas.remove();
    };
    const fail = (force = false) => {
      if (dead) return;
      if (!watch.fail(force)) return;
      dead = true;
      teardown();
      notePixiInitFailed(host.dataset, false, onError);
    };
    const timer = window.setTimeout(() => fail(false), readyTimeoutMs);
    const onLost = (event: Event) => {
      event.preventDefault();
      fail(true);
    };
    canvas.addEventListener("webglcontextlost", onLost);
    const begin =
      startShell ??
      ((node: HTMLCanvasElement, hooks: { onFirstFrame: () => void }) =>
        import("@/lib/mascot/game/shell/pixi-runtime").then((mod) =>
          mod.startPixiShell({
            canvas: node,
            labels,
            getSnapshot: () => snapshotRef.current(),
            onWalk: (x, y, pace) => walkRef.current?.(x, y, pace),
            onEmptyTap: () => emptyRef.current?.(),
            api,
            onFirstFrame: hooks.onFirstFrame,
          }),
        ));
    void begin(canvas, {
      onFirstFrame: () => {
        if (dead || !watch.noteFrame()) return;
        window.clearTimeout(timer);
        delete host.dataset.loading;
        onReady?.();
      },
    })
      .then((next) => {
        watch.noteInit();
        handle = next;
        if (dead || watch.failed) {
          next.destroy();
          handle = null;
          canvas.remove();
        }
      })
      .catch(() => {
        fail(false);
      });
    return () => {
      dead = true;
      teardown();
    };
    // The snapshot is read from a ref so a position tick does not rebuild the canvas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  return (
    <div ref={hostRef} className="beda-pixi-host" data-testid="beda-pixi" data-scene={scene} data-art={art} />
  );
}

/** Opening line over the room while the first frame is still missing. */
export function BeDaDrawWait({ retry, onRetry }: { retry: boolean; onRetry: () => void }) {
  const t = useTranslations("mascot");
  return (
    <div className="beda-draw-wait" data-testid="beda-draw-wait" data-retry={retry ? "1" : "0"}>
      <p>{t("game.opening")}</p>
      {retry ? (
        <button type="button" className="beda-gate-retry" data-testid="beda-draw-retry" onClick={onRetry}>
          {t("game.tryAgain")}
        </button>
      ) : null}
    </div>
  );
}

export function useDrawRetry(active: boolean): boolean {
  const [retry, setRetry] = useState(false);
  useEffect(() => {
    if (!active) {
      setRetry(false);
      return;
    }
    const timer = window.setTimeout(() => setRetry(true), GAME_GATE_RETRY_MS);
    return () => window.clearTimeout(timer);
  }, [active]);
  return retry;
}
