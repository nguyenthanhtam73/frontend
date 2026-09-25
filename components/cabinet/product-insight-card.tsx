"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  ownedInsightUse,
  parseWardrobeProductInsight,
  WARDROBE_INSIGHT_DISCLAIMER,
  type OwnedInsightUse,
  type WardrobeInsightFitVerdict,
  type WardrobeProductInsight,
} from "@/lib/cabinet/product-insight";
import { useRequestWardrobeInsight } from "@/lib/hooks/use-wardrobe";
import type { WardrobeProductDTO } from "@/lib/types/wardrobe";
import { cn } from "@/lib/utils";

function fitClass(verdict: WardrobeInsightFitVerdict): string {
  if (verdict === "yes") return "text-emerald-800 dark:text-emerald-200";
  if (verdict === "no") return "text-rose-800 dark:text-rose-200";
  return "text-amber-800 dark:text-amber-200";
}

function useClass(use: OwnedInsightUse): string {
  return use === "keep"
    ? "text-emerald-800 dark:text-emerald-200"
    : "text-amber-900 dark:text-amber-100";
}

function InsightBody({ insight }: { insight: WardrobeProductInsight }) {
  const t = useTranslations("cabinet");
  const fitLabel =
    insight.fit.verdict === "yes"
      ? t("insight.verdictYes")
      : insight.fit.verdict === "no"
        ? t("insight.verdictNo")
        : t("insight.verdictMaybe");
  const useKind = ownedInsightUse(insight.buy.advice);
  const useLabel = useKind === "keep" ? t("insight.keepUsing") : t("insight.pauseUsing");

  return (
    <section
      className="mt-3 space-y-2.5 rounded-lg border border-border/70 bg-muted/40 p-3"
      data-testid="cabinet-product-insight"
      data-insight-fit={insight.fit.verdict}
      data-insight-use={useKind}
      aria-label={t("insight.regionLabel")}
    >
      <div>
        <p className="text-xs font-semibold text-foreground">{t("insight.whatLabel")}</p>
        <p className="mt-0.5 text-sm leading-relaxed">{insight.what_it_does}</p>
      </div>

      {insight.actives && insight.actives.length > 0 ? (
        <div>
          <p className="text-xs font-semibold text-foreground">{t("insight.activesLabel")}</p>
          <ul className="mt-0.5 space-y-1">
            {insight.actives.map((active) => (
              <li key={active.name} className="text-sm leading-relaxed">
                <span className="font-medium">{active.name}.</span> {active.gloss}
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
        <p className={cn("text-sm font-semibold", useClass(useKind))}>{useLabel}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{insight.buy.why}</p>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        {insight.disclaimer || WARDROBE_INSIGHT_DISCLAIMER}
      </p>
    </section>
  );
}

export function ProductInsightCard({ product }: { product: WardrobeProductDTO }) {
  const t = useTranslations("cabinet");
  const requestInsight = useRequestWardrobeInsight();
  const insight = parseWardrobeProductInsight(product.insight);
  const needsInsight = insight == null;
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<"loading" | "error">("loading");
  const [errorKind, setErrorKind] = useState<"generic" | "rate_limited">("generic");

  useEffect(() => {
    if (!needsInsight) return;
    let cancelled = false;
    setPhase("loading");
    requestInsight(product.id)
      .then((saved) => {
        if (cancelled) return;
        if (!parseWardrobeProductInsight(saved.insight)) {
          setErrorKind("generic");
          setPhase("error");
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setErrorKind(err instanceof Error && err.message === "rate_limited" ? "rate_limited" : "generic");
        setPhase("error");
      });
    return () => {
      cancelled = true;
    };
  }, [attempt, needsInsight, product.id, requestInsight]);

  if (insight) return <InsightBody insight={insight} />;

  if (phase === "error") {
    return (
      <div
        role="alert"
        className="mt-3 space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3"
        data-testid="cabinet-product-insight-error"
      >
        <p className="flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {errorKind === "rate_limited" ? t("insight.rateLimited") : t("insight.error")}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-11"
          onClick={() => setAttempt((n) => n + 1)}
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
