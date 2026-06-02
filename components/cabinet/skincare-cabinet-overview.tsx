"use client";

import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { useMemo } from "react";

import { WardrobeProductForm } from "@/components/cabinet/wardrobe-product-form";
import { WardrobeProductList } from "@/components/cabinet/wardrobe-product-list";
import { WardrobeProvider } from "@/components/cabinet/wardrobe-provider";
import { PrivacyControls } from "@/components/privacy/privacy-controls";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { buildLocalizedStarterLines } from "@/lib/i18n/starter-pack-lines";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";

export function SkincareCabinetOverview() {
  const t = useTranslations("cabinet");
  const tOnboarding = useTranslations("onboarding");
  const ob = useOnboardingStore();
  const bullets = useMemo(
    () => buildLocalizedStarterLines(ob, tOnboarding),
    [ob, tOnboarding],
  );

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {t("sectionLabel")}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("title")}</h1>
        <p className="max-w-2xl text-muted-foreground">{t("sub")}</p>
      </div>

      <WardrobeProvider>
        <div className="grid gap-6 lg:grid-cols-2">
          <WardrobeProductList
            onAddClick={() => {
              document.getElementById("wardrobe-add-form")?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }}
          />
          <WardrobeProductForm formId="wardrobe-add-form" />
        </div>
      </WardrobeProvider>

      {ob.completedAt ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="space-y-3 p-6">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="size-4 text-primary" aria-hidden />
              {t("starterTitle")}
            </div>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {bullets.map((b) => (
                <li key={b}>• {b}</li>
              ))}
            </ul>
            <Link
              href="/onboarding"
              className="inline-block text-sm font-medium text-primary underline underline-offset-4"
            >
              {t("adjustOnboarding")}
            </Link>
          </CardContent>
        </Card>
      ) : (
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
      )}

      <PrivacyControls />
    </div>
  );
}
