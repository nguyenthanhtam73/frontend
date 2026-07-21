"use client";

import { Check, ChevronLeft, ChevronRight, Minus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { COMPARE_ROWS } from "@/lib/premium/pricing";
import { cn } from "@/lib/utils";

type CellValue =
  | "quota3"
  | "quota5"
  | "unlimited"
  | "viewOnly"
  | "full"
  | "months3"
  | "months12"
  | "allTime"
  | "basic"
  | "yes"
  | "no";

function CellIcon({ value }: { value: CellValue }) {
  if (value === "no") {
    return <X className="mx-auto size-4 text-muted-foreground/70" aria-hidden />;
  }
  if (value === "viewOnly" || value === "basic") {
    return <Minus className="mx-auto size-4 text-muted-foreground" aria-hidden />;
  }
  return <Check className="mx-auto size-4 text-primary" strokeWidth={2.5} aria-hidden />;
}

/** Feature matrix — Free | Premium | Premium+. Smooth H-scroll on mobile. */
export function PricingCompare({ className }: { className?: string }) {
  const t = useTranslations("pricing.compare");
  const tPlans = useTranslations("pricing.plans");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const max = scrollWidth - clientWidth;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(max > 4 && scrollLeft < max - 4);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateScrollEdges();
    const onScroll = () => {
      // rAF keeps scroll handlers cheap on long tables
      requestAnimationFrame(updateScrollEdges);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateScrollEdges) : null;
    ro?.observe(el);
    window.addEventListener("resize", updateScrollEdges, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro?.disconnect();
      window.removeEventListener("resize", updateScrollEdges);
    };
  }, [updateScrollEdges]);

  const nudge = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(220, el.clientWidth * 0.55), behavior: "smooth" });
  };

  return (
    <section className={cn("space-y-5", className)} aria-labelledby="pricing-compare-heading">
      <div className="space-y-1.5 text-center">
        <h2
          id="pricing-compare-heading"
          className="text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          {t("title")}
        </h2>
        <p className="mx-auto max-w-xl text-sm text-muted-foreground sm:text-base">
          {t("subtitle")}
        </p>
        <p className="flex items-center justify-center gap-1.5 pt-1 text-xs font-medium text-muted-foreground sm:hidden">
          <ChevronLeft className="size-3.5 opacity-70" aria-hidden />
          {t("scrollHint")}
          <ChevronRight className="size-3.5 opacity-70" aria-hidden />
        </p>
      </div>

      <div className="relative">
        {/* Edge fades — mobile H-scroll affordance */}
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 z-[2] w-8 rounded-l-2xl bg-gradient-to-r from-background to-transparent transition-opacity duration-200 sm:w-10",
            canScrollLeft ? "opacity-100" : "opacity-0",
          )}
          aria-hidden
        />
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 z-[2] w-8 rounded-r-2xl bg-gradient-to-l from-background to-transparent transition-opacity duration-200 sm:w-10",
            canScrollRight ? "opacity-100" : "opacity-0",
          )}
          aria-hidden
        />

        {/* Desktop nudge buttons when overflow exists */}
        {canScrollLeft ? (
          <button
            type="button"
            onClick={() => nudge(-1)}
            className="absolute left-1 top-1/2 z-[3] hidden size-9 -translate-y-1/2 items-center justify-center rounded-full border border-border/70 bg-card/95 text-foreground shadow-md backdrop-blur-sm transition hover:bg-muted md:inline-flex"
            aria-label={t("scrollLeft")}
          >
            <ChevronLeft className="size-4" />
          </button>
        ) : null}
        {canScrollRight ? (
          <button
            type="button"
            onClick={() => nudge(1)}
            className="absolute right-1 top-1/2 z-[3] hidden size-9 -translate-y-1/2 items-center justify-center rounded-full border border-border/70 bg-card/95 text-foreground shadow-md backdrop-blur-sm transition hover:bg-muted md:inline-flex"
            aria-label={t("scrollRight")}
          >
            <ChevronRight className="size-4" />
          </button>
        ) : null}

        <div
          ref={scrollerRef}
          className={cn(
            "overflow-x-auto overscroll-x-contain rounded-2xl border border-border/70 bg-card/60 shadow-sm backdrop-blur-sm",
            "scroll-smooth touch-pan-x [-webkit-overflow-scrolling:touch]",
            "[scrollbar-width:thin] [scrollbar-color:color-mix(in_oklab,var(--primary)_35%,transparent)_transparent]",
          )}
        >
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <caption className="sr-only">{t("caption")}</caption>
            <thead>
              <tr className="border-b border-border/60 bg-muted/40">
                <th
                  scope="col"
                  className={cn(
                    // Opaque sticky header cell — prevents plan columns bleeding through on H-scroll
                    "sticky left-0 z-[2] bg-muted px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:px-5",
                    canScrollLeft &&
                      "shadow-[4px_0_10px_-4px_rgba(0,0,0,0.18)] dark:shadow-[4px_0_10px_-4px_rgba(0,0,0,0.45)]",
                  )}
                >
                  {t("featureCol")}
                </th>
                <th
                  scope="col"
                  className="min-w-[6.5rem] px-3 py-3.5 text-center font-semibold sm:min-w-[7.5rem] sm:px-4"
                >
                  {tPlans("free.name")}
                </th>
                <th
                  scope="col"
                  className="min-w-[7rem] bg-primary/[0.08] px-3 py-3.5 text-center font-semibold text-primary sm:min-w-[8rem] sm:px-4"
                >
                  <span className="inline-flex flex-col items-center gap-0.5">
                    {tPlans("premium.name")}
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/80">
                      {t("popularCol")}
                    </span>
                  </span>
                </th>
                <th
                  scope="col"
                  className="min-w-[7rem] px-3 py-3.5 text-center font-semibold sm:min-w-[8rem] sm:px-4"
                >
                  {tPlans("premium_plus.name")}
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((row, rowIndex) => (
                <tr
                  key={row.key}
                  className="border-b border-border/40 last:border-0 even:bg-muted/25"
                >
                  <th
                    scope="row"
                    className={cn(
                      // Solid background (not /opacity) so cells don't ghost under the sticky column
                      "sticky left-0 z-[2] px-4 py-3.5 text-left font-medium text-foreground sm:px-5",
                      rowIndex % 2 === 1 ? "bg-muted" : "bg-background",
                      canScrollLeft &&
                        "shadow-[4px_0_10px_-4px_rgba(0,0,0,0.18)] dark:shadow-[4px_0_10px_-4px_rgba(0,0,0,0.45)]",
                    )}
                  >
                    {t(`rows.${row.key}`)}
                  </th>
                  <td className="px-3 py-3.5 text-center text-muted-foreground sm:px-4">
                    <CellLabel value={row.free as CellValue} t={t} />
                  </td>
                  <td className="bg-primary/[0.05] px-3 py-3.5 text-center sm:px-4">
                    <CellLabel value={row.premium as CellValue} t={t} emphasize />
                  </td>
                  <td className="px-3 py-3.5 text-center sm:px-4">
                    <CellLabel value={row.plus as CellValue} t={t} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Dot indicators — mobile, only when the table overflows */}
        {(canScrollLeft || canScrollRight) && (
          <div
            className="mt-3 flex items-center justify-center gap-1.5 sm:hidden"
            aria-hidden
          >
            <span
              className={cn(
                "h-1.5 rounded-full transition-all duration-200",
                !canScrollLeft ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/35",
              )}
            />
            <span
              className={cn(
                "h-1.5 rounded-full transition-all duration-200",
                canScrollLeft && canScrollRight
                  ? "w-5 bg-primary"
                  : "w-1.5 bg-muted-foreground/35",
              )}
            />
            <span
              className={cn(
                "h-1.5 rounded-full transition-all duration-200",
                canScrollLeft && !canScrollRight
                  ? "w-5 bg-primary"
                  : "w-1.5 bg-muted-foreground/35",
              )}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function CellLabel({
  value,
  t,
  emphasize,
}: {
  value: CellValue;
  t: ReturnType<typeof useTranslations>;
  emphasize?: boolean;
}) {
  const label = t(`values.${value}`);
  const showIconOnly = value === "yes" || value === "no";

  return (
    <span
      className={cn(
        "inline-flex flex-col items-center gap-1",
        emphasize && "font-medium text-foreground",
      )}
    >
      <CellIcon value={value} />
      {!showIconOnly ? (
        <span className="text-xs leading-snug">{label}</span>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </span>
  );
}
