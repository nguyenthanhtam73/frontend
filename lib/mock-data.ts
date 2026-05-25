/**
 * Mock data for DaDiary marketing, progress, and check-in demos.
 *
 * Each entry holds VI + EN strings under `i18n` so the UI can pick a locale
 * without showing Vietnamese strings on the English landing page (and vice
 * versa). Use {@link localizeMockSkinCheck} on the consumer side.
 */

export type MockLocale = "vi" | "en";

export interface MockSkinCheckI18n {
  title: string;
  note: string;
  tags: string[];
  focus: string;
  coachTip?: string;
  productGap?: string | null;
}

export interface MockSkinCheckSource {
  id: string;
  user: { name: string; handle: string };
  gradient: { from: string; to: string };
  likes: number;
  dislikes: number;
  reaction?: "like" | "dislike" | null;
  createdAt: string;
  i18n: Record<MockLocale, MockSkinCheckI18n>;
}

/** Resolved view used by `SkinCheckCard`. */
export interface MockSkinCheck extends MockSkinCheckI18n {
  id: string;
  user: { name: string; handle: string };
  gradient: { from: string; to: string };
  likes: number;
  dislikes: number;
  reaction?: "like" | "dislike" | null;
  createdAt: string;
}

export const mockSkinChecks: MockSkinCheckSource[] = [
  {
    id: "s-1",
    user: { name: "Lan Anh", handle: "lan.skincare" },
    gradient: { from: "0.88 0.04 200", to: "0.72 0.08 210" },
    likes: 89,
    dislikes: 2,
    reaction: null,
    createdAt: "2026-05-04",
    i18n: {
      vi: {
        title: "Tuần 2 — retinol buổi tối",
        note: "Da hơi căng buổi sáng, không đỏ. Kem chống nắng buổi sáng đủ 2 lớp.",
        tags: ["da hỗn hợp", "ẩm nóng", "kem chống nắng"],
        focus: "Lớp bảo vệ da ổn",
        coachTip:
          "Chăm da gọn mà có lớp cấp ẩm — có thể thêm kem dưỡng hơi dày hơn sau retinol nếu da căng.",
        productGap: "Kem phục hồi có ceramide (làm dịu lớp bảo vệ da)",
      },
      en: {
        title: "Week 2 — evening retinol",
        note: "Skin feels a touch tight in the morning, no redness. Two layers of SPF on AM.",
        tags: ["combo", "humidity", "SPF"],
        focus: "Stable barrier",
        coachTip:
          "Lean routine with hydration in place — you can layer a thicker moisturizer after retinol if it tightens.",
        productGap: "Ceramide barrier cream",
      },
    },
  },
  {
    id: "s-2",
    user: { name: "Minh Đức", handle: "md_skin" },
    gradient: { from: "0.75 0.1 280", to: "0.55 0.12 275" },
    likes: 54,
    dislikes: 4,
    reaction: "like",
    createdAt: "2026-05-04",
    i18n: {
      vi: {
        title: "Sáng — chỉ rửa mặt + toner + kem chống nắng",
        note: "Nổi thêm 1 mụn nhỏ ở cằm, không châm chích.",
        tags: ["da hơi dầu", "mụn nhẹ"],
        focus: "Kiểm soát dầu",
        coachTip: "Buổi sáng đủ tối giản — bạn có thể thử BHA (tẩy da chết hoá học) buổi tối 2–3 lần/tuần thay vì hằng ngày.",
        productGap: "Toner cân bằng, không cồn",
      },
      en: {
        title: "AM — cleanser + toner + SPF only",
        note: "One tiny chin breakout, no stinging.",
        tags: ["light oil", "mild acne"],
        focus: "Oil control",
        coachTip: "AM is nicely lean — try BHA 2–3 nights a week instead of daily.",
        productGap: "Alcohol-free balancing toner",
      },
    },
  },
  {
    id: "s-3",
    user: { name: "Thu Hà", handle: "hathu" },
    gradient: { from: "0.82 0.06 330", to: "0.68 0.09 20" },
    likes: 120,
    dislikes: 1,
    reaction: null,
    createdAt: "2026-05-03",
    i18n: {
      vi: {
        title: "Da khô mùa máy lạnh",
        note: "Đắp mặt nạ giấy 2 lần/tuần, da đỡ bong.",
        tags: ["da khô", "thiếu nước"],
        focus: "Cấp ẩm",
        coachTip: "Mặt nạ giấy ổn — thêm squalane hoặc dầu nhẹ vào buổi tối nếu da vẫn ráp buổi sáng.",
        productGap: "Serum HA (cấp nước theo lớp)",
      },
      en: {
        title: "Dry skin in AC season",
        note: "Sheet mask twice a week — fewer flakes.",
        tags: ["dry", "dehydrated"],
        focus: "Hydration",
        coachTip: "Mask routine working — add squalane or a light oil PM if mornings still feel rough.",
        productGap: "HA layering serum",
      },
    },
  },
  {
    id: "s-4",
    user: { name: "Kiên", handle: "kienlab" },
    gradient: { from: "0.7 0.08 150", to: "0.5 0.1 200" },
    likes: 41,
    dislikes: 3,
    reaction: null,
    createdAt: "2026-05-02",
    i18n: {
      vi: {
        title: "Sau glycolic — không bong tróc",
        note: "Chỉ hơi châm ở má — đã bôi kem dưỡng dày.",
        tags: ["tẩy da chết", "da nhạy cảm"],
        focus: "Cần theo dõi",
        coachTip: "Giảm tần suất tẩy da chết 1 bước; ưu tiên phục hồi 3–5 ngày.",
        productGap: "Kem làm dịu chứa panthenol",
      },
      en: {
        title: "After glycolic — no flaking",
        note: "Slight tingle on cheeks — layered moisturizer thickly.",
        tags: ["exfoliant", "sensitive"],
        focus: "Watch closely",
        coachTip: "Step acids back one notch; prioritize repair for 3–5 days.",
        productGap: "Panthenol soothing cream",
      },
    },
  },
  {
    id: "s-5",
    user: { name: "Mai", handle: "mai.rosy" },
    gradient: { from: "0.9 0.05 340", to: "0.78 0.06 25" },
    likes: 210,
    dislikes: 0,
    reaction: null,
    createdAt: "2026-05-02",
    i18n: {
      vi: {
        title: "Ảnh cùng góc — so với tuần 1",
        note: "Da sáng hơn một chút, lỗ chân lông ít bóng hơn.",
        tags: ["tiến bộ", "niacinamide"],
        focus: "Đang tiến bộ",
        coachTip: "Cùng điều kiện ánh sáng → so sánh trước–sau tin được hơn. Cứ duy trì kem chống nắng nhé!",
        productGap: null,
      },
      en: {
        title: "Same angle — vs week 1",
        note: "Slightly brighter, pores less shiny.",
        tags: ["progress", "niacinamide"],
        focus: "Progressing",
        coachTip: "Matching lighting → before/after comparison feels honest. Keep SPF going!",
        productGap: null,
      },
    },
  },
  {
    id: "s-6",
    user: { name: "An", handle: "anmin" },
    gradient: { from: "0.45 0.06 250", to: "0.3 0.05 260" },
    likes: 67,
    dislikes: 5,
    reaction: "dislike",
    createdAt: "2026-05-01",
    i18n: {
      vi: {
        title: "Tối — rửa mặt 2 bước",
        note: "Da mệt sau khi tập, chỉ đơn giản hoá các bước chăm da.",
        tags: ["sau tập", "dễ kích ứng"],
        focus: "Làm sạch dịu",
        coachTip: "Rửa mặt 2 bước đúng hướng — tránh chất tẩy mạnh sau khi da đỏ nhẹ nhé.",
        productGap: "Sữa rửa mặt dịu (pH thấp)",
      },
      en: {
        title: "PM — double cleanse",
        note: "Tired skin after the gym, simplified the routine.",
        tags: ["post-workout", "reactive"],
        focus: "Gentle cleansing",
        coachTip: "Double cleanse on point — skip strong SLS after redness episodes.",
        productGap: "Low-pH cleanser",
      },
    },
  },
];

/** Pick the right copy for the current locale; defaults to vi when unknown. */
export function localizeMockSkinCheck(
  src: MockSkinCheckSource,
  locale: MockLocale | string,
): MockSkinCheck {
  const lang: MockLocale = locale === "en" ? "en" : "vi";
  const t = src.i18n[lang] ?? src.i18n.vi;
  return {
    id: src.id,
    user: src.user,
    gradient: src.gradient,
    likes: src.likes,
    dislikes: src.dislikes,
    reaction: src.reaction,
    createdAt: src.createdAt,
    title: t.title,
    note: t.note,
    tags: t.tags,
    focus: t.focus,
    coachTip: t.coachTip,
    productGap: t.productGap ?? null,
  };
}
