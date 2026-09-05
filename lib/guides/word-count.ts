import type { GuideArticleCopy, GuideSection, GuideSubsection } from "./types";

function subsectionWords(sub: GuideSubsection): string[] {
  return [
    sub.heading,
    ...sub.paragraphs,
    ...(sub.checklist ?? []),
    ...(sub.figure ? [sub.figure.alt, sub.figure.caption ?? ""] : []),
  ];
}

function sectionWords(section: GuideSection): string[] {
  return [
    section.heading,
    ...section.paragraphs,
    ...(section.checklist ?? []),
    ...(section.doAvoid
      ? [
          section.doAvoid.doHeading ?? "",
          ...section.doAvoid.doItems,
          section.doAvoid.avoidHeading ?? "",
          ...section.doAvoid.avoidItems,
        ]
      : []),
    ...(section.figure ? [section.figure.alt, section.figure.caption ?? ""] : []),
    ...(section.subsections ?? []).flatMap(subsectionWords),
  ];
}

/** Space-separated token count for catalog copy (vi and en). */
export function countGuideWords(article: GuideArticleCopy): number {
  const parts = [
    article.title,
    article.description,
    article.kicker,
    article.lede,
    ...(article.heroFigure
      ? [article.heroFigure.alt, article.heroFigure.caption ?? ""]
      : []),
    ...article.sections.flatMap(sectionWords),
    ...article.faqs.flatMap((faq) => [faq.question, faq.answer]),
  ];
  return parts.join(" ").split(/\s+/).filter(Boolean).length;
}
