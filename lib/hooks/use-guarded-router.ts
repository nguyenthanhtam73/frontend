"use client";

import { useMemo } from "react";

import { useRouter } from "@/i18n/navigation";
import { confirmLeaveIfBlocked } from "@/lib/stores/navigation-block-store";

/** useRouter wrapper that confirms before programmatic client navigations. */
export function useGuardedRouter() {
  const router = useRouter();

  return useMemo(
    () => ({
      ...router,
      push: (...args: Parameters<typeof router.push>) => {
        if (!confirmLeaveIfBlocked()) return;
        return router.push(...args);
      },
      replace: (...args: Parameters<typeof router.replace>) => {
        if (!confirmLeaveIfBlocked()) return;
        return router.replace(...args);
      },
      back: () => {
        if (!confirmLeaveIfBlocked()) return;
        return router.back();
      },
    }),
    [router],
  );
}
