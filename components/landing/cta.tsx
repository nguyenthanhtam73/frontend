import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ButtonLink } from "@/components/ui/button-link";

export async function Cta() {
  const t = await getTranslations("cta");

  return (
    <section id="beta" className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20">
      <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/15 via-accent/40 to-background p-8 shadow-sm sm:p-14">
        <div
          className="absolute -right-20 -top-24 size-72 rounded-full bg-primary/30 blur-3xl"
          aria-hidden
        />
        <div className="relative space-y-5 text-center sm:text-left">
          <h3 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("heading")}
          </h3>
          <p className="mx-auto max-w-xl text-base text-muted-foreground sm:mx-0 sm:text-lg">
            {t("body")}
          </p>
          <p className="text-sm font-medium text-primary">{t("betaFree")}</p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 sm:justify-start">
            <ButtonLink
              href="/register"
              size="lg"
              className="h-12 gap-2 px-8 text-base shadow-lg shadow-primary/20"
            >
              {t("primary")}
              <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="/onboarding" size="lg" variant="outline" className="h-12 px-6 text-base">
              {t("secondary")}
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
