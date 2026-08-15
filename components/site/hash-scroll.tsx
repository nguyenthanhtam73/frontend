"use client";

import { usePathname } from "@/i18n/navigation";
import { HASH_CHANGE_EVENT } from "@/lib/use-current-hash";
import { useEffect } from "react";

function scrollToLocationHash(): "done" | "missing" | "skip" {
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw) return "skip";
  let id = raw;
  try {
    id = decodeURIComponent(raw);
  } catch {
    /* keep raw */
  }
  const el = document.getElementById(id);
  if (!el) return "missing";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  return "done";
}

/**
 * Next.js client `<Link href="/#how">` updates the URL without native hash
 * scrolling. Pair that with a sticky header and the section lands under chrome.
 */
export function HashScroll() {
  const pathname = usePathname();

  useEffect(() => {
    const timers: number[] = [];
    let cancelled = false;

    const run = () => {
      timers.splice(0).forEach((id) => window.clearTimeout(id));
      let finished = false;
      const attempt = (delayMs: number) => {
        timers.push(
          window.setTimeout(() => {
            if (cancelled || finished) return;
            const result = scrollToLocationHash();
            if (result !== "missing") finished = true;
          }, delayMs),
        );
      };
      // Home content may not exist on the first paint after a client nav.
      attempt(0);
      attempt(80);
      attempt(250);
    };

    run();
    window.addEventListener("hashchange", run);
    window.addEventListener(HASH_CHANGE_EVENT, run);
    window.addEventListener("popstate", run);
    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
      window.removeEventListener("hashchange", run);
      window.removeEventListener(HASH_CHANGE_EVENT, run);
      window.removeEventListener("popstate", run);
    };
  }, [pathname]);

  return null;
}
