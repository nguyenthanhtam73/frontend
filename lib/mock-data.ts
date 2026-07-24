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
    user: { name: "Ngọc Anh", handle: "ngoc.skin" },
    gradient: { from: "0.88 0.04 200", to: "0.72 0.08 210" },
    likes: 89,
    dislikes: 2,
    reaction: null,
    createdAt: "2026-05-04",
    i18n: {
      vi: {
        title: "Tối — check-in sau làm việc",
        note: "Da hơi căng sau máy lạnh văn phòng. Đã tick routine tối, streak 7 ngày.",
        tags: ["da hỗn hợp", "streak", "kem chống nắng"],
        focus: "Giữ streak",
        coachTip:
          "Routine gọn đang ổn — nếu da còn căng, thêm lớp dưỡng sau serum trước khi ngủ.",
        productGap: "Kem phục hồi có ceramide",
      },
      en: {
        title: "PM — check-in after work",
        note: "A bit tight after office AC. PM routine ticked — 7-day streak.",
        tags: ["combo", "streak", "SPF"],
        focus: "Streak on",
        coachTip:
          "Lean routine is working — if it still feels tight, add a moisturizer layer after serum before bed.",
        productGap: "Ceramide barrier cream",
      },
    },
  },
  {
    id: "s-2",
    user: { name: "Phương Linh", handle: "linh.diary" },
    gradient: { from: "0.82 0.06 330", to: "0.68 0.09 20" },
    likes: 54,
    dislikes: 4,
    reaction: "like",
    createdAt: "2026-05-04",
    i18n: {
      vi: {
        title: "Sáng — rửa mặt + toner + kem chống nắng",
        note: "Một mụn nhỏ ở cằm, không châm. Đã lưu sữa rửa mặt vào tủ đồ.",
        tags: ["da hơi dầu", "mụn nhẹ", "tủ đồ"],
        focus: "Kiểm soát dầu",
        coachTip: "Buổi sáng đủ tối giản — BHA tối 2–3 lần/tuần thay vì mỗi ngày nếu da đang khô.",
        productGap: "Toner cân bằng, không cồn",
      },
      en: {
        title: "AM — cleanser + toner + SPF",
        note: "One tiny chin spot, no sting. Cleanser saved to shelf.",
        tags: ["light oil", "mild acne", "shelf"],
        focus: "Oil control",
        coachTip: "AM is nicely lean — try BHA 2–3 nights a week instead of daily if skin feels dry.",
        productGap: "Alcohol-free balancing toner",
      },
    },
  },
  {
    id: "s-3",
    user: { name: "Khánh Vy", handle: "vy.care" },
    gradient: { from: "0.75 0.08 175", to: "0.55 0.1 200" },
    likes: 120,
    dislikes: 1,
    reaction: null,
    createdAt: "2026-05-03",
    i18n: {
      vi: {
        title: "So với tuần trước — cùng góc",
        note: "Da đỡ bóng trưa hơn khi bỏ bước serum nặng. Coach nhắc giữ kem chống nắng.",
        tags: ["tiến bộ", "nóng ẩm", "AI coach"],
        focus: "Đang tiến bộ",
        coachTip: "Cùng góc + cùng ánh sáng giúp so sánh tin hơn. Cứ duy trì kem chống nắng nhé.",
        productGap: null,
      },
      en: {
        title: "Vs last week — same angle",
        note: "Less midday shine after dropping a heavy serum. Coach reminded SPF.",
        tags: ["progress", "humidity", "AI coach"],
        focus: "Progressing",
        coachTip: "Matching angle and light makes comparison honest. Keep SPF going.",
        productGap: null,
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
