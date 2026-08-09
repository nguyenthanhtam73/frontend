"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ExternalLink, Leaf } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { logAffiliateClick, type AffiliateClickSource } from "@/lib/api/affiliate";
import { genericRoleLabel } from "@/lib/onboarding/guest-starter";
import { Feature } from "@/lib/premium/features";
import { useFeatureGate } from "@/lib/premium/use-feature-gate";
import type { ProductGuidanceItemDTO } from "@/lib/types/product-guidance";
import { cn } from "@/lib/utils";

function hasAffiliate(
  item: ProductGuidanceItemDTO,
  hideCommerce: boolean,
): boolean {
  if (hideCommerce) return false;
  return Boolean(item.affiliate_product_id && item.affiliate_link?.trim());
}

function mentionsBrand(text: string, brand?: string, product?: string): boolean {
  const low = text.toLowerCase();
  for (const n of [brand, product]) {
    const needle = n?.trim().toLowerCase();
    if (needle && needle.length >= 3 && low.includes(needle)) return true;
  }
  return false;
}

type ScrubKind = "why" | "how" | "caution" | "benefit";

function scrubFallback(kind: ScrubKind, locale: string): string {
  const en = locale.toLowerCase().startsWith("en");
  switch (kind) {
    case "how":
      return en
        ? "Use gently as directed for this step."
        : "Dùng nhẹ theo hướng dẫn cho bước này.";
    case "caution":
      return en
        ? "Stop if irritation increases. Not a prescription."
        : "Ngưng nếu càng kích ứng. Không phải kê đơn.";
    case "benefit":
      return en ? "Supports this care step." : "Hỗ trợ bước chăm sóc này.";
    default:
      return en
        ? "Fits this step for your current skin phase."
        : "Phù hợp bước này theo giai đoạn da hiện tại.";
  }
}

function scrubText(
  text: string | undefined,
  hideCommerce: boolean,
  locale: string,
  kind: ScrubKind,
  brand?: string,
  product?: string,
): string {
  const t = text?.trim() ?? "";
  if (!t) return "";
  if (hideCommerce && mentionsBrand(t, brand, product)) {
    return scrubFallback(kind, locale);
  }
  return t;
}

