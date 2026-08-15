"use client";

import { useTranslations } from "next-intl";
import { Settings2 } from "lucide-react";

import { CabinetStarterPack } from "@/components/cabinet/cabinet-starter-pack";
import { WardrobeProductForm } from "@/components/cabinet/wardrobe-product-form";
import { WardrobeProductList } from "@/components/cabinet/wardrobe-product-list";
import { WardrobeProvider } from "@/components/cabinet/wardrobe-provider";
import { Link } from "@/i18n/navigation";

export function SkincareCabinetOverview() {
  const t = useTranslations("cabinet");

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {t("sectionLabel")}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-4xl">{t("title")}</h1>
        <p className="max-w-2xl text-muted-foreground">{t("sub")}</p>
        <Link
          href="/settings"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-4"
        >
          <Settings2 className="size-4" aria-hidden />
          {t("settingsLink")}
        </Link>
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

        <CabinetStarterPack />
      </WardrobeProvider>
    </div>
  );
}
