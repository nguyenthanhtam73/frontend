import { daDau } from "./articles/da-dau";
import { daDauVanPhong } from "./articles/da-dau-van-phong";
import { kemChongNang } from "./articles/kem-chong-nang";
import { mun } from "./articles/mun";
import { routineChamDa } from "./articles/routine-cham-da";
import { thamMun } from "./articles/tham-mun";
import type {
  GuideArticle,
  GuideArticleCopy,
  GuideChrome,
  GuideLocale,
  GuideSlug,
} from "./types";
import { GUIDE_SLUGS } from "./types";

export type {
  GuideArticle,
  GuideArticleCopy,
  GuideChrome,
  GuideFaq,
  GuideLocale,
  GuideOgImage,
  GuideSection,
  GuideSlug,
  GuideSubsection,
} from "./types";
export { GUIDE_SLUGS } from "./types";

const CHROME: Record<GuideLocale, GuideChrome> = {
  vi: {
    indexTitle: "Hướng dẫn chăm da nóng ẩm · DaDiary",
    indexDescription:
      "Sáu guide cho da dầu, mụn, thâm, kem chống nắng, routine người mới và ngày văn phòng máy lạnh — rồi chụp ảnh để nhận routine khởi đầu từ AI Coach.",
    indexHeading: "Hướng dẫn chăm da cho khí hậu nóng ẩm",
    indexSub:
      "Sáu bài cho da Việt: da dầu, mụn, thâm, SPF, routine ngắn, và ngày máy lạnh. Đọc xong, chụp một ảnh để nhận routine khởi đầu — đăng ký sau khi thấy gợi ý.",
    ctaPhoto: "Chụp ảnh nhận routine",
    ctaHint: "Không cần tạo tài khoản trước. Xem routine rồi hãy lưu.",
    relatedHeading: "Đọc tiếp",
    disclaimer:
      "DaDiary đưa gợi ý tham khảo, không thay thế bác sĩ da liễu. Da đau, mủ, sưng lan — đi khám.",
    readGuide: "Đọc bài",
    updatedLabel: "Cập nhật",
    breadcrumbHome: "Trang chủ",
    breadcrumbGuides: "Hướng dẫn",
  },
  en: {
    indexTitle: "Humid-heat skincare guides · DaDiary",
    indexDescription:
      "Six guides on oily skin, acne, marks, sunscreen, beginner routines, and air-con office days — then take a photo for a starter routine from the AI Coach.",
    indexHeading: "Skincare guides for humid heat",
    indexSub:
      "Six reads for Vietnamese-climate skin: oil, acne, marks, SPF, a short routine, and office air-con. Then take one photo for a starter routine — sign up after you see it.",
    ctaPhoto: "Take a photo, get a routine",
    ctaHint: "No account needed first. See the routine, then save it.",
    relatedHeading: "Keep reading",
    disclaimer:
      "DaDiary offers reference tips, not a dermatologist visit. Pain, pus, spreading swelling — see a clinician.",
    readGuide: "Read guide",
    updatedLabel: "Updated",
    breadcrumbHome: "Home",
    breadcrumbGuides: "Guides",
  },
};

const ARTICLES: Record<GuideSlug, Record<GuideLocale, GuideArticleCopy>> = {
  "da-dau": daDau,
  mun,
  "kem-chong-nang": kemChongNang,
  "routine-cham-da": routineChamDa,
  "tham-mun": thamMun,
  "da-dau-van-phong": daDauVanPhong,
};

/** First public ship of the four pillar guides. */
export const GUIDE_PILLAR_PUBLISHED = "2026-08-16";
/** This content expansion + two new high-intent URLs. */
export const GUIDE_CONTENT_EXPANDED = "2026-09-05";

const DATES: Record<GuideSlug, { datePublished: string; dateModified: string }> = {
  "da-dau": { datePublished: GUIDE_PILLAR_PUBLISHED, dateModified: GUIDE_CONTENT_EXPANDED },
  mun: { datePublished: GUIDE_PILLAR_PUBLISHED, dateModified: GUIDE_CONTENT_EXPANDED },
  "kem-chong-nang": {
    datePublished: GUIDE_PILLAR_PUBLISHED,
    dateModified: GUIDE_CONTENT_EXPANDED,
  },
  "routine-cham-da": {
    datePublished: GUIDE_PILLAR_PUBLISHED,
    dateModified: GUIDE_CONTENT_EXPANDED,
  },
  "tham-mun": {
    datePublished: GUIDE_CONTENT_EXPANDED,
    dateModified: GUIDE_CONTENT_EXPANDED,
  },
  "da-dau-van-phong": {
    datePublished: GUIDE_CONTENT_EXPANDED,
    dateModified: GUIDE_CONTENT_EXPANDED,
  },
};

const RELATED: Record<GuideSlug, GuideSlug[]> = {
  "da-dau": ["da-dau-van-phong", "mun", "kem-chong-nang"],
  mun: ["tham-mun", "da-dau", "kem-chong-nang"],
  "kem-chong-nang": ["tham-mun", "da-dau", "routine-cham-da"],
  "routine-cham-da": ["da-dau", "da-dau-van-phong", "kem-chong-nang"],
  "tham-mun": ["mun", "kem-chong-nang", "routine-cham-da"],
  "da-dau-van-phong": ["da-dau", "routine-cham-da", "kem-chong-nang"],
};

export function isGuideSlug(value: string): value is GuideSlug {
  return (GUIDE_SLUGS as readonly string[]).includes(value);
}

export function guideChrome(locale: string): GuideChrome {
  return locale === "en" ? CHROME.en : CHROME.vi;
}

export function guideOgPath(slug: GuideSlug): string {
  return `/og/guides/${slug}.png`;
}

export function getGuideArticle(slug: GuideSlug, locale: string): GuideArticle {
  const loc: GuideLocale = locale === "en" ? "en" : "vi";
  const body = ARTICLES[slug][loc];
  return {
    slug,
    path: `/guides/${slug}`,
    related: RELATED[slug],
    ...DATES[slug],
    ogImage: {
      url: guideOgPath(slug),
      width: 1200,
      height: 630,
      alt: `${body.title} · DaDiary`,
    },
    ...body,
  };
}

export function listGuideArticles(locale: string): GuideArticle[] {
  return GUIDE_SLUGS.map((slug) => getGuideArticle(slug, locale));
}

export function guidePublicPaths(): string[] {
  return ["/guides", ...GUIDE_SLUGS.map((slug) => `/guides/${slug}`)];
}

export function formatGuideDate(isoDate: string, locale: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "vi-VN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
