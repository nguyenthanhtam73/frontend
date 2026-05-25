"use client";

import { useEffect, useState } from "react";

const HASH_CHANGE_EVENT = "dadiary:hashchange";

type PatchedHistory = History & { __dadiaryHashPatched?: boolean };

/**
 * Returns the current URL hash (without `#`), reactive to:
 *  - browser hash changes (`hashchange` event)
 *  - back/forward navigation (`popstate`)
 *  - in-app `<Link>` clicks that mutate `history.pushState` / `replaceState`
 *    (Next.js does NOT fire `hashchange` for same-path hash anchors)
 *
 * SSR-safe: returns "" before hydration, then syncs from `window.location.hash`.
 */
export function useCurrentHash() {
  const [hash, setHash] = useState("");

  useEffect(() => {
    let cancelled = false;

    /** Defer state updates so we never call setState synchronously during a
     *  React render / useInsertionEffect (Next.js patches pushState there). */
    const read = () => {
      const next = window.location.hash.replace(/^#/, "");
      queueMicrotask(() => {
        if (cancelled) return;
        setHash((prev) => (prev === next ? prev : next));
      });
    };
    read();

    const history = window.history as PatchedHistory;
    if (!history.__dadiaryHashPatched) {
      const origPush = history.pushState.bind(history);
      const origReplace = history.replaceState.bind(history);
      const dispatch = () => {
        // Detach from the synchronous caller (could be inside an insertion effect).
        queueMicrotask(() => window.dispatchEvent(new Event(HASH_CHANGE_EVENT)));
      };

      history.pushState = function (
        ...args: Parameters<History["pushState"]>
      ) {
        const result = origPush(...args);
        dispatch();
        return result;
      };
      history.replaceState = function (
        ...args: Parameters<History["replaceState"]>
      ) {
        const result = origReplace(...args);
        dispatch();
        return result;
      };
      history.__dadiaryHashPatched = true;
    }

    window.addEventListener("hashchange", read);
    window.addEventListener("popstate", read);
    window.addEventListener(HASH_CHANGE_EVENT, read);

    return () => {
      cancelled = true;
      window.removeEventListener("hashchange", read);
      window.removeEventListener("popstate", read);
      window.removeEventListener(HASH_CHANGE_EVENT, read);
    };
  }, []);

  return hash;
}
