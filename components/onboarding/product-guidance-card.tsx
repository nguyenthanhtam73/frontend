"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ChevronDown, ExternalLink, Leaf } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { logAffiliateClick, type AffiliateClickSource } from "@/lib/api/affiliate";
import { enrichProductGuidanceItems } from "@/lib/onboarding/enrich-product-guidance";
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

const SM_UP_QUERY = "(min-width: 640px)";

function subscribeSmUp(onChange: () => void) {
  const mq = window.matchMedia(SM_UP_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getSmUpSnapshot() {
  return window.matchMedia(SM_UP_QUERY).matches;
}

/** SSR/desktop-first so role-only cards don’t flash collapsed on wide screens. */
function getSmUpServerSnapshot() {
  return true;
}

function useIsSmUp() {
  return useSyncExternalStore(
    subscribeSmUp,
    getSmUpSnapshot,
    getSmUpServerSnapshot,
  );
}

function GuidanceCard({
  item,
  idx,
  hideCommerce,
  locale,
  t,
  source,
  contextId,
  variant,
  maxBenefits,
  compactMobile,
  smUp,
  carePhase,
  tipOnly = false,
}: {
  item: ProductGuidanceItemDTO;
  idx: number;
  hideCommerce: boolean;
  locale: string;
  t: ReturnType<typeof useTranslations>;
  source: AffiliateClickSource;
  contextId?: string;
  variant: "onboarding" | "coach";
  maxBenefits: number;
  compactMobile: boolean;
  smUp: boolean;
  carePhase?: string;
  /** Step 1 compact: title + why + CTA only (no benefits/how/caution). */
  tipOnly?: boolean;
}) {
  const affiliate = hasAffiliate(item, hideCommerce);
  // Mobile compact: card 0 expanded; later cards collapsed (CTA + role) —
  // keep title, why, and Shopee link visible; tuck benefits/caution behind toggle.
  const preferCollapsed = !tipOnly && compactMobile && !smUp && idx > 0;
  const [detailsOpen, setDetailsOpen] = useState(!preferCollapsed);

  useEffect(() => {
    setDetailsOpen(!preferCollapsed);
  }, [preferCollapsed]);

  const calmFirst =
    String(carePhase ?? item.phase ?? "").toLowerCase() === "calm_first";
  const stepLabel =
    item.step === "moisturize" && calmFirst
      ? t("steps.moisturizeCalm")
      : t(`steps.${item.step}` as "steps.cleanse");

  const title = affiliate
    ? [item.brand, item.product_name].filter(Boolean).join(" · ") ||
      item.name_or_category
    : hideCommerce
      ? genericRoleLabel(item.step, item.category, locale, carePhase)
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
  const benefits = tipOnly
    ? []
    : (item.benefits ?? [])
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

  // Compact Step 2: keep how off the first mobile viewport (sm+ still shows it).
  const showHow =
    !tipOnly &&
    Boolean(how) &&
    variant !== "coach" &&
    (!compactMobile || smUp);
  const showExtras = !tipOnly && (detailsOpen || !preferCollapsed);
  const hasCollapsibleExtras =
    preferCollapsed && (benefits.length > 0 || Boolean(caution) || Boolean(how));

  return (
    <li
      className={cn(
        "rounded-lg border bg-background p-3",
        affiliate ? "border-violet-500/25" : "border-border/60",
      )}
      data-testid="guidance-card"
      data-guidance-step={item.step}
      data-guidance-compact={preferCollapsed && !detailsOpen ? "1" : "0"}
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {stepLabel}
        </span>
        {affiliate ? (
          <Badge
            variant="outline"
            className="border-violet-400/40 bg-violet-500/10 text-[11px] uppercase tracking-wider text-violet-800 dark:text-violet-200"
          >
            {t("affiliateBadge")}
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="text-[11px] uppercase tracking-wider"
          >
            {t("genericBadge")}
          </Badge>
        )}
      </div>
      <p className="text-base font-semibold leading-snug">{title}</p>
      {why ? (
        <p
          className={cn(
            "mt-1.5 text-sm leading-relaxed text-muted-foreground",
            (preferCollapsed && !detailsOpen) || tipOnly
              ? "line-clamp-2"
              : undefined,
          )}
          data-testid="guidance-why"
        >
          <span className="font-medium text-foreground/80">
            {t("whyLabel")}:{" "}
          </span>
          {why}
        </p>
      ) : null}

      {showExtras ? (
        <>
          {benefits.length ? (
            <div className="mt-1.5" data-testid="guidance-benefits">
              <p className="text-xs font-medium text-foreground/80">
                {t("benefitsLabel")}
              </p>
              <ul className="mt-0.5 space-y-0.5">
                {benefits.map((b) => (
                  <li
                    key={b}
                    className="text-sm leading-relaxed text-foreground/90"
                  >
                    · {b}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {showHow ? (
            <p
              className="mt-1.5 text-sm leading-relaxed text-muted-foreground"
              data-testid="guidance-how"
            >
              <span className="font-medium text-foreground/80">
                {t("howLabel")}:{" "}
              </span>
              {how}
            </p>
          ) : null}
          {caution ? (
            <p
              className="mt-1.5 text-sm leading-relaxed text-amber-800 dark:text-amber-200"
              data-testid="guidance-caution"
            >
              <span className="font-medium">{t("cautionLabel")}: </span>
              {caution}
            </p>
          ) : null}
        </>
      ) : null}

      {hasCollapsibleExtras ? (
        <button
          type="button"
          onClick={() => setDetailsOpen((v) => !v)}
          className="mt-1.5 inline-flex items-center gap-0.5 text-xs font-medium text-primary"
          data-testid="guidance-toggle-details"
        >
          {detailsOpen ? t("lessDetails") : t("moreDetails")}
          <ChevronDown
            className={cn(
              "size-3 transition-transform",
              detailsOpen && "rotate-180",
            )}
            aria-hidden
          />
        </button>
      ) : null}

      {affiliate && item.affiliate_link ? (
        <a
          href={item.affiliate_link}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="mt-2 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-violet-700 underline-offset-4 hover:underline dark:text-violet-300"
          data-testid="affiliate-cta"
          data-legacy-testid="onboarding-affiliate-cta"
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
}

export function ProductGuidanceSection({
  items,
  contextId,
  source = "starter_routine",
  variant = "onboarding",
  collapseOnMobile = false,
  /** Step 2: keep section expanded so CTA cards stay above the fold. */
  forceExpanded = false,
  /**
   * Step 2 mobile density: first card expanded; later cards collapsed to
   * title + why (+ CTA link) until “more details”. How hidden on xs.
   */
  compactMobile = false,
  /**
   * Step 1: only show catalog-matched CTA cards (≤2), each with title + why + link.
   * Hides when Premium no_ads or when nothing matched.
   */
  commerceOnly = false,
  maxBenefits = 4,
  enrichContext,
  sectionTestId = "onboarding-product-guidance",
}: {
  items: ProductGuidanceItemDTO[] | undefined;
  contextId?: string;
  source?: AffiliateClickSource;
  /** Coach surfaces use shorter copy + titles. */
  variant?: "onboarding" | "coach";
  /** Step 1: collapse role cards on small screens when no CTA. */
  collapseOnMobile?: boolean;
  forceExpanded?: boolean;
  compactMobile?: boolean;
  commerceOnly?: boolean;
  maxBenefits?: number;
  /** Optional analyze context for client-side copy fill. */
  enrichContext?: {
    phase?: string;
    severity?: string;
    regions?: string[];
    concerns?: string[];
  };
  sectionTestId?: string;
}) {
  const tOnb = useTranslations("onboarding.productGuidance");
  const tCoach = useTranslations("coachProductGuidance");
  const t = variant === "coach" ? tCoach : tOnb;
  const locale = useLocale();
  const noAds = useFeatureGate(Feature.NoAds);
  // Hide Shopee only for confirmed Premium no_ads (or known Premium while
  // /me/usage is still loading). Never treat bare isLoading as Premium — that
  // was hiding Free CTAs behind “Gợi ý chung”.
  const hideCommerce =
    (noAds.allowed && !noAds.isLoading) ||
    (noAds.isLoading && noAds.isPremium);
  const smUp = useIsSmUp();
  const carePhase = enrichContext?.phase;

  const enriched = useMemo(
    () =>
      enrichProductGuidanceItems(items, {
        locale,
        phase: enrichContext?.phase,
        severity: enrichContext?.severity,
        regions: enrichContext?.regions,
        concerns: enrichContext?.concerns,
      }),
    [items, locale, enrichContext],
  );

  const list = useMemo(() => {
    const base = enriched.filter(
      (i) =>
        i.name_or_category?.trim() || i.product_name?.trim() || i.why?.trim(),
    );
    if (!commerceOnly) return base;
    if (hideCommerce) return [];
    return base
      .filter((i) => Boolean(i.affiliate_product_id && i.affiliate_link?.trim()))
      .slice(0, 2);
  }, [enriched, commerceOnly, hideCommerce]);

  const hasVisibleCTA =
    !hideCommerce &&
    list.some((i) => Boolean(i.affiliate_product_id && i.affiliate_link?.trim()));
  const [open, setOpen] = useState(
    forceExpanded || !collapseOnMobile || hasVisibleCTA || commerceOnly,
  );

  useEffect(() => {
    if (forceExpanded || commerceOnly || (collapseOnMobile && hasVisibleCTA)) {
      setOpen(true);
    }
  }, [collapseOnMobile, hasVisibleCTA, forceExpanded, commerceOnly]);

  if (list.length === 0) return null;

  const body = (
    <ul className="space-y-3" data-testid="guidance-cards">
      {list.map((item, idx) => (
        <GuidanceCard
          key={`${item.step}-${idx}`}
          item={item}
          idx={idx}
          hideCommerce={hideCommerce}
          locale={locale}
          t={t}
          source={source}
          contextId={contextId}
          variant={variant}
          maxBenefits={maxBenefits}
          compactMobile={compactMobile}
          smUp={smUp}
          carePhase={carePhase}
          tipOnly={commerceOnly}
        />
      ))}
    </ul>
  );

  const showCollapseChrome = collapseOnMobile && !forceExpanded && !commerceOnly;

  return (
    <section
      className="space-y-3 rounded-xl border border-border/70 bg-muted/15 p-3.5 sm:p-4"
      data-testid={sectionTestId}
      aria-labelledby="onb-product-guidance-title"
    >
      {showCollapseChrome ? (
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
          <div className="min-w-0 flex-1">
            <h3
              id="onb-product-guidance-title"
              className="text-base font-semibold"
            >
              {t("title")}
            </h3>
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
          <div className="min-w-0">
            <h3
              id="onb-product-guidance-title"
              className="text-base font-semibold"
            >
              {t("title")}
            </h3>
          </div>
        </div>
      )}

      <div
        className={cn(
          showCollapseChrome && !open && "hidden sm:block",
          showCollapseChrome && open && "block",
        )}
      >
        {body}
      </div>
    </section>
  );
}
