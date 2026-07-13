import { CheckCircle2, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Badge } from "@/components/ui/badge";

const pointKeys = ["p1", "p2", "p3", "p4"] as const;

export async function Solution() {
  const t = await getTranslations("solution");

  return (
    <section className="border-t border-border/60">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-14">
        <div className="relative order-2 lg:order-1">
          <div
            className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-primary/15 via-accent/30 to-transparent blur-2xl"
            aria-hidden
          />
          <SolutionMockup
            labels={{
              checkIn: t("mockup.checkIn"),
              coach: t("mockup.coach"),
              coachSample: t("mockup.coachSample"),
              progress: t("mockup.progress"),
            }}
          />
        </div>

        <div className="order-1 space-y-6 lg:order-2">
          <div className="space-y-3">
            <Badge variant="accent" className="rounded-full px-3 py-1 text-[11px]">
              <Sparkles className="size-3" aria-hidden />
              {t("badge")}
            </Badge>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {t("sectionTitle")}
            </p>
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              {t("heading")}
            </h2>
            <p className="text-pretty text-base leading-relaxed text-muted-foreground">
              {t("body")}
            </p>
          </div>

          <ul className="space-y-3">
            {pointKeys.map((key) => (
              <li key={key} className="flex gap-3 text-sm leading-relaxed">
                <CheckCircle2
                  className="mt-0.5 size-5 shrink-0 text-primary"
                  aria-hidden
                />
                <span>{t(`points.${key}`)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function SolutionMockup({
  labels,
}: {
  labels: { checkIn: string; coach: string; coachSample: string; progress: string };
}) {
  return (
    <div
      className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-[2rem] border border-white/50 bg-card shadow-2xl ring-1 ring-black/5"
      aria-hidden
    >
      <div className="absolute inset-x-0 top-0 h-8 bg-muted/80" />
      <div className="absolute left-1/2 top-2 h-1 w-16 -translate-x-1/2 rounded-full bg-border" />
      <div className="flex h-full flex-col gap-3 p-5 pt-10">
        <div className="rounded-2xl bg-primary/10 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-primary">
            {labels.checkIn}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="aspect-square rounded-xl bg-gradient-to-br from-primary/25 to-accent/40" />
            <div className="aspect-square rounded-xl bg-gradient-to-br from-accent/50 to-primary/20" />
          </div>
        </div>
        <div className="rounded-2xl border bg-background/80 p-4">
          <p className="text-[11px] font-medium text-muted-foreground">{labels.coach}</p>
          <p className="mt-2 text-sm leading-relaxed">{labels.coachSample}</p>
        </div>
        <div className="mt-auto rounded-2xl bg-secondary p-4">
          <p className="text-[11px] font-medium text-muted-foreground">{labels.progress}</p>
          <div className="mt-3 flex items-end gap-1.5">
            {[40, 55, 48, 62, 70, 68, 78].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-primary/70"
                style={{ height: `${h * 0.35}px` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
