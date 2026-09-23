"use client";

import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { useCabinetInsight } from "@/components/cabinet/cabinet-insight-context";
import { Button } from "@/components/ui/button";
import { buildCabinetProductInsight, cabinetProductKey } from "@/lib/cabinet/build-product-insight";
import { readStoredInsight, writeStoredInsight } from "@/lib/cabinet/insight-cache";
import type { ProductInsight, ProductInsightBuyVerdict, ProductInsightFitVerdict } from "@/lib/cabinet/product-insight";
import type { WardrobeProductDTO } from "@/lib/types/wardrobe";
import { cn } from "@/lib/utils";

function sameInsight(prev: ProductInsight | null, next: ProductInsight): boolean {
  return (
    prev?.whatItDoes === next.whatItDoes &&
    prev.fit.verdict === next.fit.verdict &&
    prev.fit.reason === next.fit.reason &&
    prev.buy.verdict === next.buy.verdict &&
    prev.buy.reason === next.buy.reason
  );
}

function fitClass(verdict: ProductInsightFitVerdict): string {
  if (verdict === "yes") return "text-emerald-800 dark:text-emerald-200";
  if (verdict === "no") return "text-rose-800 dark:text-rose-200";
  return "text-amber-800 dark:text-amber-200";
}

function buyClass(verdict: ProductInsightBuyVerdict): string {
  return verdict === "buy"
    ? "text-emerald-800 dark:text-emerald-200"
    : "text-amber-900 dark:text-amber-100";
}

