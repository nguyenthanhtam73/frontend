import { figure } from "../media";
import type { GuideArticleCopy, GuideLocale } from "../types";

function copy(locale: GuideLocale): GuideArticleCopy {
  const ampm = figure(
    "/guides/routine-cham-da/ampm.svg",
    {
      vi: {
        alt: "Khung sáng và tối: buổi sáng rửa, dưỡng, chống nắng; buổi tối rửa và dưỡng.",
        caption: "Ngắn thì giữ được. Dài thì dễ bỏ cả tuần.",
      },
      en: {
        alt: "Morning and night frames: cleanse, moisturize, SPF by day; cleanse and moisturize at night.",
        caption: "Short is keepable. Long is how a whole week disappears.",
      },
    },
    locale,
  );
  const order = figure(
    "/guides/routine-cham-da/order.svg",
    {
      vi: {
        alt: "Thứ tự lớp: nước loãng, lotion mỏng, rồi lớp đặc hơn; buổi sáng có lớp chống nắng trên cùng.",
        caption: "Nước → mỏng → đặc. SPF cuối buổi sáng.",
      },
      en: {
        alt: "Layer order: watery, thin lotion, thicker cream; morning sunscreen on top.",
        caption: "Watery → thin → thick. SPF last in the morning.",
      },
    },
    locale,
  );
  const twoWeeks = figure(
    "/guides/routine-cham-da/two-weeks.svg",
    {
      vi: {
        alt: "Lịch hai tuần với dấu check sáng và tối, cạnh sữa rửa và kem chống nắng không nhãn.",
        caption: "14 ngày ổn định trước khi thêm chai mới — trừ khi bạn chưa có SPF.",
      },
      en: {
        alt: "A two-week calendar with morning and night checks, beside unlabeled cleanser and sunscreen.",
        caption: "14 calm days before a new bottle — unless you still need SPF.",
      },
    },
    locale,
  );
  const photo = figure(
    "/guides/routine-cham-da/photo.svg",
    {
      vi: {
        alt: "Người chụp ảnh cùng góc cạnh cửa sổ cho nhật ký da, không phải ảnh trước-sau.",
        caption: "Cùng góc, cùng cửa sổ. Không cần filter.",
      },
      en: {
        alt: "Someone taking a same-angle journal photo by a window, not a before-and-after.",
        caption: "Same angle, same window. No filter needed.",
      },
    },
    locale,
  );

  if (locale === "vi") {
    return {
      title: "Routine 3–4 bước cho người mới — nóng ẩm, dễ giữ",
      description:
        "Sáng: rửa, dưỡng, SPF. Tối: rửa, một hoạt chất nếu da chịu, dưỡng. DaDiary Beta: khung tham khảo, không chẩn bệnh — chụp ảnh nhận bản riêng.",
      kicker: "Routine",
      lede:
        "Bạn bỏ cuộc vì routine dài? Bình thường. Mình muốn bạn giữ được thứ Tư mệt, không phải ritual Chủ nhật. Ba–bốn bước, đúng thứ tự, rồi mới thêm serum. DaDiary đang Beta: gợi ý, không chẩn bệnh.",
      heroFigure: ampm,
      sections: [
        {
          heading: "Vì sao 3–4 bước thường thắng",
          paragraphs: [
            "Mỗi bước thêm là một lần quên, một lần rát, một lần không biết chai nào gây mụn.",
            "Serum là phần thưởng sau hai tuần ổn — không phải vé vào cửa.",
            "Bạn không cần ‘đủ bộ’ cùng brand. Chịu được nắng ẩm quan trọng hơn hộp quà đủ chai.",
          ],
          subsections: [
            {
              heading: "Khung sáng",
              paragraphs: [
                "Rửa dịu (hoặc nước nếu da khô lúc ngủ) → dưỡng mỏng nếu cần → kem chống nắng đủ lượng. Makeup sau SPF.",
              ],
            },
            {
              heading: "Khung tối",
              paragraphs: [
                "Tẩy trang nếu có makeup/SPF → rửa → dưỡng. Da êm 2 tuần: thêm một hoạt chất vài tối, dưỡng sau.",
                "Đêm mệt: rửa + dưỡng vẫn tính. Đêm sau ngày nắng gắt: đừng bỏ rửa SPF.",
              ],
            },
          ],
        },
        {
          heading: "Thứ tự: nước → mỏng → đặc",
          paragraphs: ["Hai lớp mỏng buổi sáng thường chịu được hơn một lớp rất đặc dưới nắng ẩm."],
          figure: order,
          subsections: [
            {
              heading: "Đừng thêm hai thứ mới cùng tuần",
              paragraphs: [
                "Nổi mụn hoặc rát thì bạn sẽ không biết thứ nào gây ra. Một thay đổi, ghi vài ngày. Patch-test vùng nhỏ 2–3 đêm.",
              ],
            },
            {
              heading: "Toner, essence, mask",
              paragraphs: [
                "Không bắt buộc. Thêm khi thói quen đã dính. Mask hàng ngày dễ kích — tuần một lần, công thức dịu, vẫn patch-test.",
              ],
            },
          ],
        },
        {
          heading: "Nên làm / nên tránh",
          paragraphs: ["Da livestream không phải da bạn. Khí hậu phòng họ không phải xe máy của bạn."],
          doAvoid: {
            doItems: [
              "Ba bước sáng, hai–ba bước tối.",
              "SPF mỗi sáng, kể cả ngày ‘chỉ đi làm’ — xem [kem chống nắng](/guides/kem-chong-nang).",
              "Một thay đổi mỗi lần, patch-test.",
              "Ảnh cùng góc 2–3 lần/tuần.",
            ],
            avoidItems: [
              "Mua cả bộ ‘của người khác’ trong một buổi.",
              "Bỏ cả tuần vì một ngày quên.",
              "Dùng hết sample mạnh ‘cho nhanh’.",
              "Bù bảy bước trong một tối Chủ nhật.",
            ],
          },
        },
        {
          heading: "Checklist 14 ngày ổn định",
          paragraphs: ["Hai tuần này để da và thói quen ngồi xuống. Sau đó mới bàn hoạt chất."],
          figure: twoWeeks,
          checklist: [
            "Mỗi sáng: sạch nhẹ → dưỡng mỏng nếu cần → SPF hai ngón tay.",
            "Mỗi tối: sạch SPF/makeup → dưỡng. Thiếu giờ: vẫn rửa + dưỡng.",
            "Không mua chai mới trong 14 ngày này, trừ kem chống nắng nếu bạn chưa có.",
            "Rát kéo dài, bong, mụn tăng: lùi về 3 bước. Đừng thêm ‘serum phục hồi’ cùng tuần.",
          ],
        },
        {
          heading: "Nóng ẩm, máy lạnh, ngày lười",
          paragraphs: [
            "Kit 3 món trong túi khi đi: rửa, dưỡng, SPF. Bỏ serum ở nhà vẫn hơn bỏ nắng.",
            "Cuối tuần muốn ‘bù’ mask và tẩy da chết: vẫn một thứ mới, patch-test, SPF sáng hôm sau.",
          ],
          checklist: [
            "Ngày nóng: kết cấu mỏng, SPF, rửa sau mồ hôi.",
            "Ngày máy lạnh: má có thể cần lotion hơn; T-zone vẫn bóng — không sao.",
            "Hay quên tối: để sữa rửa cạnh bàn chải. Streak là nhắc nhẹ, không phải điểm hạnh kiểm.",
          ],
        },
        {
          heading: "Khi nào gặp bác sĩ thay vì thêm bước",
          paragraphs: [
            "Routine ngắn không thay thuốc. Nếu bác sĩ đã kê kem, hỏi trước khi thêm acid bán sẵn.",
          ],
          checklist: [
            "Đau, mủ, sưng lan, sẹo đang thành.",
            "Ban sau sản phẩm.",
            "Da không chịu nổi cả sữa rửa dịu.",
          ],
        },
        {
          heading: "Chụp ảnh để nhận bản riêng",
          paragraphs: [
            "Khung 3–4 bước là điểm xuất phát. Ảnh giúp gợi ý thứ tự và kết cấu vừa bạn. Xem routine rồi hãy đăng ký. Giữ streak, không giữ sự hoàn hảo.",
          ],
          figure: photo,
        },
      ],
      faqs: [
        {
          question: "Người mới có cần toner, essence, mask?",
          answer:
            "Không bắt buộc. Ba bước sáng và hai–ba bước tối đủ để da ổn. Thêm khi bạn giữ được thói quen.",
        },
        {
          question: "Bao lâu thì thấy khác?",
          answer:
            "Dưỡng ẩm và bớt rát có thể vài ngày. Thâm và texture thường vài tuần đến vài tháng. Ảnh cùng góc mỗi tuần thật hơn cảm giác từng ngày.",
        },
        {
          question: "Sáng có cần rửa mặt không?",
          answer:
            "Da nhờn hoặc còn SPF: rửa dịu. Da khô sau máy lạnh: nước rồi dưỡng và SPF có thể đủ.",
        },
        {
          question: "Chỉ dùng kem chống nắng, bỏ dưỡng được không?",
          answer:
            "Một số kem chống nắng đủ ẩm cho da dầu. Da căng hoặc bong thì thêm lotion mỏng. Đừng bỏ SPF để ‘giảm bước’.",
        },
      ],
    };
  }

  return {
    title: "A 3–4 step routine for beginners — humid heat, easier to keep",
    description:
      "AM: cleanse, moisturize, SPF. PM: cleanse, one active if skin allows, moisturize. DaDiary Beta: a frame, not a diagnosis — take a photo for a version that fits.",
    kicker: "Routine",
    lede:
      "Long routines are how beginners quit. This page wants a tired Wednesday to still happen. Three or four steps, in order, then a serum. DaDiary is in Beta: tips, not a diagnosis.",
    heroFigure: ampm,
    sections: [
      {
        heading: "Why 3–4 steps usually win",
        paragraphs: [
          "Each extra step is another skip, another sting, another mystery breakout.",
          "Serums are a bonus after two steady weeks — not an entry ticket.",
          "You do not need a matching-brand set. What your skin tolerates in humid heat matters more than a boxed kit.",
        ],
        subsections: [
          {
            heading: "Morning frame",
            paragraphs: [
              "Gentle cleanse (or water if overnight air-con left you dry) → thin moisturizer if you need it → enough sunscreen. Makeup after SPF.",
            ],
          },
          {
            heading: "Evening frame",
            paragraphs: [
              "Remove makeup/SPF if worn → cleanse → moisturize. After two calm weeks: one active a few nights, moisturizer after.",
              "A tired night: cleanse + moisturize still counts. After a high-sun day: don’t skip taking SPF off.",
            ],
          },
        ],
      },
      {
        heading: "Order: watery → thin → thick",
        paragraphs: [
          "Two thin morning layers usually sit better than one heavy layer under humid sun.",
        ],
        figure: order,
        subsections: [
          {
            heading: "Don’t add two new things in one week",
            paragraphs: [
              "If you break out or sting, you won’t know which product did it. One change, a few days of notes. Patch-test a small area 2–3 nights.",
            ],
          },
          {
            heading: "Toner, essence, masks",
            paragraphs: [
              "Not required. Add them when the habit sticks. Daily masks often irritate — a gentle one weekly still wants a patch-test.",
            ],
          },
        ],
      },
      {
        heading: "Do this / skip this",
        paragraphs: [
          "A livestream face is not yours. Their bathroom climate is not your motorbike.",
        ],
        doAvoid: {
          doItems: [
            "Three morning steps, two–three at night.",
            "SPF every morning, including ‘just going to work’ days — see the [sunscreen guide](/guides/kem-chong-nang).",
            "One change at a time, patch-tested.",
            "Same-angle photos 2–3 times a week.",
          ],
          avoidItems: [
            "Buying someone else’s whole set in one sitting.",
            "Dropping a week after one miss.",
            "Finishing a strong sample ‘to get results’.",
            "Cramming seven steps into Sunday night.",
          ],
        },
      },
      {
        heading: "14-day stabilize checklist",
        paragraphs: ["These two weeks are for skin and habit to sit down. Actives come after."],
        figure: twoWeeks,
        checklist: [
          "Every morning: light cleanse → thin moisturizer if needed → two-finger SPF.",
          "Every night: remove SPF/makeup → moisturize. Short on time: still cleanse + moisturize.",
          "No new bottles in these 14 days, unless you still need a sunscreen.",
          "Lasting sting, peel, or a jump in spots: return to three steps. Don’t add a ‘repair serum’ the same week.",
        ],
      },
      {
        heading: "Humid heat, air-con, lazy days",
        paragraphs: [
          "A 3-piece kit in the bag when you travel: cleanser, moisturizer, SPF. Leave the serum before you leave sun care.",
          "A weekend urge to ‘catch up’ with masks and scrubs: still one new thing, patch-test, SPF the next morning.",
        ],
        checklist: [
          "Hot days: thin textures, SPF, cleanse after sweat.",
          "Air-con days: cheeks may want more lotion; the T-zone can still shine — that’s fine.",
          "Nights slip: keep cleanser next to the toothbrush. A streak is a nudge, not a moral score.",
        ],
      },
      {
        heading: "When to see a doctor instead of adding a step",
        paragraphs: [
          "A short routine does not replace medicine. If a clinician already prescribed a cream, ask before adding a store acid.",
        ],
        checklist: [
          "Pain, pus, spreading swelling, scars forming.",
          "A rash after a product.",
          "Skin that cannot tolerate even a gentle cleanser.",
        ],
      },
      {
        heading: "Take a photo for a version that fits you",
        paragraphs: [
          "The 3–4 step frame is a start. A photo helps suggest order and textures. See the routine, then sign up. Keep the streak, not perfection.",
        ],
        figure: photo,
      },
    ],
    faqs: [
      {
        question: "Do beginners need toner, essence, and masks?",
        answer:
          "No. Three morning steps and two–three at night are enough to stabilize. Add extras once the habit sticks.",
      },
      {
        question: "How long until I see a change?",
        answer:
          "Comfort and less sting can shift in days. Marks and texture often take weeks to months. Weekly same-angle photos beat day-to-day mood.",
      },
      {
        question: "Do I have to wash my face in the morning?",
        answer:
          "Shiny or still wearing SPF: a gentle wash. Dry after air-con: water, moisturizer, and SPF can be enough.",
      },
      {
        question: "Can I wear only sunscreen and skip moisturizer?",
        answer:
          "Some sunscreens hydrate oily skin enough. Tight or flaky? Add a thin lotion. Don’t drop SPF to ‘cut a step’.",
      },
    ],
  };
}

export const routineChamDa: Record<GuideLocale, GuideArticleCopy> = {
  vi: copy("vi"),
  en: copy("en"),
};
