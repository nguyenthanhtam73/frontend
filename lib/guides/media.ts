import type { GuideFigure, GuideLocale } from "./types";

export const GUIDE_FIGURE_SIZE = { width: 1280, height: 853 } as const;

export function figure(
  src: string,
  copy: Record<GuideLocale, { alt: string; caption?: string }>,
  locale: GuideLocale,
): GuideFigure {
  return {
    src,
    width: GUIDE_FIGURE_SIZE.width,
    height: GUIDE_FIGURE_SIZE.height,
    alt: copy[locale].alt,
    caption: copy[locale].caption,
  };
}
