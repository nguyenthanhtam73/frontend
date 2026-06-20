"use client";

import { ChevronDown, ChevronUp, ExternalLink, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { logAffiliateClick, type AffiliateClickSource } from "@/lib/api/affiliate";
import type { ProductSuggestionDTO } from "@/lib/types/product-suggestion";

type ProductSuggestionsLabels = {
  title: string;
  hint: string;
  affiliateBadge: string;
  affiliateNote: string;
  priorityHigh: string;
  priorityMedium: string;
  viewProduct: string;
  reasonLabel: string;
  showMore: string;
  showLess: string;
};

function sortByPriority(items: ProductSuggestionDTO[]) {
  return [...items].sort((a, b) => {
    const ah = a.priority?.toLowerCase() === "high" ? 0 : 1;
    const bh = b.priority?.toLowerCase() === "high" ? 0 : 1;
    return ah - bh;
  });
}

export function ProductSuggestionsCard({
  suggestions,
  source,
  contextId,
  labels,
  maxVisible = 3,
}: {
  suggestions: ProductSuggestionDTO[] | undefined;
  source: AffiliateClickSource;
  contextId?: string;
  labels?: Partial<ProductSuggestionsLabels>;
  maxVisible?: number;
}) {
  const t = useTranslations("productSuggestions");
  const [expanded, setExpanded] = useState(false);

  const items = useMemo(
    () => sortByPriority(suggestions?.filter((s) => s.product_name?.trim()) ?? []),
    [suggestions],
  );

  if (items.length === 0) return null;

  const L: ProductSuggestionsLabels = {
    title: labels?.title ?? t("title"),
    hint: labels?.hint ?? t("hint"),
    affiliateBadge: labels?.affiliateBadge ?? t("affiliateBadge"),
    affiliateNote: labels?.affiliateNote ?? t("affiliateNote"),
    priorityHigh: labels?.priorityHigh ?? t("priorityHigh"),
    priorityMedium: labels?.priorityMedium ?? t("priorityMedium"),
    viewProduct: labels?.viewProduct ?? t("viewProduct"),
    reasonLabel: labels?.reasonLabel ?? t("reasonLabel"),
    showMore: labels?.showMore ?? t("showMore"),
    showLess: labels?.showLess ?? t("showLess"),
  };

  const hasMore = items.length > maxVisible;
  const visible = expanded || !hasMore ? items : items.slice(0, maxVisible);
  const hiddenCount = items.length - maxVisible;

  return (
    <Card className="border-violet-500/20 bg-gradient-to-b from-violet-500/[0.04] to-transparent">
      <CardContent className="space-y-3 pt-5">
        <div className="flex items-start gap-2">
          <ShoppingBag className="mt-0.5 size-4 shrink-0 text-violet-600 dark:text-violet-300" aria-hidden />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-900/90 dark:text-violet-100">
                {L.title}
              </p>
              <Badge
                variant="outline"
                className="border-violet-400/40 bg-violet-500/10 text-[10px] uppercase tracking-wider text-violet-800 dark:text-violet-200"
              >
                {L.affiliateBadge}
              </Badge>
            </div>
            <p className="text-xs leading-snug text-muted-foreground">{L.hint}</p>
          </div>
        </div>

        <ul className="space-y-3">
          {visible.map((item, idx) => {
            const priority =
              item.priority?.toLowerCase() === "high" ? L.priorityHigh : L.priorityMedium;
            const link = item.affiliate_link?.trim();
            return (
              <li
                key={`${item.brand}-${item.product_name}-${idx}`}
                className="rounded-xl border bg-background/80 p-3.5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">{item.brand}</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {item.price_range ? (
                      <Badge variant="secondary" className="tabular-nums text-xs">
                        {item.price_range}
                      </Badge>
                    ) : null}
                    <Badge
                      variant={item.priority?.toLowerCase() === "high" ? "default" : "outline"}
                      className="text-[10px] uppercase tracking-wide"
                    >
                      {priority}
                    </Badge>
                  </div>
                </div>
                {item.reason ? (
                  <div className="mt-2.5 rounded-lg bg-violet-500/[0.06] px-2.5 py-2">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-violet-800/80 dark:text-violet-200/80">
                      {L.reasonLabel}
                    </p>
                    <p className="mt-0.5 text-sm leading-relaxed text-foreground/90">
                      {item.reason}
                    </p>
                  </div>
                ) : null}
                {link ? (
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="mt-3 inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-violet-700 underline-offset-4 hover:underline dark:text-violet-300"
                    onClick={() => {
                      void logAffiliateClick(item, source, contextId);
                    }}
                  >
                    {L.viewProduct}
                    <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                ) : null}
              </li>
            );
          })}
        </ul>

        {hasMore ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full gap-1.5 text-violet-800 dark:text-violet-200"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? (
              <>
                {L.showLess}
                <ChevronUp className="size-4" aria-hidden />
              </>
            ) : (
              <>
                {t("showMore", { count: hiddenCount })}
                <ChevronDown className="size-4" aria-hidden />
              </>
            )}
          </Button>
        ) : null}

        <p className="text-[11px] leading-relaxed text-muted-foreground">{L.affiliateNote}</p>
      </CardContent>
    </Card>
  );
}
