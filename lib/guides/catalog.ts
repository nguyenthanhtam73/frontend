export const GUIDE_SLUGS = [
  "da-dau",
  "mun",
  "kem-chong-nang",
  "routine-cham-da",
] as const;

export type GuideSlug = (typeof GUIDE_SLUGS)[number];

export type GuideLocale = "vi" | "en";

export type GuideSection = {
  heading: string;
  paragraphs: string[];
};

export type GuideFaq = {
  question: string;
  answer: string;
};

export type GuideArticle = {
  slug: GuideSlug;
  path: string;
  title: string;
  description: string;
  kicker: string;
  lede: string;
  sections: GuideSection[];
  faqs: GuideFaq[];
  related: GuideSlug[];
};

export type GuideChrome = {
  indexTitle: string;
  indexDescription: string;
  indexHeading: string;
  indexSub: string;
  ctaPhoto: string;
  ctaHint: string;
  relatedHeading: string;
  disclaimer: string;
  readGuide: string;
};

const CHROME: Record<GuideLocale, GuideChrome> = {
  vi: {
    indexTitle: "Hướng dẫn chăm da · DaDiary",
    indexDescription:
      "Guide ngắn cho da dầu, mụn, kem chống nắng và routine — rồi chụp ảnh để nhận routine khởi đầu từ AI Coach.",
    indexHeading: "Hướng dẫn chăm da cho khí hậu nóng ẩm",
    indexSub:
      "Bốn bài ngắn, viết cho da Việt. Đọc xong, chụp một ảnh để nhận routine khởi đầu — đăng ký sau khi thấy gợi ý.",
    ctaPhoto: "Chụp ảnh nhận routine",
    ctaHint: "Không cần tạo tài khoản trước. Xem routine rồi hãy lưu.",
    relatedHeading: "Đọc tiếp",
    disclaimer:
      "DaDiary đưa gợi ý tham khảo, không thay thế bác sĩ da liễu. Da đau, mủ, sưng lan — đi khám.",
    readGuide: "Đọc bài",
  },
  en: {
    indexTitle: "Skincare guides · DaDiary",
    indexDescription:
      "Short guides on oily skin, acne, sunscreen, and routines — then take a photo to get a starter routine from the AI Coach.",
    indexHeading: "Skincare guides for humid heat",
    indexSub:
      "Four short reads for Vietnamese climate skin. Then take one photo for a starter routine — sign up after you see it.",
    ctaPhoto: "Take a photo, get a routine",
    ctaHint: "No account needed first. See the routine, then save it.",
    relatedHeading: "Keep reading",
    disclaimer:
      "DaDiary offers reference tips, not a dermatologist visit. Pain, pus, spreading swelling — see a clinician.",
    readGuide: "Read guide",
  },
};

