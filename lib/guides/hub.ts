import { getGuideArticle } from "./catalog";
import type {
  GuideArticle,
  GuideClusterId,
  GuideFaq,
  GuideLocale,
  GuideOgImage,
  GuideSlug,
} from "./types";
import {
  GUIDE_CLIMATE_HUB_PATH,
  GUIDE_CLIMATE_HUB_SLUG,
  GUIDE_CLUSTERS,
} from "./types";

export {
  GUIDE_CLIMATE_HUB_PATH,
  GUIDE_CLIMATE_HUB_SLUG,
  GUIDE_CLUSTERS,
} from "./types";

/** Climate-intent hub — not a tenth article, a cluster landing for “da nóng ẩm Việt Nam”. */
export const GUIDE_CLIMATE_HUB_PUBLISHED = "2026-09-05";
export const GUIDE_CLIMATE_HUB_MODIFIED = "2026-09-06";

export type ClimateHubCluster = {
  id: GuideClusterId;
  heading: string;
  intro: string;
  articles: GuideArticle[];
};

export type ClimateHubCopy = {
  path: typeof GUIDE_CLIMATE_HUB_PATH;
  title: string;
  description: string;
  heading: string;
  kicker: string;
  lede: string;
  climateHeading: string;
  climateParagraphs: string[];
  howToPickHeading: string;
  howToPickParagraphs: string[];
  clusters: ClimateHubCluster[];
  faqs: GuideFaq[];
  datePublished: string;
  dateModified: string;
  ogImage: GuideOgImage;
};

type ClusterCopy = Record<GuideClusterId, { heading: string; intro: string }>;

const CLUSTER: Record<GuideLocale, ClusterCopy> = {
  vi: {
    skinTypes: {
      heading: "Loại da hay gặp ở khí hậu này",
      intro:
        "Dầu, khô, và dễ đỏ có thể sống cùng một ngày nắng–máy lạnh. Đọc theo cảm giác da tuần này, không theo nhãn trên mạng.",
    },
    concerns: {
      heading: "Mụn, thâm, nám, và kích ứng sau acid",
      intro:
        "Nặn, chồng acid, và bỏ SPF làm mụn và thâm kéo dài hơn tip mới. Bài dưới đây nói mụn ẩn, thâm khác nám, và khi da rát sau adapalene hoặc BHA. Việc ít hại trước; bác sĩ khi đau, mủ, hoặc sẹo.",
    },
    sunOffice: {
      heading: "Nắng, máy lạnh, ngày làm việc",
      intro:
        "Xe máy buổi sáng và điều hòa cả chiều là hai khí hậu. SPF đủ lượng; giữa giờ thấm, đừng rửa rồi bỏ trống.",
    },
    startHere: {
      heading: "Bắt đầu routine — retinol chỉ khi da đã êm",
      intro:
        "Ba–bốn bước giữ được thứ Tư mệt. Retinol kệ không phải đơn thuốc, và không phải bước đầu khi da đang rát.",
    },
  },
  en: {
    skinTypes: {
      heading: "Skin types this climate often shows",
      intro:
        "Oily, dry, and easily flushed skin can share one sun-then-air-con day. Read for how skin feels this week, not a label from a comment.",
    },
    concerns: {
      heading: "Acne, marks, melasma, and acid irritation",
      intro:
        "Picking, stacked acids, and skipped SPF keep spots and marks around longer than a new tip. These reads cover clogged pores, marks versus a wider patch people call melasma, and sting after adapalene or BHA. Lower-harm moves first; a clinician for pain, pus, or scarring.",
    },
    sunOffice: {
      heading: "Sun, air-con, workdays",
      intro:
        "A motorbike morning and an air-conditioned afternoon are two climates. Wear enough SPF; blot at midday instead of washing and going bare.",
    },
    startHere: {
      heading: "Start a routine — retinol only once skin is calm",
      intro:
        "Three or four steps that survive a tired Wednesday. Shelf retinol is not a prescription, and not step one on stinging skin.",
    },
  },
};

const HUB: Record<
  GuideLocale,
  Omit<ClimateHubCopy, "clusters" | "ogImage" | "path" | "datePublished" | "dateModified">
