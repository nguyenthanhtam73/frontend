import { Quote } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const itemKeys = ["t1", "t2", "t3"] as const;

export async function Testimonials() {
  const t = await getTranslations("testimonials");

  return (
    <section className="border-t border-border/60">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {t("sectionTitle")}
            </p>
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              {t("heading")}
            </h2>
          </div>
          <Badge variant="secondary" className="w-fit shrink-0 rounded-full px-3 py-1">
            {t("collecting")}
          </Badge>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {itemKeys.map((key) => (
            <Card key={key} className="h-full bg-card/90">
              <CardContent className="flex h-full flex-col gap-4 p-6">
                <Quote className="size-8 text-primary/30" aria-hidden />
                <blockquote className="flex-1 text-sm leading-relaxed text-muted-foreground">
                  “{t(`items.${key}.quote`)}”
                </blockquote>
                <div className="flex items-center gap-3 border-t border-border/50 pt-4">
                  <Avatar name={t(`items.${key}.name`)} size="md" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t(`items.${key}.name`)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t(`items.${key}.role`)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">{t("footnote")}</p>
      </div>
    </section>
  );
}
