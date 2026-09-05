import { figure } from "../media";
import type { GuideArticleCopy, GuideLocale } from "../types";

function copy(locale: GuideLocale): GuideArticleCopy {
  const hero = figure(
    "/guides/tham-mun/hero.svg",
    {
      vi: {
        alt: "Hai biểu tượng mặt: vết thâm phẳng bên trái và sẹo đổi địa hình bên phải, minh họa nhẹ không gây sốc.",
        caption: "Thâm thường phẳng. Sẹo đổi ‘địa hình’. Nhiều người có cả hai — gương không thay khám.",
      },
      en: {
        alt: "Two gentle face icons: a flat mark on the left and a terrain-change scar on the right, not graphic.",
        caption: "A mark is usually flat. A scar changes terrain. Many people have both — a mirror is not a diagnosis.",
      },
    },
    locale,
  );
  const protect = figure(
    "/guides/tham-mun/protect.svg",
    {
      vi: {
        alt: "Ba biểu tượng: tuýp chống nắng, mũ, và miếng chà bị gạch bỏ.",
        caption: "SPF, bóng râm, không chà. Không chai nào thay ba việc này.",
      },
      en: {
        alt: "Three icons: a sunscreen tube, a hat, and a crossed-out scrub pad.",
        caption: "SPF, shade, no scrubbing. No bottle replaces these three.",
      },
    },
    locale,
  );
  const weekly = figure(
    "/guides/tham-mun/weekly.svg",
    {
      vi: {
        alt: "Cùng một cửa sổ và cùng góc điện thoại trên lịch hai tuần — so ảnh, không phải trước-sau quảng cáo.",
        caption: "Cùng cửa sổ thì dễ đọc. Nắng gắt làm ảnh trông đậm hơn — chưa chắc vết đang ‘đi xuống’.",
      },
      en: {
        alt: "The same window and phone angle across two weeks — comparing photos, not an ad before-and-after.",
        caption: "Same window is easier to read. Harsh sun makes a photo look darker — not always a worse mark.",
      },
    },
    locale,
  );

  if (locale === "vi") {
    return {
      title: "Thâm mụn nóng ẩm: SPF, kiên nhẫn, không chà",
      description:
        "Thâm nâu sau mụn dễ đậm vì nắng và nặn. SPF mỗi sáng, không chà, không hứa hết trong 7 ngày — chụp ảnh theo tuần và nhận routine nhẹ.",
      kicker: "Thâm mụn",
      lede:
        "Mình không bán ‘hết thâm 7 ngày’. Vết nâu sau mụn hay gặp trên da dễ sắc tố, càng rõ khi nắng ẩm và hay nặn. Việc ít hại: bảo vệ nắng, để da yên, biết khi nào cần bác sĩ.",
      heroFigure: hero,
      sections: [
        {
          heading: "Thâm khác sẹo lõm như thế nào",
          paragraphs: [
            "Thâm thường phẳng, nâu hoặc xám, chỗ từng có mụn. Sẹo lõm hay lồi là thay đổi địa hình da.",
            "Thâm có thể lắng khi hết viêm và ít nắng. Không ai trên trang này cam kết số tuần.",
            "Viêm + UV là đôi bạn của sắc tố. Xe máy, sân trường, cửa sổ văn phòng đều tính. Mồ hôi không ‘rửa thâm’, nhưng chà khi đổ mồ hôi làm da thêm kích.",
          ],
        },
        {
          heading: "Việc nên làm trước serum trị thâm",
          paragraphs: [
            "Còn mụn viêm: ưu tiên dịu + không nặn + SPF. Serum trị thâm trên da đang rát thường thành chuyện kích ứng.",
          ],
          figure: protect,
          subsections: [
            {
              heading: "SPF mỗi sáng là bước rẻ nhất",
              paragraphs: [
                "Gel hoặc fluid, hai ngón tay, cổ và tai trước. Thoa lại khi ở ngoài lâu. Bỏ nắng để ‘da thở’ thường là bỏ thời gian thâm đang lắng.",
              ],
            },
            {
              heading: "Một hoạt chất, chậm — sau khi da êm",
              paragraphs: [
                "Nhiều thành phần được nhắc cho thâm (azelaic, niacinamide, vitamin C ổn định, retinoid…). Không thứ nào thay SPF và không nặn.",
                "Chọn một, patch-test 2–3 đêm, vài buổi tối, dưỡng sau. Đang dùng đơn trị mụn: hỏi bác sĩ trước.",
              ],
            },
          ],
        },
        {
          heading: "Nên làm / nên tránh",
          paragraphs: [
            "Review trên mạng không phải da bạn. Trang này cũng không bịa đánh giá.",
          ],
          doAvoid: {
            doItems: [
              "Không nặn. Không chà.",
              "SPF mỗi sáng, kể cả ngày mây và văn phòng có cửa sổ.",
              "Mũ, bóng râm khi nắng gắt — bổ sung, không thay kem.",
              "Ảnh cùng góc, cùng khung giờ, mỗi tuần.",
            ],
            avoidItems: [
              "Muối, kem đánh răng, bột C tự pha, miếng ráp.",
              "Hứa hẹn 3–7 ngày.",
              "Che dày rồi quên SPF.",
              "Mua năm kem trị thâm trong một tuần.",
            ],
          },
        },
        {
          heading: "Checklist 3–4 tuần",
          paragraphs: ["Rồi hãy đánh giá ảnh. Đừng phóng to một điểm dưới đèn điện thoại."],
          figure: weekly,
          checklist: [
            "Không nặn, không chà, không peel mạnh tại nhà.",
            "Rửa dịu sau mồ hôi; dưỡng mỏng.",
            "Một thay đổi sản phẩm mỗi lần, patch-test.",
            "Vết lõm, đau, lan, hoặc thâm kèm ngứa dữ: gặp bác sĩ.",
          ],
        },
        {
          heading: "Nắng, mưa, máy lạnh",
          paragraphs: [
            "Đừng ngồi chờ ‘hết thâm rồi hãy chống nắng’. Mưa vẫn có UV. Máy lạnh làm da khô — khô rồi chà cũng làm thâm chậm lắng.",
            "Ảnh dưới nắng gắt trông đậm hơn ảnh trong nhà. Giữ cùng một cửa sổ khi check-in thì dễ đọc hơn cảm giác từng đêm.",
          ],
        },
        {
          heading: "Khi nào gặp bác sĩ",
          paragraphs: [
            "Laser, peel phòng khám, thuốc bôi mạnh là việc của bác sĩ — không phải livestream. DaDiary không đo phần trăm hết thâm.",
          ],
          checklist: [
            "Sẹo đang thành, mụn nang.",
            "Thâm lan bất thường, ngứa nhiều.",
            "Vết không giống ‘chỗ từng mụn’.",
          ],
        },
        {
          heading: "Chụp ảnh theo tuần, nhận routine nhẹ",
          paragraphs: [
            "Một ảnh cùng góc, ánh sáng gần giống, mỗi tuần. Gợi ý vẫn bắt đầu từ dịu + SPF. Đăng ký khi muốn lưu streak. Thâm cần thời gian; thói quen cần nhẹ.",
          ],
        },
      ],
      faqs: [
        {
          question: "Thâm mụn bao lâu thì nhạt?",
          answer:
            "Không có số đúng cho mọi vết. Vài tuần đến nhiều tháng đều gặp. Ảnh cùng góc theo tuần thật hơn mốc 7 ngày trên quảng cáo.",
        },
        {
          question: "Vitamin C có bắt buộc không?",
          answer:
            "Không. SPF và không chà quan trọng hơn một chai C. Nếu dùng: công thức ổn định, patch-test, không chồng acid cùng tuần đầu.",
        },
        {
          question: "Ở trong nhà có cần chống nắng khi đang trị thâm?",
          answer:
            "Gần cửa sổ hoặc ra ngoài thì nên. Đừng biến một buổi trong nhà thành lý do bỏ cả tuần SPF.",
        },
        {
          question: "Có nên đi peel hoặc laser?",
          answer:
            "Quyết định với bác sĩ da liễu, sau khi da đủ êm. Tự peel mạnh ở nhà dễ thâm thêm. DaDiary không chỉ định thủ thuật.",
        },
      ],
    };
  }

  return {
    title: "Post-acne marks in humid heat: SPF, patience, no scrubbing",
    description:
      "Brown marks darken with sun and picking. Morning SPF, no scrubbing, no 7-day promise — weekly photos and a gentle starter routine.",
    kicker: "Marks",
    lede:
      "This page does not sell a 7-day fade. Flat brown marks after acne are common on skin that pigments easily, and louder in humid sun if you pick. Lower-harm moves: sun care, leaving skin alone, knowing when to see a doctor.",
    heroFigure: hero,
    sections: [
      {
        heading: "A mark versus a dented scar",
        paragraphs: [
          "A mark is usually flat, brown or grey, where a spot lived. A dented or raised scar is a change in terrain.",
          "Marks may ease when inflammation ends and UV stays lower. Nobody here promises a week count.",
          "Inflammation plus UV is a familiar pair for pigment. Motorbikes, school yards, and office windows all count. Sweat does not wash a mark off, but rubbing sweaty skin adds irritation.",
        ],
      },
      {
        heading: "Before a ‘brightening’ serum",
        paragraphs: [
          "If spots are still inflamed: calm care, no picking, SPF. A fading serum on stinging skin often becomes an irritation story.",
        ],
        figure: protect,
        subsections: [
          {
            heading: "Morning SPF is the cheapest step",
            paragraphs: [
              "A gel or fluid, two fingers, neck and the front of the ears. Reapply when you stay outside. Skipping sun care so skin can ‘breathe’ often skips the time a mark was fading.",
            ],
          },
          {
            heading: "One active, slowly — after skin is calm",
            paragraphs: [
              "Many ingredients get mentioned for marks (azelaic, niacinamide, stable vitamin C, retinoids…). None replace SPF and not picking.",
              "Pick one, patch-test 2–3 nights, a few evenings, moisturizer after. On a prescribed acne cream? Ask first.",
            ],
          },
        ],
      },
      {
        heading: "Do this / skip this",
        paragraphs: [
          "Internet reviews are not your face. This page does not invent testimonials.",
        ],
        doAvoid: {
          doItems: [
            "No picking. No scrubbing.",
            "SPF every morning, including cloudy days and windowed offices.",
            "Hat and shade in harsh sun — extras, not a sunscreen replacement.",
            "Same-angle photos, same time of day, weekly.",
          ],
          avoidItems: [
            "Salt, toothpaste, DIY vitamin C powder, rough pads.",
            "A 3–7 day promise.",
            "Heavy concealer, forgotten SPF.",
            "Five fade creams in one week.",
          ],
        },
      },
      {
        heading: "3–4 week checklist",
        paragraphs: ["Then judge photos. Don’t zoom one pixel under phone flash."],
        figure: weekly,
        checklist: [
          "No picking, no scrubbing, no strong at-home peels.",
          "Gentle cleanse after sweat; thin moisturizer.",
          "One product change at a time, patch-tested.",
          "Dents, pain, spreading, or a very itchy mark: see a clinician.",
        ],
      },
      {
        heading: "Sun, rain, air-con",
        paragraphs: [
          "Don’t wait until a mark is ‘gone’ to start sun care. Rain still has UV. Air-con dries skin — tight-then-scrub also slows marks.",
          "A photo in harsh sun looks darker than a hallway shot. Same window for check-ins is easier to read than a late-night feeling.",
        ],
      },
      {
        heading: "When to see a doctor",
        paragraphs: [
          "Clinic lasers, peels, and strong prescription fade creams belong with a clinician — not a livestream. DaDiary does not quote fade percentages.",
        ],
        checklist: [
          "Scars forming, cysts.",
          "A mark spreading oddly, a lot of itch.",
          "A patch that does not look like an old spot.",
        ],
      },
      {
        heading: "Weekly photos, then a gentle routine",
        paragraphs: [
          "One same-angle photo, similar light, each week. The suggestion still starts with calm care + SPF. Sign up when you want to keep a streak. Marks need time; habits need to stay kind.",
        ],
      },
    ],
    faqs: [
      {
        question: "How long until a post-acne mark fades?",
        answer:
          "There is no universal number. Weeks to many months are all common. Weekly same-angle photos beat a 7-day ad claim.",
      },
      {
        question: "Is vitamin C required?",
        answer:
          "No. SPF and not scrubbing matter more than one C bottle. If you use it: a stable formula, patch-test, no extra acids in week one.",
      },
      {
        question: "Do I need sunscreen indoors while fading a mark?",
        answer:
          "Yes if you sit by a window or go out. Don’t turn one indoor afternoon into a week without SPF.",
      },
      {
        question: "Should I get a peel or laser?",
        answer:
          "A decision with a dermatologist, after skin is calm enough. Strong peels at home often darken marks. DaDiary does not prescribe procedures.",
      },
    ],
  };
}

export const thamMun: Record<GuideLocale, GuideArticleCopy> = {
  vi: copy("vi"),
  en: copy("en"),
};
