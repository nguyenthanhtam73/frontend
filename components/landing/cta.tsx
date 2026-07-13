import { ArrowRight, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ButtonLink } from "@/components/ui/button-link";

export async function Cta() {
  const t = await getTranslations("cta");

  return (
    <section id="beta" className="scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20">
      <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border-2 border-primary/15 bg-gradient-to-br from-primary/15 via-accent/40 to-background p-8 shadow-lg shadow-primary/10 sm:p-14">
        <div
          className="absolute -right-20 -top-24 size-72 rounded-full bg-primary/30 blur-3xl"
          aria-hidden
        />
        <div className="relative space-y-5 text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{t("eyebrow")}</p>
          <h3 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("heading")}
          </h3>
          <p className="mx-auto max-w-xl text-base leading-relaxed text-muted-foreground sm:mx-0 sm:text-lg">
            {t("body")}
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start">
            <ButtonLink
              href="/register"
              size="lg"
              className="h-12 w-full gap-2 px-8 text-base shadow-lg shadow-primary/25 sm:w-auto"
            >
              {t("primary")}
              <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <ButtonLink
              href="/#beta-signup"
              size="lg"
              variant="outline"
              className="h-12 w-full px-6 text-base sm:w-auto"
            >
              {t("secondary")}
            </ButtonLink>
          </div>

          <p className="flex items-center justify-center gap-1.5 text-sm font-medium text-primary sm:justify-start">
            <ShieldCheck className="size-4 shrink-0" aria-hidden />
            {t("betaFree")}
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">{t("trustNote")}</p>
        </div>
      </div>
    </section>
  );
}
