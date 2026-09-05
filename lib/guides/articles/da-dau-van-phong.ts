import { figure } from "../media";
import type { GuideArticleCopy, GuideLocale } from "../types";

function copy(locale: GuideLocale): GuideArticleCopy {
  const hero = figure(
    "/guides/da-dau-van-phong/hero.svg",
    {
      vi: {
        alt: "Một ngày hai khí hậu: nắng xe máy bên trái, máy lạnh văn phòng bên phải.",
        caption: "Ngoài đường nóng ẩm. Trong phòng khô lạnh. Da vừa bóng T-zone vừa căng má là chuyện thường.",
      },
      en: {
        alt: "One day, two climates: motorbike heat on the left, office air-con on the right.",
        caption: "Humid heat outside. Dry air-con inside. A shiny T-zone and tight cheeks can share one face.",
      },
    },
    locale,
  );
  const desk = figure(
    "/guides/da-dau-van-phong/desk.svg",
    {
      vi: {
        alt: "Ngăn kéo văn phòng: giấy thấm, nước, không để sữa rửa mặt trên bàn.",
        caption: "Giấy thấm được. Sữa rửa giữa giờ thì dễ thủng SPF lúc ra ăn trưa.",
      },
      en: {
        alt: "An office drawer kit: blotting papers, water, and no cleanser at the desk.",
        caption: "Blotting is fine. A midday wash is an easy SPF gap at lunch.",
      },
    },
    locale,
  );
  const lunch = figure(
    "/guides/da-dau-van-phong/lunch.svg",
    {
      vi: {
        alt: "Người thấm dầu tại bàn thay vì rửa mặt nhà vệ sinh công ty trước giờ ăn trưa nắng.",
        caption: "Bóng lúc 3 giờ chưa chắc routine sai. Thấm. Giữ lớp nắng.",
      },
      en: {
        alt: "Someone blotting at a desk instead of washing in the office bathroom before a sunny lunch.",
        caption: "Shine at 3 p.m. is not automatically a failed routine. Blot. Keep the sun layer.",
      },
    },
    locale,
  );

  if (locale === "vi") {
    return {
      title: "Da dầu văn phòng máy lạnh: sáng mỏng, chiều đừng rửa thêm",
      description:
        "Sáng nắng xe máy, cả ngày máy lạnh, T-zone bóng lúc 3 giờ? Rửa dịu, dưỡng mỏng, SPF — giấy thấm chứ đừng rửa giữa giờ. DaDiary Beta: gợi ý, không chẩn bệnh.",
      kicker: "Da dầu văn phòng",
      lede:
        "Bạn sống hai khí hậu một ngày. Mục tiêu không phải hết bóng. Mục tiêu: da chịu được, ít rát, SPF còn đó, thói quen còn sống sau 17h. DaDiary đang Beta: gợi ý, không chẩn bệnh.",
      heroFigure: hero,
      sections: [
        {
          heading: "Một ngày, hai khí hậu",
          paragraphs: [
            "Sáng: nắng, mũ, kem chống nắng. Ngày: điều hòa. Trưa: ra đường vài phút. Chiều: T-zone bóng. Tối: muốn ‘tẩy sạch cả ngày’ nên rửa mạnh.",
            "Máy lạnh không có nghĩa bỏ dưỡng. Da dầu vẫn mất nước rồi tiết dầu bù — nền ở [da dầu nóng ẩm](/guides/da-dau); má căng xem [da khô](/guides/da-kho).",
            "Nếu da đang trị theo đơn, giữ giờ bác sĩ dặn. Đừng thay bằng tip văn phòng trên mạng.",
          ],
        },
        {
          heading: "Khung cho ngày 8 tiếng",
          paragraphs: ["Giữ ngắn để thứ Hai bận vẫn làm được. Serum để tối hoặc cuối tuần."],
          subsections: [
            {
              heading: "Trước khi ra khỏi nhà",
              paragraphs: [
                "Rửa dịu hoặc nước → lotion/gel mỏng → kem chống nắng đủ lượng, cổ và tai trước. Makeup sau, mỏng. Patch-test sản phẩm mới ở nhà, không phải sáng họp lớn.",
              ],
            },
            {
              heading: "Trên bàn",
              paragraphs: ["Không biến ngăn kéo thành phòng lab."],
              figure: desk,
              checklist: [
                "Giấy thấm, nước, hạn chế chạm mặt.",
                "Xịt khoáng nếu thích — không thay dưỡng hay SPF.",
                "Có cửa sổ: bạn đã thoa nắng buổi sáng.",
              ],
            },
            {
              heading: "Về nhà",
              paragraphs: [
                "Tẩy trang / rửa sạch SPF và bụi đường. Dưỡng mỏng. Má khô: lotion hơn một chút ở má. Hoạt chất: tối, vài buổi — không phải lúc da đang rát vì điều hòa.",
              ],
            },
          ],
        },
        {
          heading: "Nên làm / nên tránh",
          paragraphs: ["So da với đồng nghiệp dưới đèn LED không công bằng. Chỉ so bạn với ảnh bạn."],
          figure: lunch,
          doAvoid: {
            doItems: [
              "SPF sáng, kể cả ngày ‘chỉ ngồi máy lạnh’ nếu có cửa sổ hoặc ra trưa.",
              "Thấm dầu khi bóng nhìn thấy.",
              "Tối: rửa sạch, dưỡng. Đừng trừng phạt da vì bóng chiều.",
              "Ảnh cùng góc cuối tuần.",
            ],
            avoidItems: [
              "Rửa mặt toilet công ty trừ khi mồ hôi nhiều hoặc tràn kem.",
              "Giấy thấm 10 lần đến da căng.",
              "Tẩy trang loại mạnh ở bàn rồi ra nắng.",
              "Mask giấy dưới máy lạnh mỗi ngày.",
            ],
          },
        },
        {
          heading: "Checklist ngăn kéo",
          paragraphs: ["Gói nhỏ. Patch-test mọi thứ trước khi để ở công ty."],
          checklist: [
            "Giấy thấm (thấm, không cọ).",
            "Không bắt buộc: phấn hoặc xịt có SPF để dặm — không thay lớp sáng.",
            "Không: sữa rửa, muối, toner cồn ‘cho tỉnh’ giữa giờ.",
            "Trưa nắng: mũ/khẩu trang + nhớ đã có SPF sáng.",
          ],
        },
        {
          heading: "Xe máy, ăn trưa, ngày mưa",
          paragraphs: [
            "Mũ + SPF + mồ hôi: tới nơi thì thấm, đừng chà. Ăn trưa nắng: lớp sáng vẫn làm việc nếu bạn không rửa giữa giờ. Mưa vẫn có UV.",
            "Họp online cả buổi: vẫn thấm nếu bóng khó chịu, vẫn đừng chạm mặt. Camera không phải lý do chồng phấn lên vùng đang mụn.",
          ],
        },
        {
          heading: "Khi nào gặp bác sĩ",
          paragraphs: [
            "Ngày bận không phải lý do trì khám khi da đang để sẹo. DaDiary không kê thuốc.",
          ],
          checklist: [
            "Mụn nang dọc hàm, đau, mủ, sưng lan.",
            "Da nẻ rát không chịu nổi điều hòa.",
            "Ban sau kem mới — dừng, hỏi bác sĩ nếu không dịu.",
          ],
        },
        {
          heading: "Chụp ảnh ngày thường, nhận routine",
          paragraphs: [
            "Một ảnh cuối tuần, cùng góc, không filter. Gợi ý vẫn tính da dầu và bước nắng. Văn phòng cần thói quen chịu được thứ Tư.",
          ],
        },
      ],
      faqs: [
        {
          question: "Ngồi máy lạnh cả ngày có cần kem chống nắng?",
          answer:
            "Có cửa sổ hoặc ra ngoài lúc trưa thì nên thoa buổi sáng. Đừng biến một ngày trong nhà thành cả tuần không SPF.",
        },
        {
          question: "Có nên rửa mặt buổi trưa ở công ty?",
          answer:
            "Chỉ khi đổ mồ hôi nhiều hoặc bẩn kem. Rửa xong phải thoa lại SPF nếu còn ra ngoài. Thấm dầu thường đủ cho bóng chiều.",
        },
        {
          question: "Da vừa dầu vừa khô vì điều hòa thì dưỡng lên đâu?",
          answer:
            "Cả mặt một lớp mỏng; má thêm chút nếu căng. Đừng cream đặc cả mặt buổi sáng dưới nắng ẩm.",
        },
        {
          question: "Makeup văn phòng có thay được kem chống nắng?",
          answer:
            "Ít khi, nếu tán mỏng. Thoa SPF riêng buổi sáng, makeup sau.",
        },
      ],
    };
  }

  return {
    title: "Oily skin in an air-conditioned office: thin morning, no extra midday wash",
    description:
      "Motorbike sun at 8, air-con all day, shiny T-zone at 3? Gentle cleanse, thin lotion, SPF — blot instead of a lunch wash. DaDiary Beta: tips, not a diagnosis.",
    kicker: "Office oily skin",
    lede:
      "You live two climates in one day. The aim is not zero shine. The aim: skin you can tolerate, less sting, SPF still on, a habit that survives 5 p.m. DaDiary is in Beta: tips, not a diagnosis.",
    heroFigure: hero,
    sections: [
      {
        heading: "One day, two climates",
        paragraphs: [
          "Morning: sun, a helmet, sunscreen. Day: air-con. Lunch: a few minutes outside. Afternoon: shiny T-zone. Night: the urge to punish-wash.",
          "Air-con is not a reason to skip moisturizer. Oily skin still loses water, then makes more oil — base care in the [oily-skin guide](/guides/da-dau); tight cheeks in the [dry-skin guide](/guides/da-kho).",
          "If you already have a prescribed cream, keep that schedule. Don’t swap it for an office tip from the internet.",
        ],
      },
      {
        heading: "A frame for an eight-hour day",
        paragraphs: ["Keep it short so a busy Monday still happens. Serums wait for night or the weekend."],
        subsections: [
          {
            heading: "Before you leave home",
            paragraphs: [
              "Gentle cleanse or water → thin gel/lotion → enough sunscreen, neck and the front of the ears. Makeup after, sheered out. Patch-test new products at home, not on a high-stakes morning.",
            ],
          },
          {
            heading: "At the desk",
            paragraphs: ["Don’t turn the drawer into a lab."],
            figure: desk,
            checklist: [
              "Blotting papers, water, hands off the face.",
              "A mist if you like — it does not replace moisturizer or SPF.",
              "A window: you already wore morning sun care.",
            ],
          },
          {
            heading: "After work",
            paragraphs: [
              "Remove sunscreen and street dust. Thin moisturizer. Dry cheeks: a little more lotion there. Actives: at night, a few times — not the moment air-con left you stinging.",
            ],
          },
        ],
      },
      {
        heading: "Do this / skip this",
        paragraphs: [
          "Comparing faces under LED panels is unfair. Compare you to your photos.",
        ],
        figure: lunch,
        doAvoid: {
          doItems: [
            "Morning SPF, even on ‘just air-con’ days if you have a window or go out at lunch.",
            "Blot when shine is visible.",
            "Night: cleanse, moisturize. Don’t punish skin for afternoon shine.",
            "Same-angle photos on the weekend.",
          ],
          avoidItems: [
            "Washing in the office bathroom unless you sweated heavily or spilled product.",
            "Ten blots until skin feels tight.",
            "A strong makeup wipe at the desk, then walking into sun.",
            "A sheet mask under air-con every day.",
          ],
        },
      },
      {
        heading: "Office-drawer checklist",
        paragraphs: ["A small kit. Patch-test anything before it lives at work."],
        checklist: [
          "Blotting papers (press, don’t scrub).",
          "Optional: powder or a spray with SPF to top up — not a replacement for the morning layer.",
          "Skip: cleanser, salt, high-alcohol toner ‘to wake up’ at noon.",
          "Sunny lunch: hat/mask + remember morning SPF.",
        ],
      },
      {
        heading: "Motorbikes, lunch, rain",
        paragraphs: [
          "Helmet + SPF + sweat: when you arrive, blot, don’t scrub. A sunny lunch: the morning layer is still working if you didn’t wash it off. Rain still has UV.",
          "A long video-call block: blot if shine bothers you, still keep hands off the face. The camera is not a reason to pile powder on active spots.",
        ],
      },
      {
        heading: "When to see a doctor",
        paragraphs: [
          "A busy week is not a reason to delay care if scars are forming. DaDiary does not prescribe.",
        ],
        checklist: [
          "Cystic spots along the jaw, pain, pus, spreading swelling.",
          "Air-con cracks that won’t settle.",
          "A rash after a new cream — stop, ask if it doesn’t calm.",
        ],
      },
      {
        heading: "A weekday photo, then a routine",
        paragraphs: [
          "One weekend photo, same angle, no filter. The suggestion should still count oily skin and morning SPF. Offices need a Wednesday-proof habit.",
        ],
      },
    ],
    faqs: [
      {
        question: "If I sit in air-con all day, do I still need sunscreen?",
        answer:
          "Yes in the morning if you have a window or go out at lunch. Don’t turn one indoor day into a week without SPF.",
      },
      {
        question: "Should I wash my face at lunch in the office?",
        answer:
          "Only after heavy sweat or a product spill. If you wash, put SPF back on before you go outside. Blotting is usually enough for afternoon shine.",
      },
      {
        question: "Oily and dry from air-con — where does moisturizer go?",
        answer:
          "A thin layer on the whole face; a little more on tight cheeks. Don’t use a heavy cream on the full face under humid morning sun.",
      },
      {
        question: "Does office makeup replace sunscreen?",
        answer:
          "Rarely, if you sheer it out. Wear a real SPF in the morning, makeup after.",
      },
    ],
  };
}

export const daDauVanPhong: Record<GuideLocale, GuideArticleCopy> = {
  vi: copy("vi"),
  en: copy("en"),
};
