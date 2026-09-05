import { figure } from "../media";
import type { GuideArticleCopy, GuideLocale } from "../types";

function copy(locale: GuideLocale): GuideArticleCopy {
  const amount = figure(
    "/guides/kem-chong-nang/amount.webp",
    {
      vi: {
        alt: "Hai ngón tay với một dải kem chống nắng cạnh tuýp không nhãn hiệu.",
        caption: "Hai ngón tay cho mặt nghe nhiều. Đó là lượng để số trên vỏ còn ý nghĩa.",
      },
      en: {
        alt: "Two fingers with a ribbon of sunscreen next to an unlabeled tube.",
        caption: "Two fingers sounds like a lot. That is the amount that keeps the label number honest.",
      },
    },
    locale,
  );
  const zones = figure(
    "/guides/kem-chong-nang/zones.webp",
    {
      vi: {
        alt: "Bản đồ mặt: trán, má, mũi, cằm, tai trước và cổ cần được thoa kem chống nắng.",
        caption: "Chia nhỏ, tán đều. Đừng quên cổ và tai trước.",
      },
      en: {
        alt: "A face map: forehead, cheeks, nose, chin, front of the ears, and neck.",
        caption: "Split it up. Blend. Don’t skip the neck and the front of the ears.",
      },
    },
    locale,
  );
  const where = figure(
    "/guides/kem-chong-nang/where.webp",
    {
      vi: {
        alt: "Cửa sổ văn phòng và người đi xe máy — hai chỗ nắng thường ngày.",
        caption: "Văn phòng có kính và đường phố đều tính. Không chỉ đi biển.",
      },
      en: {
        alt: "An office window and a motorbike commuter — everyday sun.",
        caption: "Window glass and the street count. Not only the beach.",
      },
    },
    locale,
  );
  const textures = figure(
    "/guides/kem-chong-nang/textures.webp",
    {
      vi: {
        alt: "Hai tuýp không nhãn: fluid/gel mỏng và kem đặc hơn để so kết cấu.",
        caption: "Đổi kết cấu trước khi bỏ thói quen. Không có logo hãng trên hình.",
      },
      en: {
        alt: "Two unlabeled tubes: a thin fluid or gel and a thicker cream.",
        caption: "Change texture before you drop the habit. No brand logos here.",
      },
    },
    locale,
  );

  if (locale === "vi") {
    return {
      title: "Kem chống nắng da dầu, da mụn: thoa đủ để giữ được",
      description:
        "SPF mỗi sáng giúp thâm ít đậm hơn. Hai ngón tay, gel/fluid, rửa sạch tối. Checklist làm/tránh — rồi chụp ảnh nhận routine có bước nắng.",
      kicker: "Kem chống nắng",
      lede:
        "Bạn bỏ SPF vì bí, trắng, hoặc sợ mụn? Thường là kết cấu và lượng thoa — không phải ‘da dầu không cần nắng’. Mình viết để bạn giữ được mỗi sáng.",
      heroFigure: amount,
      sections: [
        {
          heading: "SPF làm gì — và không làm gì",
          paragraphs: [
            "Kem chống nắng giúp da ít nhận thêm tia UV. Nó không trị mụn, không xóa thâm trong một tuần, không thay mũ.",
            "Với vết thâm sau mụn, thoa đều mỗi sáng là thói quen rẻ để vết đỡ đậm thêm.",
            "Ảnh check-in theo tuần dễ đọc hơn khi nắng không đổi màu da mỗi chiều. Đó là lý do mình nhắc SPF — không phải để bán tuýp.",
          ],
          subsections: [
            {
              heading: "Trong nhà có cửa sổ vẫn tính",
              paragraphs: [
                "Ngồi sát kính cả buổi, tia UV vẫn tới. Màn hình điện thoại không thay nắng.",
              ],
            },
            {
              heading: "SPF 30 thoa đều hơn SPF 50 thoa nháy",
              paragraphs: [
                "Số trên vỏ giả định lượng đủ. Mặt khoảng hai ngón tay. Thoa mỏng quá thì số đó không còn ý nghĩa.",
              ],
            },
            {
              heading: "Giữa ngày: thấm, đừng rửa rồi bỏ trống",
              paragraphs: [
                "Bóng giữa buổi họp: giấy thấm, rồi phấn hoặc xịt có SPF nếu bạn mang theo. Rửa mặt giữa giờ rồi ra nắng trưa dễ thâm hơn là chịu một lớp mỏng.",
              ],
            },
          ],
        },
        {
          heading: "Thoa đủ, thoa hết vùng",
          paragraphs: ["Chia trán, má, mũi, cằm — rồi tai trước và cổ."],
          figure: zones,
          checklist: [
            "Dưỡng mỏng trước nếu da cần, rồi SPF.",
            "Makeup sau SPF, lớp mỏng.",
            "Cushion ‘có SPF’ ít khi đủ một mình nếu bạn tán rất mỏng.",
          ],
        },
        {
          heading: "Da dầu / da mụn chọn kết cấu nào",
          paragraphs: [
            "Gel, fluid, sữa, hoặc ‘oil control’ thường chịu được hơn cream dày. Nhãn ‘không nhờn’ không đảm bảo hợp bạn — patch-test nếu da dễ mẫn.",
          ],
          figure: textures,
        },
        {
          heading: "Nên làm / nên tránh",
          paragraphs: ["Một lần bí không có nghĩa bỏ cả thói quen. Đổi texture trước."],
          figure: where,
          doAvoid: {
            doItems: [
              "Hai ngón tay mỗi sáng, cổ luôn.",
              "Ra ngoài lâu / mồ hôi nhiều: thấm, thoa lại khi có thể.",
              "Tối: rửa sạch SPF. Đừng ngủ với lớp nắng cả ngày.",
              "Sản phẩm mới: patch-test 2–3 ngày.",
            ],
            avoidItems: [
              "Chấm vài điểm như kem dưỡng.",
              "Chỉ thoa khi đi biển.",
              "Rửa mặt giữa ngày cho ‘thoáng’ rồi quên thoa lại.",
              "Bỏ SPF vì một công thức bí.",
            ],
          },
        },
        {
          heading: "Checklist giữ được SPF",
          paragraphs: ["Làm đủ hai tuần rồi hãy kết luận ‘không hợp’."],
          checklist: [
            "Sáng: rửa hoặc nước → dưỡng mỏng nếu cần → SPF hai ngón tay.",
            "Văn phòng có cửa sổ hoặc ra trưa: vẫn thoa buổi sáng.",
            "Xe máy: mũ và khẩu trang không thay kem ở chỗ vải không che.",
            "Mùa mưa: những ngày có đoạn ngoài đường, giữ bước sáng.",
            "Rát kéo dài, sưng, mụn nước: dừng, rửa, gặp bác sĩ — không phải da ‘đang quen’.",
          ],
        },
        {
          heading: "Khi nào hỏi bác sĩ",
          paragraphs: ["Dị ứng kem chống nắng không phải chuyện ‘cố thêm vài ngày’."],
          checklist: [
            "Ban, sưng, rát kéo dài, mụn nước, khó thở — dừng ngay, gặp bác sĩ.",
            "Mụn tăng hàng loạt sau công thức mới: dừng chai đó. Đừng đắp acid lên vùng vừa dị ứng.",
          ],
        },
        {
          heading: "Routine có bước nắng, rồi chụp ảnh",
          paragraphs: [
            "Gợi ý từ ảnh luôn nên kể SPF buổi sáng. Chụp một ảnh, xem routine, đăng ký khi muốn lưu. Thói quen đều vài tuần đáng hơn tuýp đắt dùng hai lần.",
          ],
        },
      ],
      faqs: [
        {
          question: "Kem chống nắng có gây mụn không?",
          answer:
            "Một số công thức bí với da dầu. Đổi kết cấu mỏng hơn, thoa đủ, rửa sạch tối. Đừng bỏ SPF hẳn — thâm chậm hết.",
        },
        {
          question: "Ở văn phòng có cần không?",
          answer:
            "Có cửa sổ hoặc ra ngoài lúc trưa thì nên. SPF sáng là thói quen đơn giản để bảo vệ thâm đang lắng.",
        },
        {
          question: "Nên chọn kem hóa học hay vật lý?",
          answer:
            "Cả hai đều là chống nắng khi thoa đủ. Chọn cái bạn chịu được mỗi sáng. Patch-test. Không có loại ‘đúng hơn’ cho mọi da dầu Việt.",
        },
        {
          question: "Trẻ em hoặc da đang dùng thuốc bôi có làm giống mình không?",
          answer:
            "Không tự ý. Hỏi bác sĩ hoặc dược sĩ. Bài này viết cho người lớn muốn giữ thói quen SPF — không thay lời trên đơn.",
        },
      ],
    };
  }

  return {
    title: "Sunscreen for oily, acne-prone skin: enough product, every morning",
    description:
      "Morning SPF helps marks stay lighter. Two fingers, a gel or fluid, wash it off at night. A do/skip list — then a photo for a routine with sun care.",
    kicker: "Sunscreen",
    lede:
      "Skipping SPF because it feels heavy, white, or ‘breakout-y’ is usually texture and amount — not ‘oily skin doesn’t need sun’. This page is about a habit you can keep.",
    heroFigure: amount,
    sections: [
      {
        heading: "What SPF does — and does not do",
          paragraphs: [
            "Sunscreen lowers how much UV skin takes in. It does not treat acne, erase a mark in a week, or replace a hat.",
            "For marks after spots, even morning wear is a cheap habit that helps them stay lighter.",
            "Weekly check-in photos are easier to read when afternoon sun isn’t recoloring skin. That’s why we mention SPF — not to sell a tube.",
          ],
        subsections: [
          {
            heading: "A window still counts",
            paragraphs: [
              "Sitting against glass all morning, UV still arrives. A phone screen is not the sun.",
            ],
          },
            {
              heading: "SPF 30 worn well beats SPF 50 dabbed on",
              paragraphs: [
                "The number assumes enough product. About two fingers for the face. A smear too thin makes the label meaningless.",
              ],
            },
            {
              heading: "Midday: blot, don’t wash and go bare",
              paragraphs: [
                "Shine in a meeting: blot, then powder or a spray with SPF if you brought it. Washing at noon and walking into sun marks more easily than a thin layer you can feel.",
              ],
            },
        ],
      },
      {
        heading: "Enough product, every zone",
        paragraphs: ["Split forehead, cheeks, nose, chin — then the front of the ears and the neck."],
        figure: zones,
        checklist: [
          "Thin moisturizer first if you need it, then SPF.",
          "Makeup after SPF, sheered out.",
          "An ‘SPF cushion’ rarely replaces a real layer if you sheer it out.",
        ],
      },
      {
        heading: "Textures oily / acne-prone skin often tolerate",
        paragraphs: [
          "Gels, fluids, milks, or oil-control labels usually beat a thick cream. ‘Non-greasy’ on the pack is not a guarantee — patch-test if you react easily.",
        ],
        figure: textures,
      },
      {
        heading: "Do this / skip this",
        paragraphs: ["One heavy day is not a reason to drop the habit. Change texture first."],
        figure: where,
        doAvoid: {
          doItems: [
            "Two fingers every morning, neck too.",
            "Long outdoor time / heavy sweat: blot, reapply when you can.",
            "Night: wash SPF off. Don’t sleep in a full day’s layer.",
            "New product: patch-test 2–3 days.",
          ],
          avoidItems: [
            "Dabbing it like moisturizer.",
            "Only wearing it at the beach.",
            "Washing at midday ‘to breathe’, then forgetting to reapply.",
            "Dropping SPF because one formula felt heavy.",
          ],
        },
      },
      {
        heading: "Checklist to actually keep SPF",
        paragraphs: ["Give a formula two weeks before you call it a mismatch."],
        checklist: [
          "Morning: cleanse or water → thin moisturizer if needed → two-finger SPF.",
          "Office windows or lunch outside: still wear it in the morning.",
          "On a bike: helmet and mask do not replace cream where cloth does not sit.",
          "Rainy days with outdoor stretches: keep the morning step.",
          "Lasting sting, swelling, blisters: stop, wash, see a doctor — that is not skin ‘getting used to it’.",
        ],
      },
      {
        heading: "When to ask a doctor",
        paragraphs: ["A sunscreen reaction is not a ‘push through a few more days’ project."],
        checklist: [
          "Rash, swelling, lasting burn, blisters, trouble breathing — stop, see a clinician.",
          "A sudden breakout after a new formula: stop that product. Don’t put acids on skin that just reacted.",
        ],
      },
      {
        heading: "A routine with sun care — then a photo",
        paragraphs: [
          "A photo-based suggestion should include morning SPF. Take one picture, see the routine, sign up when you want to save it. Even wear for a few weeks beats an expensive tube used twice.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can sunscreen cause breakouts?",
        answer:
          "Some formulas clog oily skin. Switch to a thinner texture, use the right amount, wash it off at night. Don’t drop SPF entirely — marks fade slower without it.",
      },
      {
        question: "Do I need it in an office?",
        answer:
          "Yes if you sit by a window or go out at lunch. Morning SPF is a simple habit that protects fading marks.",
      },
      {
        question: "Chemical or mineral — which is ‘right’?",
        answer:
          "Both count when you apply enough. Pick what you will wear every morning. Patch-test. There is no single winner for every oily face in Vietnam.",
      },
      {
        question: "Should children or someone on prescription cream copy this?",
        answer:
          "Don’t decide for them from this page. Ask a clinician or pharmacist. This guide is for adults building an SPF habit — not a substitute for a label or prescription.",
      },
    ],
  };
}

export const kemChongNang: Record<GuideLocale, GuideArticleCopy> = {
  vi: copy("vi"),
  en: copy("en"),
};
