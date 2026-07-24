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
    <section
      id="progress-preview"
      className="scroll-mt-20 border-t border-border/60 bg-gradient-to-b from-accent/25 via-background/60 to-background"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {t("sectionTitle")}
            </p>
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              {t("heading")}
            </h2>
            <p className="text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t("sub")}
            </p>
          </div>
          <ButtonLink href="/register" variant="ghost" className="shrink-0">
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
