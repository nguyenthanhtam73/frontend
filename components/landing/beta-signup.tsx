import { Check, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { BetaSignupForm } from "@/components/landing/beta-signup-form";

const benefitKeys = ["b1", "b2", "b3"] as const;
const trustKeys = ["t1", "t2", "t3"] as const;

export async function BetaSignup() {
  const t = await getTranslations("betaSignup");

  return (
    <section id="beta-signup" className="scroll-mt-20 border-t border-border/60 bg-background/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border-2 border-primary/15 bg-gradient-to-br from-primary/10 via-accent/30 to-background p-6 shadow-lg shadow-primary/5 sm:p-10">
          <div
            className="pointer-events-none absolute -left-16 -top-16 size-48 rounded-full bg-primary/20 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-20 -right-16 size-56 rounded-full bg-accent/30 blur-3xl"
            aria-hidden
          />

          <div className="relative space-y-6">
            <div className="space-y-4 text-center sm:text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                {t("sectionTitle")}
              </p>
              <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
                {t("heading")}
              </h2>
              <p className="text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
                {t("sub")}
              </p>

              <ul className="grid gap-2 text-left sm:grid-cols-3 sm:gap-3">
                {benefitKeys.map((key) => (
                  <li
                    key={key}
                    className="flex items-start gap-2 rounded-xl border border-border/50 bg-background/70 px-3 py-2.5 text-sm"
                  >
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    <span className="leading-snug text-foreground/90">{t(`benefits.${key}`)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm backdrop-blur sm:p-5">
              <BetaSignupForm />
            </div>

            <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-5 sm:gap-y-2">
              {trustKeys.map((key) => (
                <li
                  key={key}
                  className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground sm:justify-start"
                >
                  <ShieldCheck className="size-3.5 shrink-0 text-primary/70" aria-hidden />
                  {t(`trust.${key}`)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