const ARTICLES: Record<GuideSlug, Record<GuideLocale, Omit<GuideArticle, "slug" | "path" | "related">>> =
  {
    "da-dau": {
      vi: {
        title: "Routine da dầu nóng ẩm — bắt đầu từ đâu",
        description:
          "Da dầu ở Việt Nam hay bóng T-zone, lỗ chân lông to, dễ bí. Cách đơn giản: rửa dịu, dưỡng mỏng, kem chống nắng mỗi sáng — rồi chụp ảnh để nhận routine.",
        kicker: "Da dầu",
        lede:
          "Nóng ẩm làm tuyến dầu làm việc nhiều hơn. Nhiều người rửa mặt mạnh, bỏ dưỡng, rồi da vừa bóng vừa khô căng. Vòng đó làm mụn và thâm dễ kéo dài.",
        sections: [
          {
            heading: "Da dầu không có nghĩa là bỏ dưỡng",
            paragraphs: [
              "Dầu là phản ứng. Rửa quá mạnh hoặc bỏ hết kem dưỡng thường khiến da tiết dầu bù vào buổi chiều. Chọn sữa rửa mặt dịu, không cát, không ‘sạch bóng’.",
              "Dưỡng mỏng (gel / lotion) sau khi da còn hơi ẩm. Buổi sáng: kem chống nắng. Đó là nền, chưa cần 8 bước.",
            ],
          },
          {
            heading: "T-zone bóng, má bình thường — làm gì?",
            paragraphs: [
              "Da hỗn hợp rất phổ biến. Giữ bước rửa và chống nắng cho cả mặt. BHA (salicylic) nếu dùng thì bắt đầu 2–3 buổi tối/tuần trên vùng dầu, không thoa dày toàn mặt ngay.",
              "Đừng chồng nhiều acid cùng lúc với retinol khi mới bắt đầu. Một hoạt chất, vài tuần, rồi mới thêm.",
            ],
          },
          {
            heading: "Khi nào cần nhìn lại routine",
            paragraphs: [
              "Da châm chích kéo dài, bong tróc, hoặc mụn tăng sau khi thêm sản phẩm mạnh — lùi về rửa + dưỡng + SPF. Ảnh cùng góc mỗi ngày giúp bạn thấy dầu và mụn đổi theo tuần, không đoán mò.",
            ],
          },
        ],
        faqs: [
          {
            question: "Da dầu có cần kem chống nắng không?",
            answer:
              "Có. Nắng và nóng ẩm làm thâm mụn lâu hết. Chọn kết cấu mỏng, kiềm dầu nếu da dễ bóng — quan trọng là thoa đều mỗi sáng.",
          },
          {
            question: "Rửa mặt mấy lần một ngày?",
            answer:
              "Thường sáng và tối. Rửa thêm giữa ngày chỉ khi đổ mồ hôi nhiều; rửa quá sẽ kích thích dầu.",
          },
        ],
      },
      en: {
        title: "Oily skin in humid heat — where to start",
        description:
          "Oily skin in Vietnam often means a shiny T-zone and congested pores. Keep it simple: a gentle cleanse, a light moisturizer, morning SPF — then take a photo for a starter routine.",
        kicker: "Oily skin",
        lede:
          "Heat and humidity push oil glands harder. Harsh cleansing and skipping moisturizer often leave skin both shiny and tight. That loop makes breakouts and marks linger.",
        sections: [
          {
            heading: "Oily does not mean skip moisturizer",
            paragraphs: [
              "Oil is often a rebound. Over-washing or going moisturizer-free usually means more shine by afternoon. Use a gentle cleanser — no grit, no squeaky-clean finish.",
              "A thin gel or lotion on slightly damp skin, plus morning SPF, is the base. You do not need eight steps.",
            ],
          },
          {
            heading: "Shiny T-zone, calmer cheeks",
            paragraphs: [
              "Combination skin is common. Keep cleanser and SPF on the whole face. If you add BHA, start 2–3 evenings a week on oilier areas only.",
              "Do not stack several acids with retinol in week one. One active, a few weeks, then add.",
            ],
          },
          {
            heading: "When to simplify",
            paragraphs: [
              "Stinging that lasts, flaking, or a sudden breakout after a strong new product — go back to cleanse, moisturize, SPF. Same-angle photos make weekly oil and congestion easier to see.",
            ],
          },
        ],
        faqs: [
          {
            question: "Does oily skin still need sunscreen?",
            answer:
              "Yes. Sun and heat keep post-breakout marks around. Pick a thin, oil-control texture if you shine easily — daily even application matters more than the brand.",
          },
          {
            question: "How often should I wash my face?",
            answer:
              "Usually morning and night. Extra midday washes only after heavy sweat; over-washing often boosts oil.",
          },
        ],
      },
    },
    mun: {
      vi: {
        title: "Mụn ẩn, mụn viêm — việc nên làm trước khi thêm acid",
        description:
          "Mụn không hết vì chồng quá nhiều trị mụn. Giữ da dịu, kem chống nắng, không nặn. Chụp ảnh để DaDiary gợi ý routine vừa với da bạn.",
        kicker: "Mụn",
        lede:
          "Mụn ẩn nằm dưới da; mụn viêm đỏ, có thể đau. Cả hai đều dễ tệ hơn nếu nặn, chà mạnh, hoặc thêm 3–4 hoạt chất trong một tuần.",
        sections: [
          {
            heading: "Việc an toàn làm ngay",
            paragraphs: [
              "Rửa dịu, không chà. Không nặn. Đổi vỏ gối nếu hay gác má. Tay sạch trước khi thoa sản phẩm.",
              "Kem chống nắng mỗi sáng — thâm mụn (PIH) ở da châu Á rất dễ đậm nếu ra nắng khi đang viêm.",
            ],
          },
          {
            heading: "BHA, benzoyl peroxide, retinol — chọn một",
            paragraphs: [
              "Người mới: một hoạt chất, vài buổi tối mỗi tuần, dưỡng sau. Benzoyl peroxide mạnh với mụn viêm nhưng dễ khô — bắt đầu nồng độ thấp, vùng nhỏ.",
              "Retinol không phải bước đầu khi da đang đỏ rát. Hết kích ứng rồi hãy tính.",
            ],
          },
          {
            heading: "Khi nào gặp bác sĩ",
            paragraphs: [
              "Mụn nang, sẹo, đau nhiều, mủ, hoặc lan nhanh — không tự ‘trị’ bằng acid mạnh. DaDiary gợi ý chăm sóc nhẹ, không kê thuốc.",
            ],
          },
        ],
        faqs: [
          {
            question: "Mụn ẩn có cần tẩy da chết mạnh không?",
            answer:
              "Không. Tẩy mạnh làm hàng rào da yếu, mụn viêm dễ tăng. BHA nhẹ vài buổi tối, hoặc chỉ rửa + dưỡng + SPF cho đến khi da chịu được.",
          },
          {
            question: "Có nên ngưng hết sản phẩm khi nổi mụn?",
            answer:
              "Lùi về routine ngắn (rửa, dưỡng, SPF) nếu da đang kích ứng. Không bỏ kem chống nắng. Ảnh mỗi ngày giúp thấy mụn đang lắng hay đang thêm.",
          },
        ],
      },
      en: {
        title: "Clogged pores and inflamed acne — what to do before more acids",
        description:
          "Breakouts often linger because too many actives land in one week. Keep skin calm, wear SPF, don’t pick. Take a photo so DaDiary can suggest a routine that fits.",
        kicker: "Acne",
        lede:
          "Clogged bumps sit under the surface; inflamed spots are red and may hurt. Both get worse with picking, scrubbing, or stacking three or four actives in a week.",
        sections: [
          {
            heading: "Safe moves today",
            paragraphs: [
              "Gentle cleanse, no scrubbing, no picking. Change pillowcases if you sleep on your cheek. Clean hands before products.",
              "SPF every morning — post-inflammatory marks on Asian skin darken easily in the sun while skin is still inflamed.",
            ],
          },
          {
            heading: "BHA, benzoyl peroxide, retinol — pick one",
            paragraphs: [
              "If you are new: one active, a few evenings a week, moisturizer after. Benzoyl peroxide helps inflamed spots but dries easily — start low, small area.",
              "Retinol is not step one while skin is stinging. Calm the barrier first.",
            ],
          },
          {
            heading: "When to see a clinician",
            paragraphs: [
              "Cysts, scarring, a lot of pain, pus, or fast spread — don’t self-treat with strong acids. DaDiary suggests gentle care; it does not prescribe.",
            ],
          },
        ],
        faqs: [
          {
            question: "Do clogged pores need a harsh exfoliant?",
            answer:
              "No. Harsh scrubs weaken the barrier and often increase inflamed spots. Mild BHA a few evenings, or just cleanse + moisturize + SPF until skin can tolerate more.",
          },
          {
            question: "Should I stop every product during a breakout?",
            answer:
              "Simplify to a short routine if skin is irritated. Keep SPF. Daily photos show whether spots are settling or multiplying.",
          },
        ],
      },
    },
    "kem-chong-nang": {
      vi: {
        title: "Kem chống nắng cho da dầu, da mụn — thoa sao để giữ được",
        description:
          "SPF mỗi sáng giúp thâm mụn ít đậm hơn và routine có dữ liệu thật. Chọn kết cấu mỏng, thoa đủ, chụp ảnh để nhận routine có bước nắng.",
        kicker: "Kem chống nắng",
        lede:
          "Ở Việt Nam, nắng và ánh sáng gần cửa sổ đủ để thâm mụn lâu hết. Nhiều người bỏ SPF vì bí, trắng, hoặc sợ nổi mụn — thường do kết cấu và lượng thoa, không phải ‘da dầu không cần nắng’.",
        sections: [
          {
            heading: "Thoa đủ, rồi mới nói ‘hợp da’",
            paragraphs: [
              "Mặt khoảng 1/4 thìa cà phê (hai ngón tay). Thoa mỏng quá thì số trên vỏ không còn ý nghĩa. Chia trán, má, mũi, cằm — không quên cổ.",
              "Trong nhà gần cửa sổ vẫn nên thoa buổi sáng nếu bạn ngồi đó cả buổi.",
            ],
          },
          {
            heading: "Da dầu / da mụn chọn gì",
            paragraphs: [
              "Gel, fluid, hoặc ‘oil control’ dễ chịu hơn cream dày. Không cần SPF 50 nếu bạn không thoa lại — SPF 30 thoa đều vẫn hơn SPF 50 thoa nháy.",
              "Nếu vỡ makeup giữa ngày: thấm dầu, rồi phấn hoặc xịt có SPF — đừng rửa mặt giữa giờ rồi bỏ nắng.",
            ],
          },
          {
            heading: "Kết với routine tối",
            paragraphs: [
              "Tối: tẩy trang / rửa sạch SPF. Sáng hôm sau: rửa nhẹ, dưỡng mỏng, SPF. Ảnh cùng góc giúp bạn thấy thâm có đang lắng khi đã thoa đều 2–3 tuần.",
            ],
          },
        ],
        faqs: [
          {
            question: "Kem chống nắng có gây mụn không?",
            answer:
              "Một số công thức bí với da dầu. Đổi kết cấu mỏng hơn, thoa lượng đúng, rửa sạch tối. Đừng bỏ SPF hẳn — thâm sẽ chậm hết.",
          },
          {
            question: "Ở trong văn phòng có cần không?",
            answer:
              "Nếu có cửa sổ hoặc ra ngoài lúc trưa thì nên. SPF sáng là thói quen rẻ nhất để bảo vệ tiến trình trị thâm.",
          },
        ],
      },
      en: {
        title: "Sunscreen for oily and acne-prone skin — how to actually wear it",
        description:
          "Morning SPF keeps post-breakout marks from darkening and gives your routine real data. Pick a thin texture, apply enough, then take a photo for a routine that includes sun care.",
        kicker: "Sunscreen",
        lede:
          "In Vietnam, outdoor sun and window light are enough to keep marks around. People skip SPF because it feels heavy, white, or ‘breakout-y’ — usually texture and amount, not ‘oily skin doesn’t need sun’.",
        sections: [
          {
            heading: "Apply enough before judging the formula",
            paragraphs: [
              "About 1/4 teaspoon for the face (two fingers). A smear too thin makes the label number meaningless. Split forehead, cheeks, nose, chin — and the neck.",
              "If you sit by a window all morning, wear it indoors too.",
            ],
          },
          {
            heading: "Oily / acne-prone picks",
            paragraphs: [
              "Gels, fluids, or oil-control textures beat a thick cream. SPF 30 worn well beats SPF 50 dabbed on.",
              "Midday shine: blot, then powder or a spray with SPF — don’t wash at noon and skip sun protection.",
            ],
          },
          {
            heading: "Pair with the evening routine",
            paragraphs: [
              "Night: remove SPF. Next morning: gentle cleanse, light moisturizer, SPF. Same-angle photos show whether marks are fading after 2–3 weeks of even wear.",
            ],
          },
        ],
        faqs: [
          {
            question: "Can sunscreen cause breakouts?",
            answer:
              "Some formulas clog oily skin. Switch to a thinner texture, use the right amount, and wash it off at night. Don’t drop SPF entirely — marks fade slower without it.",
          },
          {
            question: "Do I need it in an office?",
            answer:
              "Yes if you sit by a window or go out at lunch. Morning SPF is the cheapest habit that protects fading marks.",
          },
        ],
      },
    },
    "routine-cham-da": {
      vi: {
        title: "Routine chăm da 3–4 bước cho người mới",
        description:
          "Routine ngắn dễ giữ hơn chu trình 10 bước. Sáng: rửa, dưỡng, SPF. Tối: rửa, một hoạt chất (nếu da chịu được), dưỡng. Chụp ảnh để nhận bản riêng.",
        kicker: "Routine",
        lede:
          "Người mới bỏ cuộc vì routine dài. Thói quen ngắn, đúng thứ tự, lặp mỗi ngày — rồi mới thêm serum. Ảnh và streak giúp bạn thấy tuần này khác tuần trước.",
        sections: [
          {
            heading: "Khung sáng và tối",
            paragraphs: [
              "Sáng: rửa dịu → dưỡng mỏng → kem chống nắng. Tối: rửa (tẩy trang nếu có makeup/SPF) → dưỡng. Khi da ổn 2 tuần, thêm một hoạt chất buổi tối vài lần/tuần.",
              "Thứ tự: nước → mỏng → đặc. SPF luôn cuối buổi sáng.",
            ],
          },
          {
            heading: "Đừng thêm hai thứ mới cùng tuần",
            paragraphs: [
              "Nếu nổi mụn hoặc rát, bạn sẽ không biết thứ nào gây ra. Một thay đổi, ghi nhật ký vài ngày. DaDiary dùng ảnh + cảm nhận — không phải checklist cứng.",
            ],
          },
          {
            heading: "Giữ streak, không giữ sự hoàn hảo",
            paragraphs: [
              "Một ngày mệt: rửa + SPF vẫn tính. Bỏ cả tuần vì ‘không làm đủ bước’ mới làm da và thói quen tụt. Check-in 30 giây khi không chụp được ảnh vẫn hơn im lặng.",
            ],
          },
        ],
        faqs: [
          {
            question: "Người mới có cần toner, essence, mask?",
            answer:
              "Không bắt buộc. Ba bước sáng và hai–ba bước tối đã đủ để da ổn định. Thêm khi bạn giữ được thói quen và biết da đang cần gì.",
          },
          {
            question: "Bao lâu thì thấy khác?",
            answer:
              "Dưỡng ẩm và bớt kích ứng có thể vài ngày. Thâm và texture thường vài tuần đến vài tháng. Ảnh cùng góc mỗi tuần nói thật hơn cảm giác từng ngày.",
          },
        ],
      },
      en: {
        title: "A 3–4 step skincare routine for beginners",
        description:
          "A short routine is easier to keep than ten steps. AM: cleanse, moisturize, SPF. PM: cleanse, one active if skin allows, moisturize. Take a photo for a version that fits you.",
        kicker: "Routine",
        lede:
          "Beginners quit long routines. A short order, repeated daily, then add a serum. Photos and a streak show this week versus last — not guesswork.",
        sections: [
          {
            heading: "Morning and evening frame",
            paragraphs: [
              "Morning: gentle cleanse → light moisturizer → SPF. Night: cleanse (remove makeup/SPF) → moisturize. After two calm weeks, add one evening active a few times a week.",
              "Order: watery → thin → thick. SPF last in the morning.",
            ],
          },
          {
            heading: "Don’t add two new things in one week",
            paragraphs: [
              "If you break out or sting, you won’t know which product did it. One change, log a few days. DaDiary uses photos and how skin feels — not a rigid checklist.",
            ],
          },
          {
            heading: "Keep the streak, not perfection",
            paragraphs: [
              "A tired day: cleanse + SPF still counts. Dropping a whole week because you ‘couldn’t do every step’ is what stalls skin and habit. A 30-second check-in beats silence.",
            ],
          },
        ],
        faqs: [
          {
            question: "Do beginners need toner, essence, and masks?",
            answer:
              "No. Three morning steps and two–three at night are enough to stabilize. Add extras once the habit sticks and you know what skin is asking for.",
          },
          {
            question: "How long until I see a change?",
            answer:
              "Comfort and less irritation can shift in days. Marks and texture often take weeks to months. Same-angle weekly photos are more honest than day-to-day mood.",
          },
        ],
      },
    },
  };

