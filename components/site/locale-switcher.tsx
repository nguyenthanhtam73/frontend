"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";

import {
  useBeginLocaleCrossfade,
  useIsLocaleSwitching,
} from "@/components/site/locale-navigation-bridge";
import { routing } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type AppLocale = (typeof routing.locales)[number];

export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations("common.language");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const beginLocaleCrossfade = useBeginLocaleCrossfade();
  const isLocaleSwitching = useIsLocaleSwitching();

  // Warm up the RSC payload for the alternate locale so the actual swap feels instant.
  useEffect(() => {
    for (const loc of routing.locales) {
      if (loc !== locale) {
        router.prefetch(pathname, { locale: loc });
      }
    }
  }, [locale, pathname, router]);

  function select(next: AppLocale) {
    if (next === locale || isLocaleSwitching) return;

    beginLocaleCrossfade(next);

    // Defer the navigation by one frame so the veil paints first.
    // Without this, the RSC commit can race the veil and the user briefly sees
    // the new content slot in before the cover is visible.
    requestAnimationFrame(() => {
      router.replace(pathname, { locale: next, scroll: false });
    });
  }

  return (
    <div
      className={cn(
        "inline-flex min-h-9 items-center gap-0.5 rounded-lg border border-border bg-background p-0.5 transition-opacity duration-150",
        isLocaleSwitching && "opacity-70",
        className,
      )}
      role="group"
      aria-label={t("label")}
      aria-busy={isLocaleSwitching || undefined}
    >
      {routing.locales.map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => select(loc)}
          disabled={isLocaleSwitching}
          aria-pressed={locale === loc}
          aria-label={loc === "vi" ? t("vietnamese") : t("english")}
          className={cn(
            "shrink-0 cursor-pointer rounded-md px-2.5 py-1 text-center text-[11px] font-medium leading-snug tracking-normal whitespace-nowrap transition-colors disabled:cursor-default disabled:opacity-80 sm:px-3 sm:text-xs",
            locale === loc
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {loc === "vi" ? t("vietnamese") : t("english")}
        </button>
      ))}
    </div>
  );
}
