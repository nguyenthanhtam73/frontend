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
  /** One current-language button. Tap switches locale. Phones only. */
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

  if (compact) {
    const nextLocale: AppLocale = activeLocale === "vi" ? "en" : "vi";
    return (
      <button
        type="button"
        onClick={() => select(nextLocale)}
        aria-label="Đổi ngôn ngữ / Switch language"
        aria-busy={isPending || undefined}
        className={cn(
          "inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-background text-[11px] font-medium tabular-nums text-foreground transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
          className,
        )}
      >
        {activeLocale.toUpperCase()}
      </button>
    );
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
            "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md px-2.5 pt-[5px] pb-1 text-center text-[11px] font-medium leading-snug tracking-normal whitespace-nowrap transition-colors sm:px-3 sm:text-xs",
            activeLocale === loc
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
