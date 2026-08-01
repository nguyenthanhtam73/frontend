"use client";

import { AlertCircle, Droplets, Loader2, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { WardrobeProductDeleteDialog } from "@/components/cabinet/wardrobe-product-delete-dialog";
import { WardrobeProductEditDialog } from "@/components/cabinet/wardrobe-product-edit-dialog";
import { categoryLabelFor } from "@/components/cabinet/wardrobe-product-fields";
import {
  WardrobeCategoryFilter,
  type WardrobeCategoryFilterValue,
} from "@/components/cabinet/wardrobe-category-filter";
import { useWardrobe } from "@/components/cabinet/wardrobe-provider";
import { UpsellBanner } from "@/components/premium/upsell-banner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { getPaoHint } from "@/lib/cabinet/pao";
import { Feature } from "@/lib/premium/features";
import { usePlanTier } from "@/lib/premium/plan-tier-context";
import { useFeatureGate } from "@/lib/premium/use-feature-gate";
import type { WardrobeProductDTO } from "@/lib/types/wardrobe";
import { cn } from "@/lib/utils";

export function WardrobeProductList({ onAddClick }: { onAddClick?: () => void }) {
  const t = useTranslations("cabinet");
  const formatter = useFormatter();
  const { hasAuth, products, isLoading, isError, error, refetch, isFetching } = useWardrobe();
  const wardrobeGate = useFeatureGate(Feature.WardrobeFull);
  const { canWardrobeManage } = usePlanTier();
  const canWardrobeWrite = wardrobeGate.allowed && !wardrobeGate.locked;
  const [editProduct, setEditProduct] = useState<WardrobeProductDTO | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<WardrobeProductDTO | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<WardrobeCategoryFilterValue>("all");

  const filterCounts = useMemo(() => {
    const counts: Partial<Record<WardrobeCategoryFilterValue, number>> = {
      all: products.length,
    };
    for (const p of products) {
      const key = (p.category || "other") as WardrobeCategoryFilterValue;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (categoryFilter === "all") return products;
    return products.filter((p) => (p.category || "other") === categoryFilter);
  }, [products, categoryFilter]);

  if (!hasAuth) {
    return (
      <Card className="border-dashed border-primary/25">
        <CardContent className="space-y-3 p-5 sm:p-6">
          <p className="text-sm text-muted-foreground">{t("needAuth")}</p>
          <Link href="/login" className={buttonVariants({ size: "sm" })}>
            {t("signIn")}
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="space-y-3 p-5 sm:p-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    const needAuth = error instanceof Error && error.message === "auth";
    return (
      <Card className="border-destructive/30">
        <CardContent className="space-y-3 p-5 sm:p-6">
          <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {needAuth ? t("needAuth") : t("loadError")}
          </p>
          <div className="flex flex-wrap gap-2">
            {needAuth ? (
              <Link href="/login" className={buttonVariants({ size: "sm" })}>
                {t("signIn")}
              </Link>
            ) : (
              <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>
                {t("retry")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Package className="size-4 text-primary" aria-hidden />
              {t("listTitle")}
              <span className="text-xs font-normal text-muted-foreground">
                {t("listCount", { n: products.length })}
              </span>
            </div>
            {isFetching && !isLoading ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
            ) : null}
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">{t("listHint")}</p>

          {products.length > 0 ? (
            <WardrobeCategoryFilter
              value={categoryFilter}
              onChange={setCategoryFilter}
              counts={filterCounts}
            />
          ) : null}

          {products.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-gradient-to-b from-muted/30 to-transparent px-4 py-10 text-center">
              <div className="mx-auto mb-3 inline-flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Droplets className="size-6" aria-hidden />
              </div>
              <p className="text-base font-semibold tracking-tight">{t("emptyTitle")}</p>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {t("emptyBody")}
              </p>
              {onAddClick && canWardrobeWrite ? (
                <Button
                  type="button"
                  size="sm"
                  className="mt-4 min-h-10"
                  onClick={onAddClick}
                >
                  <Plus className="size-4" aria-hidden />
                  {t("emptyCta")}
                </Button>
              ) : null}
              {wardrobeGate.locked ? (
                <div className="mx-auto mt-4 max-w-md text-left">
                  <UpsellBanner feature={Feature.WardrobeFull} compact />
                </div>
              ) : null}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
              <p className="text-sm font-medium">{t("filterEmptyTitle")}</p>
              <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                {t("filterEmptyBody", {
                  category:
                    categoryFilter === "all"
                      ? t("filterAll")
                      : t(`categories.${categoryFilter}`),
                })}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-4 min-h-10"
                onClick={() => setCategoryFilter("all")}
              >
                {t("filterClear")}
              </Button>
            </div>
          ) : (
            <ul className="space-y-2">
              {filteredProducts.map((p) => (
                <ProductRow
                  key={p.id}
                  product={p}
                  formatter={formatter}
                  canManage={canWardrobeManage}
                  onEdit={() => setEditProduct(p)}
                  onDelete={() => setDeleteProduct(p)}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <WardrobeProductEditDialog
        product={editProduct}
        open={!!editProduct}
        onOpenChange={(open) => {
          if (!open) setEditProduct(null);
        }}
      />
      <WardrobeProductDeleteDialog
        product={deleteProduct}
        open={!!deleteProduct}
        onOpenChange={(open) => {
          if (!open) setDeleteProduct(null);
        }}
      />
    </>
  );
}

function ProductRow({
  product,
  formatter,
  canManage,
  onEdit,
  onDelete,
}: {
  product: WardrobeProductDTO;
  formatter: ReturnType<typeof useFormatter>;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("cabinet");
  const categoryLabel = product.category ? categoryLabelFor(t, product.category) : null;
  const pao = getPaoHint(product.opened_at, product.category);

  let openedLabel: string | null = null;
  if (product.opened_at) {
    const d = new Date(`${product.opened_at}T00:00:00Z`);
    if (!Number.isNaN(d.getTime())) {
      openedLabel = formatter.dateTime(d, { dateStyle: "medium" });
    }
  }

  let paoLabel: string | null = null;
  if (pao) {
    if (pao.monthsOpen < 1) {
      paoLabel =
        pao.suggestedMin === pao.suggestedMax
          ? t("paoHintFreshFixed", { months: pao.suggestedMax })
          : t("paoHintFreshRange", { min: pao.suggestedMin, max: pao.suggestedMax });
    } else if (pao.suggestedMin === pao.suggestedMax) {
      paoLabel = t("paoHintFixed", {
        monthsOpen: pao.monthsOpen,
        months: pao.suggestedMax,
      });
    } else {
      paoLabel = t("paoHintRange", {
        monthsOpen: pao.monthsOpen,
        min: pao.suggestedMin,
        max: pao.suggestedMax,
      });
    }
  }

  return (
    <li
      className={cn(
        "rounded-xl border border-border/70 bg-card px-3 py-3 sm:px-4",
        "transition-colors hover:bg-muted/30",
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-medium leading-snug">{product.name}</p>
          {product.brand ? (
            <p className="text-xs text-muted-foreground">{product.brand}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex flex-wrap gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {categoryLabel ? (
              <span className="rounded-full border border-border px-2 py-0.5">{categoryLabel}</span>
            ) : null}
            {openedLabel ? (
              <span className="rounded-full border border-primary/25 bg-primary/5 px-2 py-0.5 text-primary">
                {t("openedBadge", { date: openedLabel })}
              </span>
            ) : null}
          </div>
          {canManage ? (
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="min-h-9 px-2"
                onClick={onEdit}
                aria-label={t("editAria", { name: product.name })}
              >
                <Pencil className="size-3.5" aria-hidden />
                <span className="sr-only sm:not-sr-only sm:ml-1">{t("editCta")}</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="min-h-9 px-2 text-destructive hover:text-destructive"
                onClick={onDelete}
                aria-label={t("deleteAria", { name: product.name })}
              >
                <Trash2 className="size-3.5" aria-hidden />
                <span className="sr-only sm:not-sr-only sm:ml-1">{t("deleteCta")}</span>
              </Button>
            </div>
          ) : null}
        </div>
      </div>
      {paoLabel ? (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{paoLabel}</p>
      ) : canManage && !product.opened_at ? (
        <button
          type="button"
          className="mt-2 text-xs font-medium text-primary underline underline-offset-2"
          onClick={onEdit}
        >
          {t("paoAddOpenedCta")}
        </button>
      ) : null}
      {product.notes ? (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{product.notes}</p>
      ) : null}
    </li>
  );
}