> = {
  vi: {
    title: "Chăm da nóng ẩm Việt Nam: đọc bài, rồi chụp ảnh nhận routine · DaDiary",
    description:
      "Nắng xe máy, mưa ẩm, máy lạnh trong một ngày. Bài theo loại da và việc hay gặp — mụn ẩn, thâm và nám, kích ứng sau adapalene hoặc BHA — rồi chụp ảnh nhận routine. DaDiary Beta: gợi ý, không chẩn bệnh.",
    heading: "Chăm da nóng ẩm ở Việt Nam",
    kicker: "Nắng ẩm Việt Nam",
    lede:
      "Da sống nắng ẩm hay gặp dầu, khô, dễ đỏ, mụn, thâm, hoặc rát sau chai mới. Các bài dưới đây nói từng việc: kem chống nắng, routine ngắn, retinol chậm, mụn ẩn, thâm khác nám, và khi hàng rào đang kêu. Đọc xong, chụp một ảnh để nhận routine khởi đầu. Đăng ký sau khi thấy gợi ý. DaDiary đang Beta: tham khảo, không phải phòng khám.",
    climateHeading: "Một ngày có thể đủ ba khí hậu",
    climateParagraphs: [
      "Sáng: mũ, nắng, kem chống nắng. Trưa: vài phút ra đường. Chiều: máy lạnh, T-zone bóng hoặc má căng. Tối: muốn ‘tẩy sạch cả ngày’ nên rửa mạnh.",
      "Dầu không phải da bẩn. Khô không phải phải rửa đến kít. Đỏ không tự thành chẩn đoán. Mục tiêu chung: thói quen ngắn chịu được thứ Tư mệt, SPF còn đó, biết khi nào đi khám.",
      "Trang này không kê đơn, không hứa hết mụn hay hết thâm trong bảy ngày, không bịa review. Nếu da đau, có mủ, sưng lan — gặp bác sĩ. Một trang hướng dẫn không thay được khám.",
    ],
    howToPickHeading: "Nên mở bài nào trước",
    howToPickParagraphs: [
      "Chưa có routine: bắt đầu bài 3–4 bước, rồi kem chống nắng. Đang bóng T-zone: da dầu hoặc da dầu văn phòng. Má căng, nẻ khóe: da khô. Dễ rát sau chai mới: da nhạy cảm — lùi hoạt chất.",
      "Mụn đang viêm hoặc hay nặn: bài mụn trước bài thâm. Hạt nhỏ, muốn BHA: bài mụn ẩn. Không chắc thâm hay nám: bài phân biệt, rồi SPF. Rát sau adapalene hoặc BHA: bài kích ứng trước khi mở lại acid. Muốn thử retinol: chỉ sau khi rửa–dưỡng–SPF đã giữ được, và da không đang nẻ.",
    ],
    faqs: [
      {
        question: "Da nóng ẩm ở Việt Nam có cần routine khác nước ôn đới không?",
        answer:
          "Thường cần mỏng hơn, chịu mồ hôi và máy lạnh trong cùng một ngày. SPF buổi sáng vẫn cần. Cream đặc cả mặt lúc 7 giờ hay bí lúc 11. Không có ‘routine chuẩn quốc gia’ — chỉ có thói quen bạn giữ được.",
      },
      {
        question: "Các bài này có chẩn loại da giúp tôi không?",
        answer:
          "Không. Chúng mô tả việc ít hại và khi nào nên gặp bác sĩ. Nhãn ‘da dầu’ hay ‘nám’ trên mạng không thay khám. DaDiary Beta đưa gợi ý từ ảnh sau khi bạn chụp — vẫn không phải chẩn đoán.",
      },
      {
        question: "Tôi phải đọc hết rồi mới được chụp ảnh?",
        answer:
          "Không. Trang này để bạn chọn đúng bài. Ảnh một góc, ánh sáng giống nhau nếu được, đủ để nhận routine khởi đầu. Xem gợi ý rồi hãy lưu tài khoản.",
      },
    ],
  },
  en: {
    title: "Humid-heat skincare in Vietnam: read a guide, then a photo routine · DaDiary",
    description:
      "Motorbike sun, humid rain, air-con in one day. Reads by skin type and common jobs — clogged pores, marks and melasma, irritation after adapalene or BHA — then a photo for a starter routine. DaDiary Beta: tips, not a diagnosis.",
    heading: "Skincare for humid heat in Vietnam",
    kicker: "Humid heat",
    lede:
      "Humid-heat skin often means oil, dryness, easy flush, acne, marks, or sting after a new bottle. These reads cover sunscreen, a short routine, slow retinol, clogged pores, marks versus a wider patch, and a paused barrier. Then take one photo for a starter routine. Sign up after you see it. DaDiary is in Beta: reference tips, not a clinic.",
    climateHeading: "One day can hold three climates",
    climateParagraphs: [
      "Morning: a helmet, sun, sunscreen. Midday: a few minutes outside. Afternoon: air-con, a shiny T-zone or tight cheeks. Night: the urge to punish-wash the whole day off.",
      "Oil is not dirt. Dry is not a reason to wash until it squeaks. Redness is not a diagnosis. The shared aim: a light habit that survives a tired Wednesday, SPF still on, and a clear line for when to see a clinician.",
      "This page does not prescribe, does not promise clear skin or faded marks in seven days, and does not invent reviews. Pain, pus, spreading swelling — see a clinician. This page is not a substitute.",
    ],
    howToPickHeading: "Which guide to open first",
    howToPickParagraphs: [
      "No routine yet: start with the 3–4 step page, then sunscreen. Shiny T-zone: oily skin or the office oily-skin page. Tight cheeks, cracked corners: dry skin. Sting after a new bottle: sensitive skin — pause actives.",
      "Inflamed spots or a picking habit: the acne page before the marks page. Small bumps, thinking about BHA: the clogged-pore page. Unsure if a mark or a wider patch: the cautious split, then SPF. Sting after adapalene or BHA: the irritation page before you reopen an acid. Want retinol: only after cleanse–moisturize–SPF already sticks, and skin is not cracked.",
    ],
    faqs: [
      {
        question: "Does Vietnamese humid heat need a different routine than a temperate climate?",
        answer:
          "Usually a thinner one that can survive sweat and air-con in the same day. Morning SPF still matters. A heavy cream at 7 a.m. often feels wrong by 11. There is no official national routine — only a habit you can keep.",
      },
      {
        question: "Do these pages diagnose my skin type?",
        answer:
          "No. They describe lower-harm moves and when to see a clinician. An ‘oily’ or ‘melasma’ label in a comment is not a visit. DaDiary Beta can suggest from a photo after you take one — still not a diagnosis.",
      },
      {
        question: "Do I have to read every guide before I take a photo?",
        answer:
          "No. This page is so you can pick the right read. One angle, similar light if you can, is enough for a starter routine. See the suggestion, then save an account.",
      },
    ],
  },
};