const RELATED: Record<GuideSlug, GuideSlug[]> = {
  "da-dau": ["mun", "kem-chong-nang", "routine-cham-da"],
  mun: ["da-dau", "kem-chong-nang", "routine-cham-da"],
  "kem-chong-nang": ["da-dau", "routine-cham-da", "mun"],
  "routine-cham-da": ["da-dau", "mun", "kem-chong-nang"],
};

export function isGuideSlug(value: string): value is GuideSlug {
  return (GUIDE_SLUGS as readonly string[]).includes(value);
}

export function guideChrome(locale: string): GuideChrome {
  return locale === "en" ? CHROME.en : CHROME.vi;
}

export function getGuideArticle(slug: GuideSlug, locale: string): GuideArticle {
  const loc: GuideLocale = locale === "en" ? "en" : "vi";
  const body = ARTICLES[slug][loc];
  return {
    slug,
    path: `/guides/${slug}`,
    related: RELATED[slug],
    ...body,
  };
}

export function listGuideArticles(locale: string): GuideArticle[] {
  return GUIDE_SLUGS.map((slug) => getGuideArticle(slug, locale));
}

export function guidePublicPaths(): string[] {
  return ["/guides", ...GUIDE_SLUGS.map((slug) => `/guides/${slug}`)];
}
