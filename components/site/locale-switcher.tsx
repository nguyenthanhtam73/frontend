"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";

import { routing } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type AppLocale = (typeof routing.locales)[number];

export function LocaleSwitcher({
  className,
  compact = false,
}: {
  className?: string;
  /** Short VI / EN labels — keeps the header on one row on phones. */
  compact?: boolean;
}) {
  const t = useTranslations("common.language");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [pendingLocale, setPendingLocale] = useState<AppLocale | null>(null);

  const activeLocale = pendingLocale ?? locale;

  useEffect(() => {
    if (pendingLocale === locale) {
      setPendingLocale(null);
    }
  }, [locale, pendingLocale]);

  useEffect(() => {
    for (const loc of routing.locales) {
      if (loc !== locale) {
        router.prefetch(pathname, { locale: loc });
      }
    }
  }, [locale, pathname, router]);

  function select(next: AppLocale) {
    if (next === locale && !isPending) return;

    setPendingLocale(next);
    startTransition(() => {
      router.replace(pathname, { locale: next, scroll: false });
    });
  }

  return (
    <div
      className={cn(
        "inline-flex min-h-11 items-center gap-0.5 rounded-lg border border-border bg-background p-0.5",
        className,
      )}
      role="group"
      aria-label={t("label")}
      aria-busy={isPending || undefined}
    >
      {routing.locales.map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => select(loc)}
          aria-pressed={activeLocale === loc}
          aria-label={loc === "vi" ? t("vietnamese") : t("english")}
          className={cn(
            "shrink-0 cursor-pointer rounded-md text-center font-medium leading-snug tracking-normal whitespace-nowrap transition-colors",
            compact
              ? "min-h-10 min-w-8 px-2 py-1 text-[11px] tabular-nums"
              : "px-2.5 py-1 text-[11px] sm:px-3 sm:text-xs",
            activeLocale === loc
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {compact ? loc.toUpperCase() : loc === "vi" ? t("vietnamese") : t("english")}
        </button>
      ))}
    </div>
  );
}
