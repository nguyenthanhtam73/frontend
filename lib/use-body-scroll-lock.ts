import { useEffect } from "react";

/** Lock body scroll without shifting layout when the scrollbar disappears. */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const docEl = document.documentElement;
    const body = document.body;
    const scrollbarWidth = window.innerWidth - docEl.clientWidth;
    const prevOverflow = body.style.overflow;
    const prevBodyPadding = body.style.paddingRight;
    const prevDocPadding = docEl.style.paddingRight;

    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      const pad = `${scrollbarWidth}px`;
      body.style.paddingRight = pad;
      docEl.style.paddingRight = pad;
    }

    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevBodyPadding;
      docEl.style.paddingRight = prevDocPadding;
    };
  }, [active]);
}
