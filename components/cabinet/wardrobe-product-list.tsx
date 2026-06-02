"use client";

import { AlertCircle, Droplets, Loader2, Package, Plus } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { useWardrobe } from "@/components/cabinet/wardrobe-provider";
import type { WardrobeProductDTO } from "@/lib/types/wardrobe";
import { cn } from "@/lib/utils";

export function WardrobeProductList({ onAddClick }: { onAddClick?: () => void }) {
  const t = useTranslations("cabinet");
  const formatter = useFormatter();
  const { hasAuth, products, isLoading, isError, error, refetch, isFetching } = useWardrobe();

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

        {products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-gradient-to-b from-muted/30 to-transparent px-4 py-10 text-center">
            <div className="mx-auto mb-3 inline-flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Droplets className="size-6" aria-hidden />
            </div>
            <p className="text-base font-semibold tracking-tight">{t("emptyTitle")}</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {t("emptyBody")}
            </p>
            {onAddClick ? (
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
          </div>
        ) : (
          <ul className="space-y-2">
            {products.map((p) => (
              <ProductRow key={p.id} product={p} formatter={formatter} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

const CATEGORY_IDS = [
  "cleanser",
  "toner",
  "serum",
  "moisturizer",
  "spf",
  "treatment",
  "mask",
  "other",
] as const;

function categoryLabelFor(
  t: ReturnType<typeof useTranslations<"cabinet">>,
  id: string,
) {
  if ((CATEGORY_IDS as readonly string[]).includes(id)) {
    return t(`categories.${id}` as "categories.cleanser");
  }
  return id;
}

function ProductRow({
  product,
  formatter,
}: {
  product: WardrobeProductDTO;
  formatter: ReturnType<typeof useFormatter>;
}) {
  const t = useTranslations("cabinet");
  const categoryLabel = product.category ? categoryLabelFor(t, product.category) : null;

  let openedLabel: string | null = null;
  if (product.opened_at) {
    const d = new Date(`${product.opened_at}T00:00:00Z`);
    if (!Number.isNaN(d.getTime())) {
      openedLabel = formatter.dateTime(d, { dateStyle: "medium" });
    }
  }

  return (
    <li
      className={cn(
        "rounded-xl border border-border/70 bg-card px-3 py-3 sm:px-4",
        "transition-colors hover:bg-muted/30",
      )}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-medium leading-snug">{product.name}</p>
          {product.brand ? (
            <p className="text-xs text-muted-foreground">{product.brand}</p>
          ) : null}
        </div>
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
      </div>
      {product.notes ? (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{product.notes}</p>
      ) : null}
    </li>
  );
}
