import { ArrowRight } from "lucide-react";
import { getLocale } from "next-intl/server";

import { GuideCard } from "@/components/guides/guide-card";
import { LandingStartCta } from "@/components/landing/landing-start-cta";
import { Link } from "@/i18n/navigation";
import { guideChrome } from "@/lib/guides/catalog";
import { GUIDE_CLIMATE_HUB_PATH, getClimateHub, listGuideClusters } from "@/lib/guides/hub";

export async function GuidesIndexView() {
  const locale = await getLocale();
  const chrome = guideChrome(locale);
  const hub = getClimateHub(locale);
  const clusters = listGuideClusters(locale);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="mx-auto max-w-2xl space-y-3 text-center">
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          {chrome.indexHeading}
        </h1>
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
          {chrome.indexSub}
        </p>
      </header>

      <aside className="mx-auto mt-8 max-w-2xl rounded-2xl border border-primary/25 bg-primary/[0.06] px-5 py-5 text-left sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          {hub.kicker}
        </p>
        <h2 className="mt-2 text-lg font-semibold tracking-tight">
          <Link
            href={GUIDE_CLIMATE_HUB_PATH}
            className="underline-offset-4 hover:text-primary hover:underline"
          >
            {chrome.climateHubLabel}
          </Link>
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{hub.description}</p>
        <Link
          href={GUIDE_CLIMATE_HUB_PATH}
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {chrome.readGuide}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </aside>

      <div className="mt-12 space-y-12">
        {clusters.map((cluster) => (
          <section key={cluster.id} className="space-y-4">
            <div className="max-w-2xl space-y-2">
              <h2 className="text-xl font-semibold tracking-tight">{cluster.heading}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{cluster.intro}</p>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cluster.articles.map((article) => (
                <li key={article.slug}>
                  <GuideCard article={article} readLabel={chrome.readGuide} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-12 space-y-3 rounded-2xl border border-primary/20 bg-primary/[0.06] px-5 py-6 text-center sm:px-8">
        <LandingStartCta size="lg" className="h-12 w-full gap-2 px-6 text-base sm:w-auto">
          {chrome.ctaPhoto}
          <ArrowRight className="size-4" aria-hidden />
        </LandingStartCta>
        <p className="text-xs text-muted-foreground">{chrome.ctaHint}</p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{chrome.disclaimer}</p>
      </div>
    </div>
  );
}
