import { ArrowRight } from "lucide-react";

import { ButtonLink } from "@/components/ui/button-link";
import { getTranslations } from "next-intl/server";

export async function Cta() {
  const t = await getTranslations("cta");

  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/15 via-accent/40 to-background p-8 shadow-sm sm:p-14">
        <div
          className="absolute -right-20 -top-24 size-72 rounded-full bg-primary/30 blur-3xl"
          aria-hidden
        />
        <div className="relative space-y-5">
          <h3 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("heading")}
          </h3>
          <p className="max-w-xl text-base text-muted-foreground sm:text-lg">{t("body")}</p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <ButtonLink href="/register" size="lg">
              {t("primary")}
              <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="/check-in" size="lg" variant="outline">
              {t("secondary")}
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
