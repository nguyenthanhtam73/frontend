import { AlertCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Card, CardContent } from "@/components/ui/card";

const itemKeys = ["track", "routine", "change", "products"] as const;

export async function Problem() {
  const t = await getTranslations("problem");

  return (
    <section id="problem" className="scroll-mt-20 border-t border-border/60 bg-background/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto mb-10 max-w-2xl space-y-3 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {t("sectionTitle")}
          </p>
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("heading")}
          </h2>
          <p className="text-pretty text-sm text-muted-foreground sm:text-base">{t("sub")}</p>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2">
          {itemKeys.map((key) => (
            <li key={key}>
              <Card className="h-full border-accent/30 bg-card/80">
                <CardContent className="flex gap-4 p-6">
                  <div
                    className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/60 text-accent-foreground"
                    aria-hidden
                  >
                    <AlertCircle className="size-5" />
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
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
