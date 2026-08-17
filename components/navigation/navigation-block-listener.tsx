"use client";

import { useEffect } from "react";

import { usePathname, useRouter } from "@/i18n/navigation";
import { isSameAppRoute, resolveInternalPathname } from "@/lib/navigation/app-path";
import { confirmLeaveIfBlocked, useNavigationBlockStore } from "@/lib/stores/navigation-block-store";

function findAnchor(target: EventTarget | null): HTMLAnchorElement | null {
  if (!(target instanceof Element)) return null;
  const anchor = target.closest("a[href]");
  return anchor instanceof HTMLAnchorElement ? anchor : null;
}

/**
 * Intercepts in-app link clicks while a navigation block is active.
 * Mounted once in the locale shell — routine (or others) register via useNavigationBlock.
 */
export function NavigationBlockListener() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const onClickCapture = (event: MouseEvent) => {
      const block = useNavigationBlockStore.getState().getActiveBlock();
      if (!block?.isActive()) return;

      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = findAnchor(event.target);
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const rawHref = anchor.getAttribute("href");
      if (!rawHref || rawHref.startsWith("mailto:") || rawHref.startsWith("tel:")) return;

      const targetPath = resolveInternalPathname(rawHref, window.location.origin);
      if (!targetPath) return;

      if (isSameAppRoute(pathname, targetPath)) return;

      event.preventDefault();
      event.stopPropagation();

      if (!confirmLeaveIfBlocked()) return;

      const nextUrl = new URL(rawHref, window.location.origin);
      const href = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
      router.push(href as Parameters<typeof router.push>[0]);
    };

    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, [pathname, router]);

  return null;
}
