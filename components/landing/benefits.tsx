import { Droplets, Shield, Sun, ThermometerSun } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Card, CardContent } from "@/components/ui/card";

const icons = [ThermometerSun, Droplets, Sun, Shield] as const;
const itemKeys = ["humid", "oily", "acne", "safe"] as const;

export async function Benefits() {
  const t = await getTranslations("benefits");

  return (
    <section className="border-t border-border/60 bg-background/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-10 max-w-2xl space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {t("sectionTitle")}
          </p>
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("heading")}
          </h2>
          <p className="text-pretty text-sm text-muted-foreground sm:text-base">{t("sub")}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {itemKeys.map((key, i) => {
            const Icon = icons[i];
            return (
              <Card key={key} className="h-full overflow-hidden">
                <CardContent className="flex gap-4 p-6">
                  <div className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-accent/40 text-primary">
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-semibold tracking-tight">
                      {t(`items.${key}.title`)}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {t(`items.${key}.desc`)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
