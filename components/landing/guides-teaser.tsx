import { ArrowRight } from "lucide-react";
import { getLocale } from "next-intl/server";

import { LandingStartCta } from "@/components/landing/landing-start-cta";
import { Link } from "@/i18n/navigation";
import { guideChrome, listGuideArticles } from "@/lib/guides/catalog";

export async function GuidesTeaser() {
  const locale = await getLocale();
  const chrome = guideChrome(locale);
  const articles = listGuideArticles(locale);

  return (
    <section
      id="guides"
      className="dd-anchor border-t border-border/60"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              {chrome.readGuide}
            </p>
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              {chrome.indexHeading}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              {chrome.indexSub}
            </p>
          </div>
          <Link
            href="/guides"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {chrome.readGuide}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {articles.map((article) => (
            <Link
              key={article.slug}
              href={article.path}
              className="group flex flex-col rounded-2xl border border-border/70 bg-card p-4 transition-colors hover:border-primary/35"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                {article.kicker}
              </p>
              <h3 className="mt-2 text-sm font-semibold leading-snug tracking-tight group-hover:text-primary">
                {article.title}
              </h3>
              <p className="mt-2 line-clamp-3 flex-1 text-xs leading-relaxed text-muted-foreground">
                {article.description}
              </p>
            </Link>
          ))}
        </div>

        <div className="mt-8 flex justify-center sm:justify-start">
          <LandingStartCta size="lg" className="h-12 w-full gap-2 px-6 text-base sm:w-auto">
            {chrome.ctaPhoto}
            <ArrowRight className="size-4" aria-hidden />
          </LandingStartCta>
        </div>
      </div>
    </section>
  );
}
