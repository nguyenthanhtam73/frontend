import { ArrowRight } from "lucide-react";
import { getLocale } from "next-intl/server";

import { GuideCard } from "@/components/guides/guide-card";
import { LandingStartCta } from "@/components/landing/landing-start-cta";
import { Link } from "@/i18n/navigation";
import { guideChrome } from "@/lib/guides/catalog";
import { getClimateHub } from "@/lib/guides/hub";

export async function GuidesClimateHubView() {
  const locale = await getLocale();
  const chrome = guideChrome(locale);
  const hub = getClimateHub(locale);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <nav aria-label="Breadcrumb" className="mb-8 text-xs text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="underline-offset-4 hover:text-foreground hover:underline">
              {chrome.breadcrumbHome}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href="/guides" className="underline-offset-4 hover:text-foreground hover:underline">
              {chrome.breadcrumbGuides}
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="text-foreground/80">{chrome.breadcrumbHub}</li>
        </ol>
      </nav>

      <header className="mx-auto max-w-2xl space-y-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{hub.kicker}</p>
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          {hub.heading}
        </h1>
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
          {hub.lede}
        </p>
      </header>

      <div className="mx-auto mt-8 max-w-2xl space-y-3 rounded-2xl border border-primary/25 bg-primary/[0.07] px-4 py-5 text-center sm:px-6">
        <LandingStartCta size="lg" className="h-12 w-full gap-2 text-base sm:w-auto">
          {chrome.ctaPhoto}
          <ArrowRight className="size-4" aria-hidden />
        </LandingStartCta>
        <p className="text-xs leading-relaxed text-muted-foreground">{chrome.ctaHint}</p>
      </div>

      <section className="mx-auto mt-12 max-w-2xl space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">{hub.climateHeading}</h2>
        {hub.climateParagraphs.map((p) => (
          <p key={p} className="text-sm leading-relaxed text-foreground/90 sm:text-base">
            {p}
          </p>
        ))}
      </section>

      <section className="mx-auto mt-10 max-w-2xl space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">{hub.howToPickHeading}</h2>
        {hub.howToPickParagraphs.map((p) => (
          <p key={p} className="text-sm leading-relaxed text-foreground/90 sm:text-base">
            {p}
          </p>
        ))}
      </section>

      <div className="mt-12 space-y-12">
        {hub.clusters.map((cluster) => (
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

      <section className="mx-auto mt-12 max-w-2xl space-y-4 border-t border-border/60 pt-10">
        <h2 className="text-xl font-semibold tracking-tight">FAQ</h2>
        <dl className="divide-y divide-border/60 rounded-2xl border border-border/70">
          {hub.faqs.map((faq) => (
            <div key={faq.question} className="px-4 py-4 sm:px-5">
              <dt className="text-sm font-semibold">{faq.question}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-12 space-y-3 rounded-2xl border border-primary/20 bg-primary/[0.06] px-5 py-6 text-center sm:px-8">
        <LandingStartCta size="lg" className="h-12 w-full gap-2 px-6 text-base sm:w-auto">
          {chrome.ctaPhoto}
          <ArrowRight className="size-4" aria-hidden />
        </LandingStartCta>
        <p className="text-xs text-muted-foreground">{chrome.ctaHint}</p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{chrome.disclaimer}</p>
        <p className="pt-1">
          <Link
            href="/guides"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {chrome.breadcrumbGuides}
          </Link>
        </p>
      </div>
    </div>
  );
}
