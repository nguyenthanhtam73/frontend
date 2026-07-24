import { getTranslations } from "next-intl/server";
import { ArrowRight, Camera, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { Link } from "@/i18n/navigation";

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

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <ButtonLink
              href="/register"
              size="lg"
              className="h-12 w-full gap-2 px-6 text-base shadow-lg shadow-primary/20 sm:w-auto"
            >
              {t("ctaPrimary")}
              <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <ButtonLink
              href="/#how"
              size="lg"
              variant="outline"
              className="h-12 w-full px-6 text-base sm:w-auto"
            >
              {t("ctaSecondary")}
            </ButtonLink>
          </div>

          <p className="text-sm text-muted-foreground">
            {t("betaNote")}{" "}
            <Link href="/#beta-signup" className="font-medium text-primary underline-offset-4 hover:underline">
              {t("ctaEmailLink")}
            </Link>
          </p>

          <dl className="grid grid-cols-1 gap-5 border-t border-border/50 pt-5 sm:grid-cols-3 sm:gap-x-8 sm:gap-y-4">
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
            checkInLabel={t("mockupCheckIn")}
            streakLabel={t("mockupStreak")}
            coachLabel={t("mockupCoach")}
          />
        </div>
      </div>
    </section>
  );
}

function HeroMockup({
  tags,
  appLabel,
  checkInLabel,
  streakLabel,
  coachLabel,
}: {
  tags: { from: string; to: string; tag: string; style: string }[];
  appLabel: string;
  checkInLabel: string;
  streakLabel: string;
  coachLabel: string;
}) {
  return (
    <div className="relative h-full w-full">
      {/* Product phone frame — richer UI chrome (no PNG assets in repo yet) */}
      <div className="absolute left-1/2 top-1/2 z-10 w-[52%] max-w-[220px] -translate-x-1/2 -translate-y-[42%] overflow-hidden rounded-[1.85rem] border-[5px] border-white/80 bg-card shadow-2xl ring-1 ring-black/10 sm:max-w-none">
        <div className="flex items-center justify-between bg-gradient-to-r from-primary/15 to-accent/30 px-3 py-2">
          <span className="text-[10px] font-semibold tracking-wide text-foreground/80">
            {appLabel}
          </span>
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-medium text-primary">
            {streakLabel}
          </span>
        </div>
        <div className="space-y-2.5 p-3">
          <div className="overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-primary/25 via-accent/35 to-primary/10">
            <div className="flex aspect-[5/3] flex-col items-center justify-center gap-1.5 p-3">
              <Camera className="size-5 text-primary/70" strokeWidth={1.75} />
              <p className="text-center text-[10px] font-medium text-foreground/80">
                {checkInLabel}
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-primary/15 bg-primary/8 px-2.5 py-2">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-primary/80">
              AI Coach
            </p>
            <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-foreground/85">
              {coachLabel}
            </p>
          </div>
          <div className="flex items-end gap-1 px-0.5 pb-0.5">
            {[36, 48, 42, 58, 64, 60, 72].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-primary/55"
                style={{ height: `${h * 0.28}px` }}
              />
            ))}
          </div>
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
