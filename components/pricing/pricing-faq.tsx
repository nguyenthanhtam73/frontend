"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

const FAQ_KEYS = ["q1", "q2", "q3", "q4"] as const;

/** Short FAQ — native disclosure for a11y, no extra accordion dependency. */
export function PricingFaq({ className }: { className?: string }) {
  const t = useTranslations("pricing.faq");

  return (
    <section className={cn("space-y-5", className)} aria-labelledby="pricing-faq-heading">
      <div className="space-y-1.5 text-center">
        <h2
          id="pricing-faq-heading"
          className="text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          {t("title")}
        </h2>
        <p className="mx-auto max-w-lg text-sm text-muted-foreground sm:text-base">
          {t("subtitle")}
        </p>
      </div>

      <div className="mx-auto max-w-2xl divide-y divide-border/60 rounded-2xl border border-border/70 bg-card/50 px-1 shadow-sm backdrop-blur-sm">
        {FAQ_KEYS.map((key) => (
          <details
            key={key}
            className="group px-4 py-0.5 open:bg-muted/20 transition-colors duration-200 sm:px-5"
          >
            <summary className="cursor-pointer list-none py-4 text-[0.95rem] font-semibold tracking-tight marker:content-none touch-manipulation [&::-webkit-details-marker]:hidden sm:text-sm">
              <span className="flex items-center justify-between gap-3">
                {t(`${key}.question`)}
                <span
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-45 group-open:bg-primary/15 group-open:text-primary sm:size-7"
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
    </section>
  );
}