export function ProductGuidanceSection({
  items,
  contextId,
  source = "starter_routine",
  variant = "onboarding",
  collapseOnMobile = false,
  maxBenefits = 4,
}: {
  items: ProductGuidanceItemDTO[] | undefined;
  contextId?: string;
  source?: AffiliateClickSource;
  /** Coach surfaces use shorter copy + titles. */
  variant?: "onboarding" | "coach";
  /** Step 1: collapse role cards on small screens. */
  collapseOnMobile?: boolean;
  maxBenefits?: number;
}) {
  const tOnb = useTranslations("onboarding.productGuidance");
  const tCoach = useTranslations("coachProductGuidance");
  const t = variant === "coach" ? tCoach : tOnb;
  const locale = useLocale();
  const noAds = useFeatureGate(Feature.NoAds);
  // Hide CTAs while plan is loading so Premium never flashes Shopee / brand names.
  const hideCommerce = noAds.isLoading || noAds.allowed;
  const list =
    items?.filter((i) => i.name_or_category?.trim() || i.product_name?.trim()) ??
    [];
  const hasVisibleCTA =
    !hideCommerce &&
    list.some((i) => Boolean(i.affiliate_product_id && i.affiliate_link?.trim()));
  // Collapse on mobile only when there is no commerce CTA to surface.
  const [open, setOpen] = useState(!collapseOnMobile || hasVisibleCTA);

  useEffect(() => {
    if (collapseOnMobile && hasVisibleCTA) {
      setOpen(true);
    }
  }, [collapseOnMobile, hasVisibleCTA]);

  if (list.length === 0) return null;

  const body = (
    <ul className="space-y-3">
      {list.map((item, idx) => {
        const affiliate = hasAffiliate(item, hideCommerce);
        // Brand/product only when commerce is shown. When hiding commerce (Premium
        // or plan still loading), never trust name_or_category — may still be branded.
        const title = affiliate
          ? [item.brand, item.product_name].filter(Boolean).join(" · ") ||
            item.name_or_category
          : hideCommerce
            ? genericRoleLabel(item.step, item.category, locale)
            : item.name_or_category;
        const why = scrubText(
          item.why,
          hideCommerce,
          locale,
          "why",
          item.brand,
          item.product_name,
        );
        const how = scrubText(
          item.how_to_use,
          hideCommerce,
          locale,
          "how",
          item.brand,
          item.product_name,
        );
        const caution = scrubText(
          item.caution,
          hideCommerce,
          locale,
          "caution",
          item.brand,
          item.product_name,
        );
        const benefits = (item.benefits ?? [])
          .map((b) =>
            scrubText(
              b,
              hideCommerce,
              locale,
              "benefit",
              item.brand,
              item.product_name,
            ),
          )
          .filter(Boolean)
          .slice(0, maxBenefits);
        return (
          <li
            key={`${item.step}-${idx}`}
            className={cn(
              "rounded-lg border bg-background p-3",
              affiliate ? "border-violet-500/25" : "border-border/60",
            )}
            data-testid={`onboarding-guidance-${item.step}`}
          >
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                {t(`steps.${item.step}` as "steps.cleanse")}
              </span>
              {affiliate ? (
                <Badge
                  variant="outline"
                  className="border-violet-400/40 bg-violet-500/10 text-[10px] uppercase tracking-wider text-violet-800 dark:text-violet-200"
                >
                  {t("affiliateBadge")}
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase tracking-wider"
                >
                  {t("genericBadge")}
                </Badge>
              )}
            </div>
            <p className="text-sm font-semibold leading-snug">{title}</p>
            {why ? (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground/80">
                  {t("whyLabel")}:{" "}
                </span>
                {why}
              </p>
            ) : null}
            {benefits.length ? (
              <ul className="mt-1.5 space-y-0.5">
                {benefits.map((b) => (
                  <li key={b} className="text-xs text-foreground/90">
                    · {b}
                  </li>
                ))}
              </ul>
            ) : null}
            {how && variant !== "coach" ? (
              <p className="mt-1.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">
                  {t("howLabel")}:{" "}
                </span>
                {how}
              </p>
            ) : null}
            {caution ? (
              <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
                {caution}
              </p>
            ) : null}
            {affiliate && item.affiliate_link ? (
              <a
                href={item.affiliate_link}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="mt-2 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-violet-700 underline-offset-4 hover:underline dark:text-violet-300"
                data-testid="onboarding-affiliate-cta"
                data-affiliate-product-id={item.affiliate_product_id || ""}
                data-affiliate-source={source}
                data-affiliate-step={item.step}
                onClick={() => {
                  void logAffiliateClick(
                    {
                      product_name: item.product_name || item.name_or_category,
                      brand: item.brand || "",
                      reason: item.why,
                      affiliate_link: item.affiliate_link!,
                      price_range: item.price_range || "",
                      priority: "high",
                      product_id: item.affiliate_product_id,
                    },
                    source,
                    contextId,
                  );
                }}
              >
                {t("viewShopee")}
                {item.price_range ? ` · ${item.price_range}` : ""}
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            ) : null}
          </li>
        );
      })}
    </ul>
  );

  return (
    <section
      className="space-y-3 rounded-xl border border-border/70 bg-muted/15 p-3.5 sm:p-4"
      data-testid="onboarding-product-guidance"
      aria-labelledby="onb-product-guidance-title"
    >
      {collapseOnMobile ? (
        <button
          type="button"
          className="flex w-full items-start gap-2 text-left sm:pointer-events-none"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <Leaf
            className="mt-0.5 size-4 shrink-0 text-emerald-700 dark:text-emerald-300"
            aria-hidden
          />
          <div className="min-w-0 flex-1 space-y-0.5">
            <h3
              id="onb-product-guidance-title"
              className="text-sm font-semibold"
            >
              {t("title")}
            </h3>
            <p className="text-xs text-muted-foreground">{t("hint")}</p>
          </div>
          <ChevronDown
            className={cn(
              "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform sm:hidden",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </button>
      ) : (
        <div className="flex items-start gap-2">
          <Leaf
            className="mt-0.5 size-4 shrink-0 text-emerald-700 dark:text-emerald-300"
            aria-hidden
          />
          <div className="min-w-0 space-y-0.5">
            <h3
              id="onb-product-guidance-title"
              className="text-sm font-semibold"
            >
              {t("title")}
            </h3>
            <p className="text-xs text-muted-foreground">{t("hint")}</p>
          </div>
        </div>
      )}

      <div
        className={cn(
          collapseOnMobile && !open && "hidden sm:block",
          collapseOnMobile && open && "block",
        )}
      >
        {body}
      </div>
    </section>
  );
}
