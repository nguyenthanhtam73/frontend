import { ArrowRight } from "lucide-react";

import { SkinCheckCard } from "@/components/skin/skin-check-card";
import { ButtonLink } from "@/components/ui/button-link";
import { localizeMockSkinCheck, mockSkinChecks } from "@/lib/mock-data";
import { getLocale, getTranslations } from "next-intl/server";

export async function ProgressPreview() {
  const t = await getTranslations("progressPreview");
  const locale = await getLocale();
  const preview = mockSkinChecks
    .slice(0, 3)
    .map((src) => localizeMockSkinCheck(src, locale));

  return (
    <section className="border-t border-border/60 bg-background/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {t("sectionTitle")}
            </p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("heading")}</h2>
            <p className="max-w-xl text-sm text-muted-foreground">{t("sub")}</p>
          </div>
          <ButtonLink href="/progress" variant="ghost">
            {t("cta")}
            <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {preview.map((e) => (
            <SkinCheckCard key={e.id} entry={e} />
          ))}
        </div>
      </div>
    </section>
  );
}
