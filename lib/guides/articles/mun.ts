import { figure } from "../media";
import type { GuideArticleCopy, GuideLocale } from "../types";

function copy(locale: GuideLocale): GuideArticleCopy {
  const hero = figure(
    "/guides/mun/hero.svg",
    {
      vi: {
        alt: "Minh họa không nặn mụn: người đứng trước gương, hai tay thả lỏng, gối và lót mũ sạch trên kệ.",
        caption: "Tay xuống. Gối sạch. Lót mũ sạch. Ba việc này rẻ hơn một chai acid mới.",
      },
      en: {
        alt: "Illustration of not picking: someone at a mirror with relaxed hands, a clean pillow and helmet liner on a shelf.",
        caption: "Hands down. Clean pillow. Clean liner. Cheaper than another acid.",
      },
    },
    locale,
  );
  const oneActive = figure(
    "/guides/mun/one-active.svg",
    {
      vi: {
        alt: "Một chai hoạt chất được làm nổi, các chai khác mờ phía sau, lịch vài buổi tối trong tuần.",
        caption: "Một hoạt chất. Vài buổi tối. Patch-test trước.",
      },
      en: {
        alt: "One active bottle highlighted, others faded, a calendar with a few evening dots.",
        caption: "One active. A few evenings. Patch-test first.",
      },
    },
    locale,
  );
  const friction = figure(
    "/guides/mun/friction.svg",
    {
      vi: {
        alt: "Mũ bảo hiểm với lót vải tháo ra để giặt, cạnh vỏ gối sạch.",
        caption: "Ma sát + mồ hôi + SPF cả buổi dễ làm hàm và cằm bí.",
      },
      en: {
        alt: "A helmet liner being removed to wash, next to a clean pillowcase.",
        caption: "Friction plus sweat plus all-day SPF often congests the jaw and chin.",
      },
    },
    locale,
  );
  const doctor = figure(
    "/guides/mun/doctor.svg",
    {
      vi: {
        alt: "Phòng chờ da liễu yên, cây xanh và cửa phòng khám — không phải hình mụn gây sốc.",
        caption: "Đau, mủ, sẹo đang thành: đi khám. Đừng tự tăng acid.",
      },
      en: {
        alt: "A calm clinic waiting area with a plant and a door — not a graphic acne photo.",
        caption: "Pain, pus, scars forming: see a clinician. Don’t raise acids on your own.",
      },
    },
    locale,
  );

  if (locale === "vi") {
    return {
      title: "Mụn ẩn và mụn viêm: làm gì trước khi thêm acid",
      description:
        "Mụn kéo dài thường vì nặn, chồng trị mụn, và bỏ SPF. Việc an toàn, một hoạt chất, khi nào gặp bác sĩ — rồi chụp ảnh nhận routine.",
      kicker: "Mụn",
      lede:
        "Mình không chẩn loại mụn giúp bạn trên trang này. Chỉ nhắc việc ít hại: đừng nặn, giữ da dịu, SPF mỗi sáng, rồi mới tính một hoạt chất.",
      heroFigure: hero,
      sections: [
        {
          heading: "Hai hình hay gặp — không tự đặt tên bệnh",
          paragraphs: [
            "Mụn ẩn: hạt nhỏ, gần màu da, sờ hơi cứng. Mụn viêm: đỏ, có thể đau hoặc có đầu trắng.",
            "Nhiều người có cả hai. Tên trên mạng không thay khám nếu đau nhiều, có mủ, hoặc để sẹo.",
          ],
          subsections: [
            {
              heading: "Làm ngay hôm nay",
              paragraphs: ["Không cần mua gì mới để bắt đầu dịu hơn."],
              checklist: [
                "Rửa dịu. Không chà. Không muối.",
                "Không nặn.",
                "Tay sạch trước khi thoa.",
                "Đổi vỏ gối nếu hay gác má.",
                "SPF mỗi sáng — thâm sau mụn dễ đậm khi da còn đỏ.",
              ],
            },
            {
              heading: "Tạm dừng",
              paragraphs: ["Nếu da đang rát, lùi về rửa–dưỡng–SPF đã."],
              checklist: [
                "Mask đất sét mỗi ngày.",
                "Tẩy hạt, toner cồn mạnh.",
                "‘Combo trị mụn’ nhiều chai cùng tuần.",
              ],
            },
          ],
        },
        {
          heading: "Một hoạt chất, vài tuần",
          paragraphs: [
            "BHA, benzoyl peroxide, azelaic, retinol… mỗi thứ có chỗ. Người mới: chọn một.",
            "Sản phẩm kệ không phải đơn thuốc. Đang có đơn từ bác sĩ — đừng tự thêm acid mạnh lên cùng vùng.",
          ],
          figure: oneActive,
          subsections: [
            {
              heading: "Chọn một để bắt đầu",
              paragraphs: [
                "BHA thường dùng vùng dầu, mụn ẩn — vẫn có thể khô. Benzoyl peroxide thường nhắm mụn viêm; dễ khô và phai vải — nồng độ thấp, vùng nhỏ. Retinol không phải bước đầu khi da đỏ rát.",
              ],
            },
            {
              heading: "Patch-test rồi mới cả mặt",
              paragraphs: [
                "Lượng rất nhỏ sau tai hoặc dọc hàm 2–3 đêm. Ngứa nhẹ thoáng qua khác với rát, sưng, mụn hàng loạt.",
                "Rát hoặc ban: rửa, dừng, dưỡng và SPF. Đừng ‘cố chịu cho quen’ nếu da đang tổn.",
              ],
            },
          ],
        },
        {
          heading: "Nên làm / nên tránh",
          paragraphs: ["Không ai ‘xứng đáng’ bị mụn vì tối qua ăn gì."],
          doAvoid: {
            doItems: [
              "Rửa dịu, dưỡng mỏng, SPF mỗi sáng.",
              "Một hoạt chất, vài buổi tối, dưỡng sau.",
              "Ảnh cùng góc để thấy mụn lắng hay thêm.",
              "Gối, khăn, ốp điện thoại, tay: sạch hơn khi chạm mặt.",
            ],
            avoidItems: [
              "Nặn cho ‘xong’ trước sự kiện.",
              "Ngưng hết, kể cả SPF, khi nổi mụn.",
              "Chồng mọi tip trên mạng trong bảy ngày.",
              "Tẩy mạnh cho mụn ẩn ‘tróc’. ",
            ],
          },
        },
        {
          heading: "Checklist khi da đang nổi",
          paragraphs: ["Làm song song với việc không nặn. Gương lúc 11 giờ đêm hay bịa chuyện."],
          checklist: [
            "Không nặn. Không tự ‘lấy nhân’ nếu da trông như đang nhiễm — hỏi bác sĩ khi không chắc.",
            "Rửa dịu sáng tối; thêm lần chỉ khi mồ hôi nhiều.",
            "Dưỡng mỏng sau rửa. Da mụn vẫn cần hàng rào.",
            "SPF mỗi sáng, kể cả gần cửa sổ.",
            "Một chai mới mỗi lần, không cùng tuần.",
            "Đau, mủ, lan nhanh: đi khám.",
          ],
        },
        {
          heading: "Mũ, gối, nóng ẩm",
          paragraphs: [
            "Mồ hôi + ma sát + kem chống nắng cả buổi dễ bí đường hàm. Không chứng minh bạn ‘bẩn’ — chỉ giảm ma sát.",
          ],
          figure: friction,
          checklist: [
            "Sau khi đội mũ lâu: rửa dịu, dưỡng mỏng, không chà.",
            "Lót mũ giặt được thì giặt đều.",
            "Nằm nghiêng: vỏ gối sạch, tóc buộc nếu hay dính mặt.",
            "Tuần nắng đổ mồ hôi: đừng đổi sang sữa rửa ‘trị mụn’ mạnh chỉ vì trời nóng.",
          ],
        },
        {
          heading: "Khi nào gặp bác sĩ",
          paragraphs: [
            "DaDiary không kê isotretinoin, kháng sinh, hay kem đơn. Khám sớm nếu da đang để sẹo.",
          ],
          figure: doctor,
          checklist: [
            "Mụn nang, đau nhiều, mủ, sốt, sưng lan.",
            "Sẹo đang thành.",
            "Mụn lưng/ngực lan nhanh.",
            "Mụn đột ngột sau thuốc mới.",
          ],
        },
        {
          heading: "Chụp ảnh — không phải để xấu hổ",
          paragraphs: [
            "Một ảnh cùng góc giúp gợi ý routine khởi đầu và để bạn so tuần. Đăng ký sau khi thấy gợi ý. Ảnh không công khai nếu bạn không chia sẻ.",
          ],
        },
      ],
      faqs: [
        {
          question: "Mụn ẩn có cần tẩy da chết mạnh không?",
          answer:
            "Không. Tẩy mạnh làm hàng rào yếu, mụn viêm dễ tăng. BHA nhẹ vài buổi tối, hoặc chỉ rửa + dưỡng + SPF đến khi da chịu được.",
        },
        {
          question: "Có nên ngưng hết sản phẩm khi nổi mụn?",
          answer:
            "Lùi về routine ngắn nếu da kích ứng. Không bỏ kem chống nắng. Ảnh giúp thấy mụn lắng hay thêm.",
        },
        {
          question: "Ăn cay, sữa, đường có chắc gây mụn?",
          answer:
            "Không có câu ‘chắc’ cho mọi người. Đừng phạt ăn uống thay vì giữ rửa–dưỡng–SPF và không nặn. Muốn thử bớt một nhóm: đổi một thứ, xem vài tuần — không phải lời khuyên y khoa.",
        },
        {
          question: "Kem chống nắng có làm mụn nặng hơn không?",
          answer:
            "Một số công thức bí với da dầu. Đổi gel/fluid, thoa đủ, rửa sạch tối. Bỏ SPF hẳn thường làm thâm chậm hết hơn là ‘hết mụn’.",
        },
      ],
    };
  }

  return {
    title: "Clogged pores and inflamed acne: what to do before more acids",
    description:
      "Breakouts linger with picking, stacked actives, and skipped SPF. Safer moves, one active, when to see a doctor — then a photo for a routine.",
    kicker: "Acne",
    lede:
      "This page does not name your acne type. It lists lower-harm moves: don’t pick, keep skin calm, wear morning SPF, then consider one active.",
    heroFigure: hero,
    sections: [
      {
        heading: "Two looks people describe — not a diagnosis",
        paragraphs: [
          "Clogged bumps: small, near skin-colored, a bit firm. Inflamed spots: red, maybe sore or white-tipped.",
          "Many people have both. Internet names do not replace a visit if you have a lot of pain, pus, or scarring.",
        ],
        subsections: [
          {
            heading: "Do this today",
            paragraphs: ["You don’t need a new bottle to start calmer."],
            checklist: [
              "Gentle cleanse. No scrub. No salt.",
              "Don’t pick.",
              "Clean hands before products.",
              "Change the pillowcase if you sleep on your cheek.",
              "SPF every morning — marks darken easily while skin is still red.",
            ],
          },
          {
            heading: "Pause these",
            paragraphs: ["If skin stings, return to cleanse–moisturize–SPF first."],
            checklist: [
              "Daily clay masks.",
              "Gritty scrubs and high-alcohol toner.",
              "A full ‘acne stack’ in one week.",
            ],
          },
        ],
      },
      {
        heading: "One active, a few weeks",
        paragraphs: [
          "BHA, benzoyl peroxide, azelaic, retinol… each has a place. If you are new: pick one.",
          "Shelf products are not a prescription. Already have a clinician’s formula? Don’t layer a strong acid on the same area without asking.",
        ],
        figure: oneActive,
        subsections: [
          {
            heading: "Start with one",
            paragraphs: [
              "BHA is often used on oilier, clogged areas — it can still dry. Benzoyl peroxide is often aimed at inflamed spots; it dries and can bleach fabric — start low, small area. Retinol is not step one on stinging skin.",
            ],
          },
          {
            heading: "Patch-test before the full face",
            paragraphs: [
              "A tiny amount behind the ear or along the jaw for 2–3 nights. Brief mild itch is different from burn, swelling, or a row of new spots.",
              "Burn or a rash: wash off, stop, moisturize and wear SPF. Don’t ‘push through’ on injured skin.",
            ],
          },
        ],
      },
      {
        heading: "Do this / skip this",
        paragraphs: ["No one ‘deserves’ a breakout because of last night’s meal."],
        doAvoid: {
          doItems: [
            "Gentle cleanse, thin moisturizer, SPF every morning.",
            "One active, a few evenings, moisturizer after.",
            "Same-angle photos to see if spots are settling.",
            "Pillow, towel, phone, hands: cleaner when they touch your face.",
          ],
          avoidItems: [
            "Picking so it’s ‘gone’ before an event.",
            "Stopping everything, including SPF.",
            "Every internet tip in seven days.",
            "Harsh scrubs to ‘lift’ clogged pores.",
          ],
        },
      },
      {
        heading: "Checklist while you are breaking out",
        paragraphs: ["Do these beside ‘don’t pick’. The 11 p.m. mirror lies."],
        checklist: [
          "No picking. Don’t DIY extract if skin looks infected — ask if unsure.",
          "Gentle cleanse morning and night; extra only after heavy sweat.",
          "Thin moisturizer after cleansing. Acne-prone skin still needs a barrier.",
          "SPF every morning, including near windows.",
          "One new bottle at a time, not the same week.",
          "Pain, pus, fast spread: see a clinician.",
        ],
      },
      {
        heading: "Helmets, pillows, humid heat",
        paragraphs: [
          "Sweat + rub + all-day SPF can congest the jaw. That does not mean you are unclean — it lowers friction.",
        ],
        figure: friction,
        checklist: [
          "After a long ride: gentle cleanse, thin moisturizer, no scrub.",
          "Wash a removable liner often.",
          "Side sleeping: cleaner cases, hair off the face if it sticks.",
          "A sweaty hot week: don’t switch to a harsh ‘acne’ cleanser only because the weather spiked.",
        ],
      },
      {
        heading: "When to see a clinician",
        paragraphs: [
          "DaDiary does not prescribe isotretinoin, antibiotics, or prescription cream. Go earlier if scars are forming.",
        ],
        figure: doctor,
        checklist: [
          "Cysts, a lot of pain, pus, fever, spreading swelling.",
          "Scars forming.",
          "A fast back or chest flare.",
          "A sudden crop after a new medicine.",
        ],
      },
      {
        heading: "Take a photo — not to feel worse",
        paragraphs: [
          "One same-angle photo helps suggest a starter routine and lets you compare weeks. Sign up after you see it. Photos stay private unless you share them.",
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
          "Simplify if skin is irritated. Keep SPF. Photos show whether spots are settling or multiplying.",
      },
      {
        question: "Do spicy food, milk, or sugar always cause acne?",
        answer:
          "There is no ‘always’. Don’t punish meals instead of keeping cleanse–moisturize–SPF and not picking. If you trial dropping one food group, change one thing and watch a few weeks — not medical advice.",
      },
      {
        question: "Can sunscreen make acne worse?",
        answer:
          "Some formulas feel heavy. Switch to a gel or fluid, use enough, wash it off at night. Dropping SPF entirely usually slows marks more than it ‘clears’ acne.",
      },
    ],
  };
}

export const mun: Record<GuideLocale, GuideArticleCopy> = {
  vi: copy("vi"),
  en: copy("en"),
};
