import { getTranslations } from "next-intl/server";

const stepKeys = ["s1", "s2", "s3"] as const;

export async function HowItWorks() {
  const t = await getTranslations("howItWorks");

  return (
    <section id="how" className="scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {t("sectionTitle")}
            </p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("heading")}</h2>
          </div>
          <p className="max-w-md text-sm text-muted-foreground">{t("side")}</p>
        </div>

        <ol className="grid gap-4 md:grid-cols-3">
          {stepKeys.map((key, i) => (
            <li key={key} className="relative rounded-2xl border bg-card p-6 shadow-sm">
              <div className="font-mono text-xs text-primary">
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3 className="mt-3 text-lg font-semibold tracking-tight">
                {t(`steps.${key}.title`)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t(`steps.${key}.desc`)}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
