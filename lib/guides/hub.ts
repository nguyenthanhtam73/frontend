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
      heading: "Mụn và thâm sau mụn",
      intro:
        "Nặn, chồng acid, và bỏ SPF làm mụn và thâm kéo dài hơn tip mới. Việc ít hại trước; bác sĩ khi đau, mủ, hoặc sẹo.",
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
      heading: "Acne and marks after acne",
      intro:
        "Picking, stacked acids, and skipped SPF keep spots and marks around longer than a new tip. Lower-harm moves first; a clinician for pain, pus, or scarring.",
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
    title: "Chăm da nóng ẩm Việt Nam: 9 guide + routine từ ảnh · DaDiary",
    description:
      "Nắng xe máy, mưa ẩm, máy lạnh một ngày. Chín guide theo loại da và việc hay gặp — rồi chụp ảnh nhận routine. DaDiary Beta: gợi ý, không chẩn bệnh.",
    heading: "Chăm da nóng ẩm ở Việt Nam",
    kicker: "Hub khí hậu",
    lede:
      "Bạn không cần 50 bài mỏng. Chín guide dưới đây gom việc hay gặp khi da sống nắng ẩm: dầu, khô, dễ đỏ, mụn, thâm, SPF, routine ngắn, retinol chậm, và ngày văn phòng. Đọc xong, chụp một ảnh để nhận routine khởi đầu — đăng ký sau khi thấy gợi ý. DaDiary đang Beta: tham khảo, không phải phòng khám.",
    climateHeading: "Một ngày có thể đủ ba khí hậu",
    climateParagraphs: [
      "Sáng: mũ, nắng, kem chống nắng. Trưa: vài phút ra đường. Chiều: máy lạnh, T-zone bóng hoặc má căng. Tối: muốn ‘tẩy sạch cả ngày’ nên rửa mạnh.",
      "Dầu không phải da bẩn. Khô không phải phải rửa đến kít. Đỏ không tự thành chẩn đoán. Mục tiêu chung: thói quen mỏng chịu được thứ Tư mệt, SPF còn đó, biết khi nào đi khám.",
      "Trang này không kê đơn, không hứa hết mụn hay hết thâm trong bảy ngày, không bịa review. Nếu da đau, có mủ, sưng lan — gặp bác sĩ, đừng thay bằng một hub.",
    ],
    howToPickHeading: "Nên mở guide nào trước",
    howToPickParagraphs: [
      "Chưa có routine: bắt đầu bài 3–4 bước, rồi kem chống nắng. Đang bóng T-zone: da dầu hoặc da dầu văn phòng. Má căng, nẻ khóe: da khô. Dễ rát sau chai mới: da nhạy cảm — lùi hoạt chất.",
      "Mụn đang viêm hoặc hay nặn: bài mụn trước bài thâm. Muốn thử retinol: chỉ sau khi rửa–dưỡng–SPF đã giữ được, và da không đang nẻ.",
    ],
    faqs: [
      {
        question: "Da nóng ẩm ở Việt Nam có cần routine khác nước ôn đới không?",
        answer:
          "Thường cần mỏng hơn, chịu mồ hôi và máy lạnh trong cùng một ngày. SPF buổi sáng vẫn cần. Cream đặc cả mặt lúc 7 giờ hay bí lúc 11. Không có ‘routine chuẩn quốc gia’ — chỉ có thói quen bạn giữ được.",
      },
      {
        question: "Chín bài này có chẩn loại da giúp tôi không?",
        answer:
          "Không. Chúng mô tả việc ít hại và khi nào nên gặp bác sĩ. Nhãn ‘da dầu’ trên mạng không thay khám. DaDiary Beta đưa gợi ý từ ảnh sau khi bạn chụp — vẫn không phải chẩn đoán.",
      },
      {
        question: "Tôi phải đọc hết rồi mới được chụp ảnh?",
        answer:
          "Không. Hub này để bạn chọn đúng bài. Ảnh một góc, ánh sáng giống nhau nếu được, đủ để nhận routine khởi đầu. Xem gợi ý rồi hãy lưu tài khoản.",
      },
    ],
  },
  en: {
    title: "Humid-heat skincare in Vietnam: 9 guides + a photo routine · DaDiary",
    description:
      "Motorbike sun, humid rain, air-con in one day. Nine guides by skin type and common jobs — then a photo for a starter routine. DaDiary Beta: tips, not a diagnosis.",
    heading: "Skincare for humid heat in Vietnam",
    kicker: "Climate hub",
    lede:
      "You do not need fifty thin posts. These nine guides cover what humid-heat skin actually meets: oil, dry, easy flush, acne, marks, SPF, a short routine, slow retinol, and office air-con. Then take one photo for a starter routine — sign up after you see it. DaDiary is in Beta: reference tips, not a clinic.",
    climateHeading: "One day can hold three climates",
    climateParagraphs: [
      "Morning: a helmet, sun, sunscreen. Midday: a few minutes outside. Afternoon: air-con, a shiny T-zone or tight cheeks. Night: the urge to punish-wash the whole day off.",
      "Oil is not dirt. Dry is not a reason to wash until it squeaks. Redness is not a diagnosis. The shared aim: a thin habit that survives a tired Wednesday, SPF still on, and a clear line for when to see a clinician.",
      "This page does not prescribe, does not promise clear skin or faded marks in seven days, and does not invent reviews. Pain, pus, spreading swelling — see a clinician. A hub is not a substitute.",
    ],
    howToPickHeading: "Which guide to open first",
    howToPickParagraphs: [
      "No routine yet: start with the 3–4 step page, then sunscreen. Shiny T-zone: oily skin or the office oily-skin page. Tight cheeks, cracked corners: dry skin. Sting after a new bottle: sensitive skin — pause actives.",
      "Inflamed spots or a picking habit: the acne page before the marks page. Want retinol: only after cleanse–moisturize–SPF already sticks, and skin is not cracked.",
    ],
    faqs: [
      {
        question: "Does Vietnamese humid heat need a different routine than a temperate climate?",
        answer:
          "Usually a thinner one that can survive sweat and air-con in the same day. Morning SPF still matters. A heavy cream at 7 a.m. often feels wrong by 11. There is no official national routine — only a habit you can keep.",
      },
      {
        question: "Do these nine pages diagnose my skin type?",
        answer:
          "No. They describe lower-harm moves and when to see a clinician. An ‘oily’ label in a comment is not a visit. DaDiary Beta can suggest from a photo after you take one — still not a diagnosis.",
      },
      {
        question: "Do I have to read every guide before I take a photo?",
        answer:
          "No. This hub is so you can pick the right page. One angle, similar light if you can, is enough for a starter routine. See the suggestion, then save an account.",
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
    dateModified: GUIDE_CLIMATE_HUB_PUBLISHED,
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
