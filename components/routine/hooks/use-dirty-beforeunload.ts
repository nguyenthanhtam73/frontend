"use client";

import { useEffect } from "react";

/** Warn on tab close / refresh while structural edits are unsaved. */
export function useDirtyBeforeUnload(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
}
