import { Camera, ClipboardList, Sparkles, TrendingUp } from "lucide-react";
import { getTranslations } from "next-intl/server";

const icons = [ClipboardList, Camera, Sparkles, TrendingUp] as const;
const stepKeys = ["s1", "s2", "s3", "s4"] as const;

export async function HowItWorks() {
  const t = await getTranslations("howItWorks");

  return (
    <section id="how" className="scroll-mt-20 border-t border-border/60">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {t("sectionTitle")}
            </p>
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              {t("heading")}
            </h2>
          </div>
          <p className="max-w-md text-sm text-muted-foreground">{t("side")}</p>
        </div>

        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stepKeys.map((key, i) => {
            const Icon = icons[i];
            return (
              <li
                key={key}
                className="relative rounded-2xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <span className="font-mono text-xs text-primary" aria-hidden>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold tracking-tight">
                  {t(`steps.${key}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t(`steps.${key}.desc`)}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
