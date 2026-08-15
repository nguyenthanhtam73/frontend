"use client";

import { Check, Loader2, Plus, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { useWardrobe } from "@/components/cabinet/wardrobe-provider";
import { UpsellBanner } from "@/components/premium/upsell-banner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Link } from "@/i18n/navigation";
import { isSameShelfName } from "@/lib/cabinet/normalize-product-name";
import { buildStarterShelfCandidates } from "@/lib/cabinet/starter-shelf";
import { Feature } from "@/lib/premium/features";
import { useFeatureGate } from "@/lib/premium/use-feature-gate";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { cn } from "@/lib/utils";

export function CabinetStarterPack() {
  const t = useTranslations("cabinet");
  const tOnboarding = useTranslations("onboarding");
  const ob = useOnboardingStore();
  const toast = useToast();
  const { hasAuth, products, createProduct } = useWardrobe();
  const wardrobeGate = useFeatureGate(Feature.WardrobeFull);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const candidates = useMemo(
    () => buildStarterShelfCandidates(ob, tOnboarding),
    [ob, tOnboarding],
  );

  if (!ob.completedAt) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="space-y-3 p-6">
          <p className="text-sm font-medium">{t("noStarterTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("noStarter")}</p>
          <Link
            href="/onboarding"
            className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("setupLink")}
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (candidates.length === 0) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="space-y-3 p-6">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="size-4 text-primary" aria-hidden />
            {t("starterTitle")}
          </div>
          <p className="text-sm text-muted-foreground">{t("starterEmpty")}</p>
          <Link
            href="/onboarding"
            className="inline-block text-sm font-medium text-primary underline underline-offset-4"
          >
            {t("adjustOnboarding")}
          </Link>
        </CardContent>
      </Card>
    );
  }

  const canWrite = hasAuth && wardrobeGate.allowed && !wardrobeGate.locked;
  const showUpsell = hasAuth && wardrobeGate.locked;

  async function handleAdd(candidateId: string) {
    const candidate = candidates.find((c) => c.id === candidateId);
    if (!candidate || !canWrite) return;
    setPendingId(candidate.id);
    try {
      await createProduct({
        name: candidate.name,
        brand: candidate.brand,
        category: candidate.category,
        notes: t("starterAddNote"),
      });
      toast.success(t("starterAddSuccess", { name: candidate.name }));
    } catch (err) {
      if (err instanceof Error && err.message === "auth") {
        toast.error(t("needAuth"));
        return;
      }
      if (
        err instanceof Error &&
        (err.message === "premium_required" || err.message === "quota_exceeded")
      ) {
        toast.error(t("premiumWardrobeBody"));
        return;
      }
      toast.error(t("starterAddError"));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="space-y-4 p-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="size-4 text-primary" aria-hidden />
            {t("starterTitle")}
          </div>
          <p className="text-xs text-muted-foreground">{t("starterAddHint")}</p>
        </div>

        <ul className="space-y-2">
          {candidates.map((c) => {
            const inShelf = products.some((p) => isSameShelfName(p.name, c.name));
            const busy = pendingId === c.id;
            return (
              <li
                key={c.id}
                className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-snug">{c.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t(`categories.${c.category}`)} · {c.brand}
                  </p>
                </div>
                {!hasAuth ? (
                  <Link
                    href="/login"
                    className={cn(buttonVariants({ size: "sm", variant: "outline" }), "min-h-10 shrink-0")}
                  >
                    {t("signIn")}
                  </Link>
                ) : inShelf ? (
                  <span className="inline-flex min-h-10 shrink-0 items-center gap-1.5 text-xs font-medium text-primary">
                    <Check className="size-3.5" aria-hidden />
                    {t("starterInShelf")}
                  </span>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="min-h-10 shrink-0"
                    disabled={!canWrite || busy || wardrobeGate.isLoading}
                    onClick={() => void handleAdd(c.id)}
                  >
                    {busy ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" aria-hidden />
                        {t("adding")}
                      </>
                    ) : (
                      <>
                        <Plus className="size-3.5" aria-hidden />
                        {t("starterAddCta")}
                      </>
                    )}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>

        {showUpsell ? (
          <UpsellBanner feature={Feature.WardrobeFull} compact />
        ) : null}

        <Link
          href="/onboarding"
          className="inline-block text-sm font-medium text-primary underline underline-offset-4"
        >
          {t("adjustOnboarding")}
        </Link>
      </CardContent>
    </Card>
  );
}
