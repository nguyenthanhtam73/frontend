"use client";

import { useTranslations } from "next-intl";

import { WARDROBE_CATEGORY_IDS, type WardrobeCategoryId } from "@/lib/cabinet/categories";
import { cn } from "@/lib/utils";

export type WardrobeCategoryFilterValue = "all" | WardrobeCategoryId;

export function WardrobeCategoryFilter({
  value,
  onChange,
  counts,
}: {
  value: WardrobeCategoryFilterValue;
  onChange: (next: WardrobeCategoryFilterValue) => void;
  /** Optional counts per category (and all). */
  counts?: Partial<Record<WardrobeCategoryFilterValue, number>>;
}) {
  const t = useTranslations("cabinet");
  const chips: { id: WardrobeCategoryFilterValue; label: string }[] = [
    { id: "all", label: t("filterAll") },
    ...WARDROBE_CATEGORY_IDS.map((id) => ({
      id,
      label: t(`categories.${id}`),
    })),
  ];

  return (
    <div
      role="tablist"
      aria-label={t("filterAria")}
      className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {chips.map((chip) => {
        const active = value === chip.id;
        const n = counts?.[chip.id];
        return (
          <button
            key={chip.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={cn(
              "inline-flex min-h-10 shrink-0 items-center rounded-full border px-3 text-xs font-medium transition-colors",
              active
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:bg-muted/50",
            )}
            onClick={() => onChange(chip.id)}
          >
            {chip.label}
            {typeof n === "number" ? (
              <span className="ml-1 tabular-nums opacity-70">{n}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
