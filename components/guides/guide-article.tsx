import { ArrowRight, CircleAlert, CircleCheck } from "lucide-react";
import Image from "next/image";
import { getLocale } from "next-intl/server";

import { LandingStartCta } from "@/components/landing/landing-start-cta";
import { Link } from "@/i18n/navigation";
import {
  formatGuideDate,
  getGuideArticle,
  guideChrome,
  type GuideChrome,
  type GuideDoAvoid,
  type GuideFigure,
  type GuideSection,
  type GuideSlug,
  type GuideSubsection,
} from "@/lib/guides/catalog";

function GuideFigureBlock({ figure }: { figure: GuideFigure }) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-border/60 bg-muted/20">
      <Image
        src={figure.src}
        alt={figure.alt}
        width={figure.width}
        height={figure.height}
        className="h-auto w-full"
        sizes="(min-width: 768px) 720px, 100vw"
      />
      {figure.caption ? (
        <figcaption className="px-4 py-3 text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {figure.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

function GuideChecklist({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 rounded-2xl border border-border/70 bg-card px-4 py-4 sm:px-5">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-foreground/90 sm:text-base">
          <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function GuideDoAvoidBlock({
  box,
  chrome,
}: {
  box: GuideDoAvoid;
  chrome: GuideChrome;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-primary/25 bg-primary/[0.06] px-4 py-4">
        <p className="text-sm font-semibold text-primary">{box.doHeading ?? chrome.doLabel}</p>
        <ul className="mt-3 space-y-2">
          {box.doItems.map((item) => (
            <li key={item} className="flex gap-2 text-sm leading-relaxed">
              <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl border border-rose-300/50 bg-rose-50/70 px-4 py-4 dark:border-rose-400/25 dark:bg-rose-950/30">
        <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">
          {box.avoidHeading ?? chrome.avoidLabel}
        </p>
        <ul className="mt-3 space-y-2">
          {box.avoidItems.map((item) => (
            <li key={item} className="flex gap-2 text-sm leading-relaxed">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-rose-600 dark:text-rose-300" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function GuideSubsectionBlock({ subsection }: { subsection: GuideSubsection }) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold tracking-tight">{subsection.heading}</h3>
      {subsection.paragraphs.map((p) => (
        <p key={p} className="text-sm leading-relaxed text-foreground/90 sm:text-base">
          {p}
        </p>
      ))}
      {subsection.checklist ? <GuideChecklist items={subsection.checklist} /> : null}
      {subsection.figure ? <GuideFigureBlock figure={subsection.figure} /> : null}
    </div>
  );
}

function GuideSectionBlock({
  section,
  chrome,
}: {
  section: GuideSection;
  chrome: GuideChrome;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">{section.heading}</h2>
      {section.paragraphs.map((p) => (
        <p key={p} className="text-sm leading-relaxed text-foreground/90 sm:text-base">
          {p}
        </p>
      ))}
      {section.figure ? <GuideFigureBlock figure={section.figure} /> : null}
      {section.checklist ? <GuideChecklist items={section.checklist} /> : null}
      {section.doAvoid ? <GuideDoAvoidBlock box={section.doAvoid} chrome={chrome} /> : null}
      {section.subsections?.map((subsection) => (
        <GuideSubsectionBlock key={subsection.heading} subsection={subsection} />
      ))}
    </section>
  );
}

export async function GuideArticleView({ slug }: { slug: GuideSlug }) {
  const locale = await getLocale();
  const article = getGuideArticle(slug, locale);
  const chrome = guideChrome(locale);
  const updated = formatGuideDate(article.dateModified, locale);

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-muted-foreground">
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
          <li className="text-foreground/80">{article.kicker}</li>
        </ol>
      </nav>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
        {article.kicker}
      </p>
      <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        {article.title}
      </h1>
      <p className="mt-3 text-xs text-muted-foreground">
        <time dateTime={article.dateModified}>
          {chrome.updatedLabel} {updated}
        </time>
      </p>
      <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
        {article.lede}
      </p>
      {article.heroFigure ? (
        <div className="mt-6">
          <GuideFigureBlock figure={article.heroFigure} />
        </div>
      ) : null}

      <div className="mt-8 space-y-3 rounded-2xl border border-primary/25 bg-primary/[0.07] px-4 py-5 sm:px-6">
        <LandingStartCta size="lg" className="h-12 w-full gap-2 text-base sm:w-auto">
          {chrome.ctaPhoto}
          <ArrowRight className="size-4" aria-hidden />
        </LandingStartCta>
        <p className="text-xs leading-relaxed text-muted-foreground">{chrome.ctaHint}</p>
      </div>

      <div className="mt-10 space-y-10">
        {article.sections.map((section) => (
          <GuideSectionBlock key={section.heading} section={section} chrome={chrome} />
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