function InsightBody({
  insight,
  refreshing,
  refreshError,
  onReanalyze,
  onRetry,
}: {
  insight: ProductInsight;
  refreshing: boolean;
  refreshError: boolean;
  onReanalyze: () => void;
  onRetry: () => void;
}) {
  const t = useTranslations("cabinet");
  const fitLabel =
    insight.fit.verdict === "yes"
      ? t("insight.verdictYes")
      : insight.fit.verdict === "no"
        ? t("insight.verdictNo")
        : t("insight.verdictMaybe");
  const buyLabel = insight.buy.verdict === "buy" ? t("insight.buyYes") : t("insight.buyWait");

  return (
    <section
      className="mt-3 space-y-2.5 rounded-lg border border-border/70 bg-muted/40 p-3"
      data-testid="cabinet-product-insight"
      data-insight-fit={insight.fit.verdict}
      data-insight-buy={insight.buy.verdict}
      aria-label={t("insight.regionLabel")}
    >
      <div>
        <p className="text-xs font-semibold text-foreground">{t("insight.whatLabel")}</p>
        <p className="mt-0.5 text-sm leading-relaxed">{insight.whatItDoes}</p>
      </div>

      {insight.actives.length > 0 ? (
        <div>
          <p className="text-xs font-semibold text-foreground">{t("insight.activesLabel")}</p>
          <ul className="mt-0.5 space-y-1">
            {insight.actives.map((active) => (
              <li key={`${active.label}-${active.plain}`} className="text-sm leading-relaxed">
                <span className="font-medium">{active.label}.</span> {active.plain}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <p className="text-xs font-semibold text-foreground">{t("insight.fitLabel")}</p>
        <p className={cn("mt-0.5 text-sm font-semibold", fitClass(insight.fit.verdict))}>{fitLabel}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{insight.fit.reason}</p>
      </div>

      <div>
        <p className={cn("text-sm font-semibold", buyClass(insight.buy.verdict))}>{buyLabel}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{insight.buy.reason}</p>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        {insight.disclaimer || t("insight.disclaimerFallback")}
      </p>

      {refreshing ? (
        <p
          role="status"
          className="flex items-center gap-2 text-xs text-muted-foreground"
          data-testid="cabinet-product-insight-loading"
        >
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          {t("insight.refreshing")}
        </p>
      ) : null}

      {refreshError ? (
        <div role="alert" className="space-y-2" data-testid="cabinet-product-insight-error">
          <p className="flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {t("insight.error")}
          </p>
          <Button type="button" size="sm" variant="outline" className="min-h-11" onClick={onRetry}>
            {t("insight.retry")}
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="min-h-11 px-2"
          onClick={onReanalyze}
          disabled={refreshing}
          data-testid="cabinet-product-insight-reanalyze"
        >
          <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} aria-hidden />
          {t("insight.reanalyze")}
        </Button>
      )}
    </section>
  );
}

export function ProductInsightCard({ product }: { product: WardrobeProductDTO }) {
  const t = useTranslations("cabinet");
  const locale = useLocale();
  const ctx = useCabinetInsight();
  const [insight, setInsight] = useState<ProductInsight | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const refreshing = useRef(false);
  const productKey = cabinetProductKey({
    name: product.name,
    brand: product.brand,
    category: product.category,
    notes: product.notes,
    locale,
  });

  useEffect(() => {
    if (refreshing.current) return;
    const cached = readStoredInsight(product.id, productKey, locale);
    if (cached) {
      setInsight((prev) => (sameInsight(prev, cached) ? prev : cached));
      setPhase("ready");
      return;
    }
    if (ctx.isLoading) {
      setPhase("loading");
      return;
    }
    if (ctx.isError) {
      setInsight(null);
      setPhase("error");
      return;
    }
    const next = buildCabinetProductInsight({
      name: product.name,
      brand: product.brand,
      category: product.category,
      notes: product.notes,
      skinType: ctx.skinType,
      concerns: ctx.concerns,
      recentTags: ctx.recentTags,
      locale,
    });
    writeStoredInsight(product.id, productKey, next);
    setInsight((prev) => (sameInsight(prev, next) ? prev : next));
    setPhase("ready");
  }, [
    ctx.concerns,
    ctx.isError,
    ctx.isLoading,
    ctx.recentTags,
    ctx.skinType,
    locale,
    product.brand,
    product.category,
    product.id,
    product.name,
    product.notes,
    productKey,
  ]);

  async function refresh() {
    refreshing.current = true;
    setPhase("loading");
    try {
      const fresh = await ctx.reload();
      const next = buildCabinetProductInsight({
        name: product.name,
        brand: product.brand,
        category: product.category,
        notes: product.notes,
        skinType: fresh.skinType,
        concerns: fresh.concerns,
        recentTags: fresh.recentTags,
        locale,
      });
      writeStoredInsight(product.id, productKey, next);
      setInsight(next);
      setPhase("ready");
    } catch {
      setPhase("error");
    } finally {
      refreshing.current = false;
    }
  }

  if (insight && (phase === "ready" || phase === "loading" || phase === "error")) {
    if (phase === "loading" && refreshing.current) {
      return (
        <InsightBody
          insight={insight}
          refreshing
          refreshError={false}
          onReanalyze={() => void refresh()}
          onRetry={() => void refresh()}
        />
      );
    }
    if (phase === "error") {
      return (
        <InsightBody
          insight={insight}
          refreshing={false}
          refreshError
          onReanalyze={() => void refresh()}
          onRetry={() => void refresh()}
        />
      );
    }
    if (phase === "ready") {
      return (
        <InsightBody
          insight={insight}
          refreshing={false}
          refreshError={false}
          onReanalyze={() => void refresh()}
          onRetry={() => void refresh()}
        />
      );
    }
  }

  if (phase === "error") {
    return (
      <div
        role="alert"
        className="mt-3 space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3"
        data-testid="cabinet-product-insight-error"
      >
        <p className="flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("insight.error")}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-11"
          onClick={() => void refresh()}
          data-testid="cabinet-product-insight-retry"
        >
          {t("insight.retry")}
        </Button>
      </div>
    );
  }

  return (
    <p
      role="status"
      className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"
      data-testid="cabinet-product-insight-loading"
    >
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {t("insight.loading")}
    </p>
  );
}
