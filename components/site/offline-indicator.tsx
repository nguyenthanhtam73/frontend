"use client";

import { WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";

import { useOnlineStatus } from "@/lib/use-online-status";
import { cn } from "@/lib/utils";

/**
 * Slim global banner that appears at the very top of the viewport whenever the
 * device loses connectivity. Renders nothing when online so it imposes zero
 * cost in the happy path. Intentionally non-modal — the rest of the UI stays
 * usable since cached routes/data still work via the service worker.
 *
 * Sits above the sticky `SiteHeader` (z-40 vs the header's z-30) and respects
 * iOS safe-area insets for standalone-mode users.
 */
export function OfflineIndicator() {
  const online = useOnlineStatus();
  const t = useTranslations("pwa");

  return (
    <div
      role="status"
      aria-live="polite"
      aria-hidden={online}
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center transition-transform duration-300 motion-reduce:transition-none",
        online ? "-translate-y-full" : "translate-y-0",
      )}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div
        className={cn(
          "pointer-events-auto m-2 flex items-center gap-2 rounded-full border border-amber-300/60 bg-amber-50/95 px-3.5 py-1.5 text-xs font-medium text-amber-900 shadow-sm backdrop-blur",
          "dark:border-amber-400/30 dark:bg-amber-950/80 dark:text-amber-100",
        )}
      >
        <WifiOff className="size-3.5" aria-hidden />
        <span>{t("offlineBanner")}</span>
      </div>
    </div>
  );
}
