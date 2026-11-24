"use client";

import { useQuery } from "@tanstack/react-query";
import { Droplet, Eraser, Layers, Shield, Sparkles, Sun, type LucideIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { affiliateCatalog } from "@/lib/affiliate/catalog";
import { logAffiliateSuggestionClick } from "@/lib/affiliate/click";
import { batchDateLabel, formatRating, formatSoldCount, formatVnd } from "@/lib/affiliate/format";
import { fetchLatestSkinCheck, latestSkinCheckQueryKey } from "@/lib/affiliate/latest-skin-check";
import { matchAffiliateSuggestions } from "@/lib/affiliate/match";
import {
  buildAffiliateMatchInput,
  isCurrentCheckSevere,
  type AffiliateCheckSignals,
} from "@/lib/affiliate/signals";
import type { AffiliateMatchInput, AffiliateStep, AffiliateSuggestion } from "@/lib/affiliate/types";
import { getAccessToken } from "@/lib/auth-token";
import { useSkinProfileQuery } from "@/lib/hooks/use-skin-profile";
import { useWardrobeQuery } from "@/lib/hooks/use-wardrobe";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { CreateSkinCheckResponseDTO } from "@/lib/types/skin-check";
import { cn } from "@/lib/utils";

const STEP_ICON: Record<AffiliateStep, LucideIcon> = {
  cleanser: Droplet,
  serum: Sparkles,
  moisturizer: Shield,
  sunscreen: Sun,
  makeup_remover: Eraser,
  support: Layers,
};

const STEP_TILE: Record<AffiliateStep, string> = {
  cleanser: "bg-sky-500/10 text-sky-950 dark:text-sky-100",
  serum: "bg-violet-500/10 text-violet-950 dark:text-violet-100",
  moisturizer: "bg-amber-500/15 text-amber-950 dark:text-amber-100",
  sunscreen: "bg-orange-500/15 text-orange-950 dark:text-orange-100",
  makeup_remover: "bg-teal-500/10 text-teal-950 dark:text-teal-100",
  support: "bg-stone-500/15 text-stone-900 dark:text-stone-100",
};

const VISIBLE_BY_DEFAULT = 2;

export const SEVERE_AFFILIATE_INPUT: AffiliateMatchInput = {
  userId: "guest",
  dayKey: "1970-01-01",
  skinTypes: [],
  concerns: [],
  ownedSteps: [],
  severe: true,
  avoidAcid: true,
  cabinetKnown: false,
};

export function checkSignals(payload: CreateSkinCheckResponseDTO): AffiliateCheckSignals {
  return {
    conditions: payload.check.conditions,
    symptoms: payload.check.symptoms,
    coach: payload.analysis.coach ?? null,
  };
}

export function useAffiliateMatchInput(opts: {
  check?: AffiliateCheckSignals | null;
  /** Cabinet: load GET progress + GET skin-checks/:id. The result page already has the check. */
  loadLatestCheck?: boolean;
}): { pending: boolean; input: AffiliateMatchInput | null } {
  const [ready, setReady] = useState(false);
  const user = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const profile = useSkinProfileQuery();
  const wardrobe = useWardrobeQuery();

  useEffect(() => {
    setReady(true);
  }, []);

  const hasAuth = ready && (!!user || !!getAccessToken());
  const latest = useQuery({
    queryKey: latestSkinCheckQueryKey,
    queryFn: fetchLatestSkinCheck,
    enabled: ready && opts.loadLatestCheck === true && hasAuth,
    retry: 1,
    staleTime: 60_000,
  });

  if (!ready) return { pending: true, input: null };
  if (hasAuth && (authLoading || profile.isLoading)) return { pending: true, input: null };
  if (hasAuth && wardrobe.isLoading && !wardrobe.isFetched) return { pending: true, input: null };
  if (opts.loadLatestCheck && hasAuth && latest.isLoading) return { pending: true, input: null };

  const loaded = opts.loadLatestCheck ? latest.data : null;
  const check = opts.check ?? (loaded ? checkSignals(loaded) : null);

  return {
    pending: false,
    input: buildAffiliateMatchInput({
      userId: user?.id,
      check,
      profile: profile.data ?? null,
      products: wardrobe.products,
      cabinetKnown: wardrobe.isSuccess,
    }),
  };
}

export function AffiliateSuggestionSection({ input }: { input: AffiliateMatchInput }) {
  const t = useTranslations("affiliateSuggestions");
  const locale = useLocale();
  const lang = locale === "en" ? "en" : "vi";
  const [expanded, setExpanded] = useState(false);

  if (input.severe) {
    return (
      <section aria-label={t("title")} data-testid="affiliate-severe" className="min-w-0 scroll-mt-24">
        <p
          role="note"
          className="rounded-xl border border-border/80 bg-muted/50 px-3 py-3 text-sm leading-relaxed text-foreground"
        >
          {t("severe")}
        </p>
      </section>
    );
  }

  const items = matchAffiliateSuggestions(input, affiliateCatalog, lang);
  if (items.length === 0) return null;
  const visible = expanded ? items : items.slice(0, VISIBLE_BY_DEFAULT);

  return (
    <section aria-labelledby="affiliate-suggestions-title" data-testid="affiliate-suggestions" className="min-w-0 scroll-mt-24">
      <Card className="border-border/80 bg-card shadow-sm">
        <CardContent className="space-y-3 p-3 sm:p-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2 id="affiliate-suggestions-title" className="text-base font-semibold tracking-tight text-foreground">
                {t("title")}
              </h2>
              <span className="inline-flex min-h-6 items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">
                {t("disclosureLabel")}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{t("disclosure")}</p>
          </div>

          <ul className="space-y-2.5">
            {visible.map((item) => (
              <SuggestionRow key={item.affLink} item={item} lang={lang} />
            ))}
          </ul>

          {items.length > VISIBLE_BY_DEFAULT && !expanded ? (
            <button
              type="button"
              data-testid="affiliate-more"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground"
              onClick={() => setExpanded(true)}
            >
              {t("showMore")}
            </button>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

function SuggestionRow({ item, lang }: { item: AffiliateSuggestion; lang: "vi" | "en" }) {
  const t = useTranslations("affiliateSuggestions");
  const Icon = STEP_ICON[item.step];
  const date = batchDateLabel(item.batch);
  return (
    <li
      className="flex min-w-0 gap-3 rounded-xl border border-border/70 bg-background p-3"
      data-affiliate-step={item.step}
      data-affiliate-batch={item.batch}
    >
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-xl",
          STEP_TILE[item.step],
        )}
        aria-hidden
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-sm font-semibold leading-snug break-words text-foreground">{item.name}</p>
        <p className="text-xs leading-snug break-words text-muted-foreground">{item.shop}</p>
        <p className="text-xs leading-snug text-muted-foreground">
          {t("soldLine", {
            rating: formatRating(item.rating, lang),
            sold: formatSoldCount(item.sold, lang),
          })}
        </p>
        <p className="text-sm font-medium leading-snug text-foreground">
          {date
            ? t("price", { price: formatVnd(item.priceVnd), date })
            : t("priceNoDate", { price: formatVnd(item.priceVnd) })}
        </p>
        <p className="text-sm leading-relaxed break-words text-foreground/90">
          <span className="font-semibold text-foreground">{t("whyLabel")}: </span>
          {item.why}
        </p>
        <a
          href={item.affLink}
          target="_blank"
          rel="sponsored noopener noreferrer"
          data-testid="affiliate-shopee-link"
          onClick={() => logAffiliateSuggestionClick(item.step, item.batch)}
          className="inline-flex min-h-11 max-w-full items-center justify-center self-start rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t("cta")}
        </a>
      </div>
    </li>
  );
}

/** Skin-check result. A severe read shows only the dermatologist line. */
export function CheckInAffiliateSuggestions({ payload }: { payload: CreateSkinCheckResponseDTO }) {
  const check = checkSignals(payload);
  const { input } = useAffiliateMatchInput({ check });
  if (isCurrentCheckSevere(check)) {
    return <AffiliateSuggestionSection input={SEVERE_AFFILIATE_INPUT} />;
  }
  if (!input) return null;
  return <AffiliateSuggestionSection input={input} />;
}

/** Cabinet shelf. The latest skin check decides whether any product is shown. */
export function CabinetAffiliateSuggestions() {
  const { input } = useAffiliateMatchInput({ loadLatestCheck: true });
  if (!input) return null;
  return <AffiliateSuggestionSection input={input} />;
}
