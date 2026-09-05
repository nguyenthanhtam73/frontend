import { daDau } from "./articles/da-dau";
import { daDauVanPhong } from "./articles/da-dau-van-phong";
import { daKho } from "./articles/da-kho";
import { daNhayCam } from "./articles/da-nhay-cam";
import { kemChongNang } from "./articles/kem-chong-nang";
import { mun } from "./articles/mun";
import { retinolChoNguoiMoi } from "./articles/retinol-cho-nguoi-moi";
import { routineChamDa } from "./articles/routine-cham-da";
import { thamMun } from "./articles/tham-mun";
import type {
  GuideArticle,
  GuideArticleCopy,
  GuideChrome,
  GuideLocale,
  GuideSlug,
} from "./types";
import { GUIDE_CLIMATE_HUB_PATH, GUIDE_SLUGS } from "./types";

export type {
  GuideArticle,
  GuideArticleCopy,
  GuideChrome,
  GuideClusterDef,
  GuideClusterId,
  GuideDoAvoid,
  GuideFaq,
  GuideFigure,
  GuideLocale,
  GuideOgImage,
  GuideSection,
  GuideSlug,
  GuideSubsection,
} from "./types";
export {
  GUIDE_CLIMATE_HUB_PATH,
  GUIDE_CLIMATE_HUB_SLUG,
  GUIDE_CLUSTERS,
  GUIDE_SLUGS,
} from "./types";

const CHROME: Record<GuideLocale, GuideChrome> = {
  vi: {
    indexTitle: "Hướng dẫn chăm da nóng ẩm · DaDiary",
    indexDescription:
      "Chín bài cho da dầu, da khô, da nhạy, mụn, thâm, SPF, routine người mới, retinol chậm, và ngày văn phòng máy lạnh — rồi chụp ảnh để nhận routine khởi đầu từ AI Coach.",
    indexHeading: "Hướng dẫn chăm da cho khí hậu nóng ẩm",
    indexSub:
      "Chín bài cho da Việt: dầu, khô, nhạy cảm, mụn, thâm, SPF, routine ngắn, retinol người mới, và ngày máy lạnh. Đọc xong, chụp một ảnh để nhận routine khởi đầu — đăng ký sau khi thấy gợi ý.",
    ctaPhoto: "Chụp ảnh nhận routine",
    ctaHint: "Không cần tạo tài khoản trước. Xem routine rồi hãy lưu.",
    relatedHeading: "Đọc tiếp",
    disclaimer:
      "DaDiary đưa gợi ý tham khảo, không thay thế bác sĩ da liễu. Da đau, mủ, sưng lan — đi khám.",
    readGuide: "Đọc bài",
    updatedLabel: "Cập nhật",
    breadcrumbHome: "Trang chủ",
    breadcrumbGuides: "Hướng dẫn",
    breadcrumbHub: "Da nóng ẩm",
    climateHubLabel: "Da nóng ẩm Việt Nam",
    doLabel: "Nên làm",
    avoidLabel: "Nên tránh",
  },
  en: {
    indexTitle: "Humid-heat skincare guides · DaDiary",
    indexDescription:
      "Nine guides on oily, dry, and sensitive skin, acne, marks, sunscreen, beginner routines, slow retinol, and air-con office days — then take a photo for a starter routine from the AI Coach.",
    indexHeading: "Skincare guides for humid heat",
    indexSub:
      "Nine reads for Vietnamese-climate skin: oil, dry, sensitive, acne, marks, SPF, a short routine, beginner retinol, and office air-con. Then take one photo for a starter routine — sign up after you see it.",
    ctaPhoto: "Take a photo, get a routine",
    ctaHint: "No account needed first. See the routine, then save it.",
    relatedHeading: "Keep reading",
    disclaimer:
      "DaDiary offers reference tips, not a dermatologist visit. Pain, pus, spreading swelling — see a clinician.",
    readGuide: "Read guide",
    updatedLabel: "Updated",
    breadcrumbHome: "Home",
    breadcrumbGuides: "Guides",
    breadcrumbHub: "Humid heat",
    climateHubLabel: "Humid-heat skin in Vietnam",
    doLabel: "Do this",
    avoidLabel: "Skip this",
  },
};

const ARTICLES: Record<GuideSlug, Record<GuideLocale, GuideArticleCopy>> = {
  "da-dau": daDau,
  mun,
  "kem-chong-nang": kemChongNang,
  "routine-cham-da": routineChamDa,
  "tham-mun": thamMun,
  "da-dau-van-phong": daDauVanPhong,
  "da-kho": daKho,
  "da-nhay-cam": daNhayCam,
  "retinol-cho-nguoi-moi": retinolChoNguoiMoi,
};

/** First public ship of the four pillar guides. */
export const GUIDE_PILLAR_PUBLISHED = "2026-08-16";
/** Content expansion + two high-intent URLs (wave 1). */
export const GUIDE_CONTENT_EXPANDED = "2026-09-05";
/** Dry, sensitive, and beginner-retinol URLs (wave 2). */
export const GUIDE_WAVE2_PUBLISHED = "2026-09-05";

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
  "da-kho": {
    datePublished: GUIDE_WAVE2_PUBLISHED,
    dateModified: GUIDE_WAVE2_PUBLISHED,
  },
  "da-nhay-cam": {
    datePublished: GUIDE_WAVE2_PUBLISHED,
    dateModified: GUIDE_WAVE2_PUBLISHED,
  },
  "retinol-cho-nguoi-moi": {
    datePublished: GUIDE_WAVE2_PUBLISHED,
    dateModified: GUIDE_WAVE2_PUBLISHED,
  },
};

const RELATED: Record<GuideSlug, GuideSlug[]> = {
  "da-dau": ["da-dau-van-phong", "kem-chong-nang", "mun"],
  mun: ["tham-mun", "da-dau", "da-nhay-cam"],
  "kem-chong-nang": ["tham-mun", "da-dau", "da-dau-van-phong"],
  "routine-cham-da": ["kem-chong-nang", "da-dau", "retinol-cho-nguoi-moi"],
  "tham-mun": ["mun", "kem-chong-nang", "retinol-cho-nguoi-moi"],
  "da-dau-van-phong": ["da-dau", "kem-chong-nang", "da-kho"],
  "da-kho": ["da-dau-van-phong", "routine-cham-da", "da-nhay-cam"],
  "da-nhay-cam": ["da-kho", "mun", "retinol-cho-nguoi-moi"],
  "retinol-cho-nguoi-moi": ["routine-cham-da", "da-nhay-cam", "tham-mun"],
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
  return ["/guides", GUIDE_CLIMATE_HUB_PATH, ...GUIDE_SLUGS.map((slug) => `/guides/${slug}`)];
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
