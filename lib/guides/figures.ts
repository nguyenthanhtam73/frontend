import type { GuideArticleCopy, GuideFigure, GuideSection, GuideSubsection } from "./types";

function subsectionFigures(sub: GuideSubsection): GuideFigure[] {
  return sub.figure ? [sub.figure] : [];
}

function sectionFigures(section: GuideSection): GuideFigure[] {
  return [
    ...(section.figure ? [section.figure] : []),
    ...(section.subsections ?? []).flatMap(subsectionFigures),
  ];
}

/** In-article figures (hero + section art). OG card is separate. */
export function listGuideFigures(article: GuideArticleCopy): GuideFigure[] {
  return [
    ...(article.heroFigure ? [article.heroFigure] : []),
    ...article.sections.flatMap(sectionFigures),
  ];
}
