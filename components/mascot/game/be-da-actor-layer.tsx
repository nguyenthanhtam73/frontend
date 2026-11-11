"use client";

import { useEffect, useRef } from "react";

/**
 * Pixi characters over a DOM room. The photo and the name tags stay in HTML.
 * Loaded only after the floor mounts.
 */
export function BeDaActorLayer() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const root = host?.parentElement;
    if (!host || !root) return;
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    host.appendChild(canvas);
    host.dataset.loading = "1";
    let dead = false;
    let stop = () => {
      canvas.remove();
    };
    void import("@/lib/mascot/game/shell/pixi-actors")
      .then((mod) => mod.startActorLayer({ canvas, root }))
      .then((handle) => {
        if (dead) {
          handle.destroy();
          canvas.remove();
          return;
        }
        delete host.dataset.loading;
        root.dataset.actors = "pixi";
        stop = () => {
          handle.destroy();
          canvas.remove();
          delete root.dataset.actors;
        };
      })
      .catch(() => {
        delete host.dataset.loading;
      });
    return () => {
      dead = true;
      stop();
    };
  }, []);

  return <div ref={hostRef} className="beda-actor-host" data-testid="beda-actors" />;
}
