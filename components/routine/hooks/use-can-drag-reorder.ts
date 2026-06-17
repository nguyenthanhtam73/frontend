"use client";

import { useEffect, useState } from "react";

/**
 * HTML5 drag-and-drop is unreliable on touch devices. Only enable reorder-by-drag
 * on large screens with a fine pointer (mouse/trackpad).
 */
export function useCanDragReorder() {
  const [canDrag, setCanDrag] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine) and (min-width: 1024px)");
    const update = () => setCanDrag(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return canDrag;
}
