import { ArrowRight } from "lucide-react";
import { getLocale } from "next-intl/server";

import { LandingStartCta } from "@/components/landing/landing-start-cta";
import { Link } from "@/i18n/navigation";
import { guideChrome, listGuideArticles } from "@/lib/guides/catalog";

export async function GuidesIndexView() {
  const locale = await getLocale();
  const chrome = guideChrome(locale);
  const articles = listGuideArticles(locale);

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

      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {articles.map((article) => (
          <li key={article.slug}>
            <Link
              href={article.path}
              className="flex h-full flex-col rounded-2xl border border-border/70 bg-card/50 p-5 transition-colors hover:border-primary/35 hover:bg-card"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                {article.kicker}
              </p>
              <h2 className="mt-2 text-lg font-semibold leading-snug tracking-tight">
                {article.title}
              </h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                {article.description}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                {chrome.readGuide}
                <ArrowRight className="size-4" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-12 space-y-3 rounded-2xl border border-primary/20 bg-primary/[0.06] px-5 py-6 text-center sm:px-8">
        <LandingStartCta size="lg" className="h-12 w-full gap-2 px-6 text-base sm:w-auto">
          {chrome.ctaPhoto}
          <ArrowRight className="size-4" aria-hidden />
        </LandingStartCta>
        <p className="text-xs text-muted-foreground">{chrome.ctaHint}</p>
      </div>
    </div>
  );
}
