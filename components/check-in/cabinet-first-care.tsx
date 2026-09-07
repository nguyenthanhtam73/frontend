"use client";

import { Package } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { CabinetCareMatch } from "@/lib/check-in/cabinet-care";

/** Surfaces owned products before any affiliate / buy card. */
export function CabinetFirstCare({ items }: { items: CabinetCareMatch[] }) {
  const t = useTranslations("checkIn.coach");
  if (items.length === 0) return null;

  return (
    <Card
      className="border-emerald-500/25 bg-gradient-to-b from-emerald-500/[0.06] to-transparent"
      data-testid="cabinet-first-care"
    >
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Package className="size-4 text-emerald-700 dark:text-emerald-300" aria-hidden />
            {t("cabinetFirstTitle")}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">{t("cabinetFirstHint")}</p>
        </div>
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.productId}
              className="rounded-xl border border-emerald-500/20 bg-background/70 p-3 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium leading-snug">{item.name}</p>
                <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                  {t("cabinetBadge")}
                </span>
              </div>
              {item.brand ? (
                <p className="mt-0.5 text-xs text-muted-foreground">{item.brand}</p>
              ) : null}
              {item.reasonStep ? (
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {item.reasonStep}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
        <Link
          href="/cabinet"
          className="inline-flex text-xs font-medium text-emerald-800 underline-offset-4 hover:underline dark:text-emerald-200"
        >
          {t("cabinetOpen")}
        </Link>
      </CardContent>
    </Card>
  );
}
