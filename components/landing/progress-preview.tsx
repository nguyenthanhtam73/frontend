import { ArrowRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { SkinCheckCard } from "@/components/skin/skin-check-card";
import { LandingStartCta } from "@/components/landing/landing-start-cta";
import { resolvePreviewSrcs } from "@/lib/marketing-screenshots";
import { localizeMockSkinCheck, mockSkinChecks } from "@/lib/mock-data";

export async function ProgressPreview() {
  const t = await getTranslations("progressPreview");
  const locale = await getLocale();
  const preview = mockSkinChecks
    .slice(0, 3)
    .map((src) => localizeMockSkinCheck(src, locale));
  const photos = resolvePreviewSrcs();

  return (
    <section
      id="progress-preview"
      className="dd-anchor border-t border-border/60"
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
          <LandingStartCta variant="ghost" className="h-11 w-full justify-center sm:h-9 sm:w-auto sm:shrink-0">
            {t("cta")}
            <ArrowRight className="size-4" aria-hidden />
          </LandingStartCta>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {preview.map((e, i) => (
            <SkinCheckCard
              key={e.id}
              entry={e}
              photoSrc={photos[i]}
              photoAlt={t("cardPhotoAlt", { name: e.user.name })}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
