import { Quote, Star } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const itemKeys = ["t1", "t2", "t3"] as const;

function StarRating() {
  return (
    <div className="flex gap-0.5" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="size-3.5 fill-primary/80 text-primary/80" aria-hidden />
      ))}
    </div>
  );
}

export async function Testimonials() {
  const t = await getTranslations("testimonials");

  return (
    <section className="border-t border-border/60 bg-muted/20">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {t("sectionTitle")}
            </p>
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              {t("heading")}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{t("sub")}</p>
          </div>
          <Badge variant="accent" className="w-fit shrink-0 rounded-full px-3 py-1">
            {t("collecting")}
          </Badge>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {itemKeys.map((key) => (
            <Card key={key} className="h-full border-border/70 bg-card/95 shadow-sm">
              <CardContent className="flex h-full flex-col gap-4 p-6">
                <div className="flex items-center justify-between gap-2">
                  <Quote className="size-7 text-primary/25" aria-hidden />
                  <StarRating />
                </div>
                <blockquote className="flex-1 text-sm leading-relaxed text-foreground/85">
                  “{t(`items.${key}.quote`)}”
                </blockquote>
                <div className="flex items-center gap-3 border-t border-border/50 pt-4">
                  <Avatar name={t(`items.${key}.name`)} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{t(`items.${key}.name`)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t(`items.${key}.role`)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 rounded-full px-2 py-0.5 text-[10px]">
                    {t("earlyBeta")}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground/80">
          {t("footnote")}
        </p>
      </div>
    </section>
  );
}
