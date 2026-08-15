import { ArrowRight } from "lucide-react";
import { getLocale } from "next-intl/server";

import { LandingStartCta } from "@/components/landing/landing-start-cta";
import { Link } from "@/i18n/navigation";
import {
  getGuideArticle,
  guideChrome,
  type GuideSlug,
} from "@/lib/guides/catalog";

export async function GuideArticleView({ slug }: { slug: GuideSlug }) {
  const locale = await getLocale();
  const article = getGuideArticle(slug, locale);
  const chrome = guideChrome(locale);

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
        {article.kicker}
      </p>
      <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        {article.title}
      </h1>
      <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
        {article.lede}
      </p>

      <div className="mt-8 space-y-3 rounded-2xl border border-primary/25 bg-primary/[0.07] px-4 py-5 sm:px-6">
        <LandingStartCta size="lg" className="h-12 w-full gap-2 text-base sm:w-auto">
          {chrome.ctaPhoto}
          <ArrowRight className="size-4" aria-hidden />
        </LandingStartCta>
        <p className="text-xs leading-relaxed text-muted-foreground">{chrome.ctaHint}</p>
      </div>

      <div className="mt-10 space-y-10">
        {article.sections.map((section) => (
          <section key={section.heading} className="space-y-3">
            <h2 className="text-xl font-semibold tracking-tight">{section.heading}</h2>
            {section.paragraphs.map((p, i) => (
              <p key={i} className="text-sm leading-relaxed text-foreground/90 sm:text-base">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>

      <section className="mt-12 space-y-4 border-t border-border/60 pt-10">
        <h2 className="text-xl font-semibold tracking-tight">FAQ</h2>
        <dl className="divide-y divide-border/60 rounded-2xl border border-border/70">
          {article.faqs.map((faq) => (
            <div key={faq.question} className="px-4 py-4 sm:px-5">
              <dt className="text-sm font-semibold">{faq.question}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {faq.answer}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-10 space-y-3 rounded-2xl border border-primary/25 bg-primary/[0.07] px-4 py-6 text-center sm:px-6">
        <LandingStartCta size="lg" className="h-12 w-full gap-2 px-6 text-base sm:w-auto">
          {chrome.ctaPhoto}
          <ArrowRight className="size-4" aria-hidden />
        </LandingStartCta>
        <p className="text-xs text-muted-foreground">{chrome.ctaHint}</p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{chrome.disclaimer}</p>
      </div>

      <nav className="mt-12 border-t border-border/60 pt-8" aria-label={chrome.relatedHeading}>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {chrome.relatedHeading}
        </p>
        <ul className="mt-3 space-y-2">
          {article.related.map((relatedSlug) => {
            const related = getGuideArticle(relatedSlug, locale);
            return (
              <li key={related.slug}>
                <Link
                  href={related.path}
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  {related.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </article>
  );
}
