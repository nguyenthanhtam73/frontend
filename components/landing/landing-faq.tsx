import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

/** Keep in sync with FAQPage JSON-LD on the home page. */
export const LANDING_FAQ_KEYS = ["q1", "q2", "q3", "q4", "q5"] as const;

/** Landing FAQ — visible Q&A + pairs with FAQPage JSON-LD on the home page. */
export async function LandingFaq() {
  const t = await getTranslations("landingFaq");

  return (
    <section id="faq" className="dd-anchor border-t border-border/60">
      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-8 space-y-2 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {t("sectionTitle")}
          </p>
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("heading")}
          </h2>
          <p className="mx-auto max-w-lg text-sm text-muted-foreground sm:text-base">
            {t("subtitle")}
          </p>
        </div>

        <div className="divide-y divide-border/60 rounded-2xl border border-border/70 bg-card px-1">
          {LANDING_FAQ_KEYS.map((key) => (
            <details
              key={key}
              className="group px-4 py-0.5 open:bg-muted sm:px-5"
            >
              <summary className="min-h-11 cursor-pointer list-none py-4 text-left text-[0.95rem] font-semibold tracking-tight marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-start justify-between gap-3 sm:items-center">
                  {t(`${key}.question`)}
                  <span
                    className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-transform group-open:rotate-45"
                    aria-hidden
                  >
                    +
                  </span>
                </span>
              </summary>
              <p className="pb-4 text-sm leading-relaxed text-muted-foreground">
                {t(`${key}.answer`)}
              </p>
            </details>
          ))}
        </div>

        <p className="mt-6 text-center text-sm">
          <Link
            href="/pricing"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("pricingCta")}
          </Link>
        </p>
      </div>
    </section>
  );
}
