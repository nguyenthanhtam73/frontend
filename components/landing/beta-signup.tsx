import { getTranslations } from "next-intl/server";

import { BetaSignupForm } from "@/components/landing/beta-signup-form";

export async function BetaSignup() {
  const t = await getTranslations("betaSignup");

  return (
    <section id="beta-signup" className="scroll-mt-20 border-t border-border/60 bg-background/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-accent/30 to-background p-6 shadow-sm sm:p-10">
          <div
            className="pointer-events-none absolute -left-16 -top-16 size-48 rounded-full bg-primary/20 blur-3xl"
            aria-hidden
          />
          <div className="relative space-y-6">
            <div className="space-y-3 text-center sm:text-left">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                {t("sectionTitle")}
              </p>
              <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
                {t("heading")}
              </h2>
              <p className="text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
                {t("sub")}
              </p>
            </div>
            <BetaSignupForm />
          </div>
        </div>
      </div>
    </section>
  );
}