export function climateHubOgPath(): string {
  return `/og/guides/${GUIDE_CLIMATE_HUB_SLUG}.png`;
}

function buildClusters(locale: GuideLocale): ClimateHubCluster[] {
  const copy = CLUSTER[locale];
  return GUIDE_CLUSTERS.map((cluster) => ({
    id: cluster.id,
    heading: copy[cluster.id].heading,
    intro: copy[cluster.id].intro,
    articles: cluster.slugs.map((slug) => getGuideArticle(slug, locale)),
  }));
}

export function getClimateHub(locale: string): ClimateHubCopy {
  const loc: GuideLocale = locale === "en" ? "en" : "vi";
  const body = HUB[loc];
  return {
    path: GUIDE_CLIMATE_HUB_PATH,
    datePublished: GUIDE_CLIMATE_HUB_PUBLISHED,
    dateModified: GUIDE_CLIMATE_HUB_MODIFIED,
    ogImage: {
      url: climateHubOgPath(),
      width: 1200,
      height: 630,
      alt: `${body.heading} · DaDiary`,
    },
    ...body,
    clusters: buildClusters(loc),
  };
}

export function listGuideClusters(locale: string): ClimateHubCluster[] {
  return getClimateHub(locale).clusters;
}

/** Flat list in cluster order — useful for ItemList schema. */
export function listHubGuideArticles(locale: string): GuideArticle[] {
  return listGuideClusters(locale).flatMap((cluster) => cluster.articles);
}

export function clusteredSlugSet(): Set<GuideSlug> {
  return new Set(GUIDE_CLUSTERS.flatMap((cluster) => [...cluster.slugs]));
}
