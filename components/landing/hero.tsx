import { getTranslations } from "next-intl/server";
import { ArrowRight, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";

export async function Hero() {
  const t = await getTranslations("hero");

  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.2fr_0.9fr] lg:gap-12">
        <div className="space-y-6">
          <div className="space-y-3">
            <Badge variant="accent" className="rounded-full px-3 py-1 text-[11px]">
              <Sparkles className="size-3" aria-hidden />
              {t("badge")}
            </Badge>
            <p className="text-sm font-medium tracking-wide text-primary/90 sm:text-base">{t("slogan")}</p>
          </div>

          <h1 className="text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.25rem] lg:leading-[1.05]">
            {t("titleLead")}{" "}
            <span className="gradient-text">{t("titleGradient")}</span>
          </h1>

          <p className="max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            {t.rich("body", {
              b: (chunks) => <strong className="font-medium text-foreground">{chunks}</strong>,
            })}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <ButtonLink
              href="/register"
              size="lg"
              className="h-11 gap-2 px-6 text-base shadow-md shadow-primary/15"
            >
              {t("ctaPrimary")}
              <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="/#how" size="lg" variant="outline" className="h-11 px-6 text-base">
              {t("ctaSecondary")}
            </ButtonLink>
          </div>

          <p className="text-xs text-muted-foreground">{t("betaNote")}</p>

          <dl className="grid grid-cols-1 gap-5 pt-2 sm:grid-cols-3 sm:gap-x-8 sm:gap-y-4">
            {[
              { k: "stat1", v: "stat1" },
              { k: "stat2", v: "stat2" },
              { k: "stat3", v: "stat3" },
            ].map((item) => (
              <div key={item.k} className="min-w-0 space-y-1">
                <dt className="text-xl font-semibold tracking-tight whitespace-nowrap sm:text-2xl">
                  {t(`${item.k}k`)}
                </dt>
                <dd className="text-pretty text-xs leading-snug text-muted-foreground">
                  {t(`${item.k}v`)}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative isolate mx-auto aspect-square w-full max-w-md lg:max-w-none" aria-hidden>
          <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-primary/20 via-accent/40 to-transparent blur-2xl" />
          <HeroMockup
            tags={[
              { from: "0.82 0.06 330", to: "0.62 0.08 320", tag: t("stack1"), style: "left-[6%] top-[8%] -rotate-6" },
              { from: "0.58 0.09 195", to: "0.42 0.08 200", tag: t("stack2"), style: "right-[4%] top-[14%] rotate-3" },
              { from: "0.75 0.05 155", to: "0.52 0.07 175", tag: t("stack3"), style: "left-[14%] bottom-[6%] rotate-2" },
            ]}
            appLabel={t("mockupLabel")}
          />
        </div>
      </div>
    </section>
  );
}

function HeroMockup({
  tags,
  appLabel,
}: {
  tags: { from: string; to: string; tag: string; style: string }[];
  appLabel: string;
}) {
  return (
    <div className="relative h-full w-full">
      <div className="absolute left-1/2 top-1/2 z-10 w-[50%] -translate-x-1/2 -translate-y-[40%] overflow-hidden rounded-[1.75rem] border-4 border-white/70 bg-card shadow-2xl ring-1 ring-black/10">
        <div className="bg-muted/60 px-4 py-2 text-center text-[10px] font-medium text-muted-foreground">
          {appLabel}
        </div>
        <div className="space-y-2 p-3">
          <div className="h-16 rounded-xl bg-gradient-to-r from-primary/20 to-accent/30" />
          <div className="h-10 rounded-lg bg-secondary" />
          <div className="h-10 rounded-lg bg-secondary/80" />
        </div>
      </div>
      {tags.map((c) => (
        <div
          key={c.tag}
          className={`absolute aspect-[3/4] w-[48%] overflow-hidden rounded-3xl border border-white/40 bg-card shadow-xl ring-1 ring-black/5 ${c.style}`}
          style={{
            background: `linear-gradient(160deg, oklch(${c.from}) 0%, oklch(${c.to}) 100%)`,
          }}
        >
          <div className="absolute inset-x-3 bottom-3">
            <span className="rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-medium text-foreground backdrop-blur">
              {c.tag}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
