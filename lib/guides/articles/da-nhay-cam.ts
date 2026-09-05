import { figure } from "../media";
import type { GuideArticleCopy, GuideLocale } from "../types";

function copy(locale: GuideLocale): GuideArticleCopy {
  const hero = figure(
    "/guides/da-nhay-cam/hero.svg",
    {
      vi: {
        alt: "Mặt giản lược hơi đỏ nhẹ cạnh chai không nhãn bị gạch — minh họa kích ứng, không phải ảnh bệnh.",
        caption: "Đỏ sau chai mới là tín hiệu dừng, không phải ‘cố để da quen’.",
      },
      en: {
        alt: "A simple slightly flushed face next to a crossed-out unlabeled bottle — irritation, not a medical photo.",
        caption: "Redness after a new bottle is a stop signal, not a reason to ‘push through’.",
      },
    },
    locale,
  );
  const minimal = figure(
    "/guides/da-nhay-cam/minimal.svg",
    {
      vi: {
        alt: "Ba bước tối giản: rửa dịu, dưỡng ít thành phần, kem chống nắng — không chồng serum.",
        caption: "Ít chai hơn thì dễ biết chai nào gây chuyện.",
      },
      en: {
        alt: "Three minimal steps: gentle cleanse, a short-ingredient moisturizer, sunscreen — no stacked serums.",
        caption: "Fewer bottles make it easier to see which one caused trouble.",
      },
    },
    locale,
  );
  const patch = figure(
    "/guides/da-nhay-cam/patch.svg",
    {
      vi: {
        alt: "Vùng sau tai và dọc hàm được khoanh cho patch-test hai đến ba đêm trước khi thoa cả mặt.",
        caption: "Sau tai hoặc dọc hàm, 2–3 đêm. Cả mặt ngay đêm đầu là cách mất dấu.",
      },
      en: {
        alt: "Behind-the-ear and along-the-jaw zones circled for a two-to-three-night patch test before the full face.",
        caption: "Behind the ear or along the jaw, 2–3 nights. Full face on night one is how you lose the trail.",
      },
    },
    locale,
  );

  if (locale === "vi") {
    return {
      title: "Da nhạy cảm nóng ẩm: giảm kích, một thay đổi mỗi lần",
      description:
        "Da dễ đỏ, rát, ngứa sau chai mới trên khí hậu nóng ẩm? Routine tối giản, patch-test, SPF dịu — không chồng acid. DaDiary Beta: không chẩn bệnh — chụp ảnh nhận routine nhẹ.",
      kicker: "Da nhạy cảm",
      lede:
        "Mình không chẩn ‘da nhạy cảm’ giúp bạn trên trang này. Nhiều thứ làm da đỏ: hương, acid, nắng, mũ, điều hòa. Việc ít hại: bớt chai, bớt chồng, biết khi nào đi khám. DaDiary đang Beta — gợi ý, không phải phòng khám.",
      heroFigure: hero,
      sections: [
        {
          heading: "Nhạy cảm khác dị ứng như thế nào",
          paragraphs: [
            "Trên mạng, ‘nhạy cảm’ hay có nghĩa: dễ đỏ, dễ rát, dễ ngứa. Dị ứng tiếp xúc là chuyện khác — thường cần bác sĩ, đôi khi cần xét nghiệm.",
            "Bạn không phải tự đặt tên bệnh từ một bài. Mục tiêu ở đây: giảm kích, không đoán chẩn.",
          ],
          subsections: [
            {
              heading: "Tín hiệu thường gặp — chưa phải chẩn đoán",
              paragraphs: [
                "Rát khi thoa, đỏ lan sau chai mới, ngứa dọc má khi máy lạnh. Cũng có thể chỉ là hàng rào đang khô — xem [da khô](/guides/da-kho) trước khi mua ‘serum phục hồi’.",
              ],
              checklist: [
                "Viết ra chai mới trong 2 tuần (kể cả sunscreen).",
                "Dừng hoạt chất khi đang rát cả ngày.",
                "Đừng tin review ‘hết đỏ 3 ngày’ — trang này không bịa đánh giá.",
              ],
            },
            {
              heading: "Mụn, đỏ, và ma sát",
              paragraphs: [
                "Da đang nổi vẫn có thể là da dễ kích. Nặn, chà, lót mũ bẩn làm đỏ thêm. Ưu tiên dịu + không nặn — [bài mụn](/guides/mun) nói rõ hơn việc acid.",
              ],
            },
          ],
        },
        {
          heading: "Routine tối giản khi da đang kêu",
          paragraphs: [
            "Ba bước chịu được thì hãy tính serum. Chồng năm chai ‘cho da nhạy’ vẫn là năm nguồn kích.",
          ],
          figure: minimal,
          subsections: [
            {
              heading: "Rửa, dưỡng, SPF — hết",
              paragraphs: [
                "Sữa rửa không hạt, ít hương. Dưỡng ngắn thành phần. Kem chống nắng bạn chịu được — gel hoặc lotion, đủ lượng, mỗi sáng.",
                "Sáng da căng: nước rồi dưỡng + SPF. Tối: sạch SPF/bụi, dưỡng. Makeup sau SPF, mỏng.",
              ],
            },
            {
              heading: "Hoạt chất để sau",
              paragraphs: [
                "Retinol, AHA, BHA, vitamin C mạnh — không phải bước đầu khi da đang đỏ. Xem [retinol cho người mới](/guides/retinol-cho-nguoi-moi) khi da đã êm vài tuần.",
                "Đang có đơn từ bác sĩ: giữ giờ dặn. Đừng thêm tip mạng lên cùng vùng.",
              ],
            },
          ],
        },
        {
          heading: "Patch-test rồi mới cả mặt",
          paragraphs: [
            "Da dễ kích mà thoa cả mặt đêm đầu là cách không biết chai nào gây chuyện.",
          ],
          figure: patch,
          checklist: [
            "Lượng rất nhỏ sau tai hoặc dọc hàm, 2–3 đêm.",
            "Ngứa nhẹ thoáng khác với rát, sưng, ban lan.",
            "Rát hoặc ban: rửa, dừng, dưỡng và SPF. Không ‘cố chịu cho quen’.",
            "Một sản phẩm mới mỗi lần — kể cả đổi sunscreen.",
          ],
        },
        {
          heading: "Nên làm / nên tránh",
          paragraphs: ["Ít việc, làm đều, dễ đọc hơn ‘protocol nhạy cảm’ trên mạng."],
          doAvoid: {
            doItems: [
              "Rửa dịu. Dưỡng. SPF mỗi sáng.",
              "Patch-test. Một thay đổi mỗi lần.",
              "Ghi chú chai + ngày bắt đầu.",
              "Ảnh cùng góc theo tuần, cùng cửa sổ.",
            ],
            avoidItems: [
              "Toner cồn, muối, kem đánh răng, miếng ráp.",
              "Chồng AHA + BHA + retinol trong tuần da đang đỏ.",
              "Mặt nạ đất sét / peel tại nhà ‘cho sạch lỗ’.",
              "Tin hứa hẹn hết đỏ trong 3 ngày.",
            ],
          },
        },
        {
          heading: "Nắng, mũ, máy lạnh",
          paragraphs: [
            "Da dễ đỏ vẫn bắt nắng. Bỏ SPF vì ‘kem làm rát’ thì chọn kết cấu khác — đừng bỏ cả tuần. Mũ và bóng râm bổ sung, không thay kem.",
            "Quai mũ và khẩu trang: ma sát. Lót sạch, đừng chà khi đổ mồ hôi. Máy lạnh: dưỡng, đừng rửa thêm giữa giờ.",
          ],
        },
        {
          heading: "Khi nào gặp bác sĩ",
          paragraphs: [
            "Sưng mắt, khó thở, ban lan nhanh — cấp cứu, không phải bài blog. DaDiary không chẩn dị ứng hay rosacea.",
          ],
          checklist: [
            "Ban lan, mụn nước, mặt sưng sau sản phẩm.",
            "Đau, mủ, sẹo đang thành.",
            "Đỏ quanh mắt kèm mỏi mắt / giảm thị lực — khám, đừng tự nhỏ ‘serum’.",
            "Không dịu sau vài ngày chỉ rửa–dưỡng–SPF.",
          ],
        },
        {
          heading: "Chụp ảnh khi da đang thật, nhận routine nhẹ",
          paragraphs: [
            "Một ảnh cùng góc, ánh sáng gần giống — kể cả ngày da đang đỏ. Gợi ý vẫn bắt đầu từ dịu + SPF. Đăng ký khi muốn lưu. Không cần ‘hết nhạy’ mới được dùng app.",
          ],
        },
      ],
      faqs: [
        {
          question: "Da nhạy cảm có dùng được kem chống nắng không?",
          answer:
            "Nên. Thiếu SPF thường làm đỏ và thâm lâu hơn. Đổi kết cấu, patch-test, thoa đủ — đừng bỏ cả tuần vì một tuýp không hợp.",
        },
        {
          question: "Có nên ‘detox’ không thoa gì?",
          answer:
            "Ngừng hoạt chất thì được. Bỏ luôn dưỡng và SPF dưới máy lạnh và nắng xe máy thường làm da kêu hơn. Nước + dưỡng dịu + SPF là tối giản, không phải bỏ mặc.",
        },
        {
          question: "Niacinamide có an toàn cho da nhạy không?",
          answer:
            "Không có câu ‘an toàn cho mọi da’. Nhiều người chịu được nồng độ thấp; một số vẫn đỏ. Không bắt buộc. Patch-test. Đừng chồng với acid mạnh tuần đầu.",
        },
        {
          question: "Bao lâu thì biết da ‘quen’ sản phẩm mới?",
          answer:
            "Không có số đúng. 2–3 đêm patch, rồi vài tuần cả mặt nếu êm. Rát cả ngày không phải ‘đang quen’. Ảnh theo tuần thật hơn cảm giác từng đêm.",
        },
      ],
    };
  }

  return {
    title: "Sensitive skin in humid heat: fewer triggers, one change at a time",
    description:
      "Easy redness, sting, or itch after a new bottle in humid heat? A short routine, patch tests, a wearable SPF — no stacked acids. DaDiary Beta: no diagnosis — then a photo for a gentle routine.",
    kicker: "Sensitive skin",
    lede:
      "This page does not diagnose ‘sensitive skin’ for you. Many things flush a face: fragrance, acids, sun, a helmet, air-con. Lower-harm moves: fewer bottles, less stacking, knowing when to get care. DaDiary is in Beta — tips, not a clinic.",
    heroFigure: hero,
    sections: [
      {
        heading: "Sensitive versus an allergy",
        paragraphs: [
          "Online, ‘sensitive’ often means: flushes, stings, itches easily. Contact allergy is a different problem — usually a clinician, sometimes tests.",
          "You do not have to name a disease from an article. The job here: lower irritation, not guess a diagnosis.",
        ],
        subsections: [
          {
            heading: "Common signals — not a diagnosis",
            paragraphs: [
              "Sting on application, spreading red after a new bottle, cheek itch under air-con. It can also just be a dry barrier — read the [dry-skin guide](/guides/da-kho) before you buy a ‘repair serum’.",
            ],
            checklist: [
              "Write down new bottles in the last 2 weeks (including sunscreen).",
              "Pause actives if you sting all day.",
              "Don’t trust a ‘redness gone in 3 days’ review — this page does not invent testimonials.",
            ],
          },
          {
            heading: "Spots, redness, and friction",
            paragraphs: [
              "Skin that is breaking out can still be easily irritated. Picking, scrubbing, a dirty helmet liner add red. Calm care and no picking come first — the [acne guide](/guides/mun) covers acids more than this page.",
            ],
          },
        ],
      },
      {
        heading: "A minimal routine while skin is loud",
        paragraphs: [
          "Keep three wearable steps before any serum. Five ‘sensitive’ bottles are still five triggers.",
        ],
        figure: minimal,
        subsections: [
          {
            heading: "Cleanse, moisturize, SPF — stop there",
            paragraphs: [
              "A grit-free, fragrance-light cleanser. A short-ingredient moisturizer. A sunscreen you can wear — gel or lotion, enough, every morning.",
              "Tight in the morning: water, then moisturizer + SPF. Night: remove SPF/dust, moisturize. Makeup after SPF, sheered out.",
            ],
          },
          {
            heading: "Actives wait",
            paragraphs: [
              "Retinol, AHA, BHA, strong vitamin C — not step one on a red face. Read the [beginner retinol guide](/guides/retinol-cho-nguoi-moi) once skin has been calm for a few weeks.",
              "Already on a prescription? Keep that schedule. Don’t add an internet tip on the same area.",
            ],
          },
        ],
      },
      {
        heading: "Patch-test, then the full face",
        paragraphs: [
          "Easily irritated skin plus a full-face first night is how you lose which bottle caused it.",
        ],
        figure: patch,
        checklist: [
          "A tiny amount behind the ear or along the jaw, 2–3 nights.",
          "A brief itch is not the same as sting, swelling, or a spreading rash.",
          "Sting or a rash: wash off, stop, moisturize and wear SPF. Don’t ‘push through’.",
          "One new product at a time — including a sunscreen swap.",
        ],
      },
      {
        heading: "Do this / skip this",
        paragraphs: ["Fewer moves, done steadily, beat a ‘sensitive protocol’ from the internet."],
        doAvoid: {
          doItems: [
            "Gentle cleanse. Moisturizer. SPF every morning.",
            "Patch-test. One change at a time.",
            "Note the bottle and the start date.",
            "Same-angle weekly photos, same window.",
          ],
          avoidItems: [
            "Alcohol toner, salt, toothpaste, rough pads.",
            "Stacking AHA + BHA + retinol in a red week.",
            "Clay masks / at-home peels ‘to clean pores’.",
            "A 3-day promise to end redness.",
          ],
        },
      },
      {
        heading: "Sun, helmets, air-con",
        paragraphs: [
          "Easily flushed skin still burns. If SPF stings, change texture — don’t drop a whole week. Hats and shade help; they do not replace cream.",
          "Helmet straps and masks: friction. A clean liner, no scrubbing when you sweat. Air-con: moisturize, don’t add a midday wash.",
        ],
      },
      {
        heading: "When to see a doctor",
        paragraphs: [
          "Swollen eyes, trouble breathing, a rash spreading fast — emergency care, not a blog. DaDiary does not diagnose allergy or rosacea.",
        ],
        checklist: [
          "A spreading rash, blisters, a swollen face after a product.",
          "Pain, pus, scars forming.",
          "Redness around the eyes with eye strain / vision change — get care, don’t drip a ‘serum’ in.",
          "No calm after a few days of cleanse–moisturize–SPF.",
        ],
      },
      {
        heading: "Photograph skin as it is, then a gentle routine",
        paragraphs: [
          "One same-angle photo, similar light — even on a red day. The suggestion still starts with calm care + SPF. Sign up when you want to keep it. You do not need to be ‘not sensitive’ to use the app.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can sensitive skin wear sunscreen?",
        answer:
          "It should. Skipping SPF often keeps redness and marks around longer. Change texture, patch-test, wear enough — don’t drop a week because one tube disagreed.",
      },
      {
        question: "Should I ‘detox’ and wear nothing?",
        answer:
          "Pausing actives is fine. Dropping moisturizer and SPF under air-con and motorbike sun often makes skin louder. Water + a gentle moisturizer + SPF is minimal, not neglect.",
      },
      {
        question: "Is niacinamide safe for sensitive skin?",
        answer:
          "There is no ‘safe for every face’. Many people tolerate a low amount; some still flush. It is not required. Patch-test. Don’t stack it with strong acids in week one.",
      },
      {
        question: "How long until skin ‘gets used’ to a new product?",
        answer:
          "There is no universal number. 2–3 patch nights, then a few weeks on the full face if calm. All-day sting is not ‘getting used to it’. Weekly photos beat a nightly feeling.",
      },
    ],
  };
}

export const daNhayCam: Record<GuideLocale, GuideArticleCopy> = {
  vi: copy("vi"),
  en: copy("en"),
};
