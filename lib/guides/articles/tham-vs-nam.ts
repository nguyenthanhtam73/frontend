import { figure } from "../media";
import type { GuideArticleCopy, GuideLocale } from "../types";

function copy(locale: GuideLocale): GuideArticleCopy {
  const hero = figure(
    "/guides/tham-vs-nam/hero.svg",
    {
      vi: {
        alt: "Hai biểu tượng mặt nhẹ: vết nhỏ chỗ từng mụn bên trái và mảng rộng hơn trên má bên phải — không phải ảnh bệnh.",
        caption: "Vết sau mụn và mảng nám có thể trông gần nhau trên ảnh điện thoại. Gương không thay khám.",
      },
      en: {
        alt: "Two gentle face icons: a small mark where a spot lived on the left, a wider cheek patch on the right — not a medical photo.",
        caption: "A post-spot mark and a larger patch can look similar on a phone. A mirror is not a visit.",
      },
    },
    locale,
  );
  const sun = figure(
    "/guides/tham-vs-nam/sun.svg",
    {
      vi: {
        alt: "Tuýp chống nắng, mũ, và cửa sổ có nắng — ba việc chung cho thâm lẫn mảng sắc tố.",
        caption: "SPF, mũ, bóng râm. Việc này không chẩn bạn đang thâm hay nám.",
      },
      en: {
        alt: "A sunscreen tube, a hat, and a sunny window — shared jobs for a mark or a pigment patch.",
        caption: "SPF, a hat, shade. These do not diagnose a mark versus melasma.",
      },
    },
    locale,
  );
  const weekly = figure(
    "/guides/tham-vs-nam/weekly.svg",
    {
      vi: {
        alt: "Cùng một cửa sổ trên lịch hai tuần — so ảnh, không phải trước-sau quảng cáo trị nám.",
        caption: "Cùng cửa sổ thì dễ đọc. Nắng gắt làm ảnh trông đậm hơn — chưa chắc vết đang ‘đi xuống’.",
      },
      en: {
        alt: "The same window across two weeks on a calendar — comparing photos, not a fade-ad before-and-after.",
        caption: "Same window is easier to read. Harsh sun makes a photo look darker — not always a worse patch.",
      },
    },
    locale,
  );

  if (locale === "vi") {
    return {
      title: "Thâm sau mụn và nám: phân biệt thận trọng, chống nắng",
      description:
        "Thâm chỗ từng mụn khác nám như thế nào? Bài này không chẩn — chỉ gợi ý quan sát và SPF. DaDiary Beta: không hứa hết 7 ngày — chụp ảnh theo tuần.",
      kicker: "Thâm và nám",
      lede:
        "Mình không nhìn ảnh rồi ghi ‘nám’ hay ‘thâm’ giúp bạn. Hai việc hay bị gọi chung, càng dễ lẫn trên nắng ẩm và điện thoại. Việc ít hại giống nhau: chống nắng, không chà, biết khi nào gặp bác sĩ. DaDiary đang Beta: gợi ý, không chẩn bệnh.",
      heroFigure: hero,
      sections: [
        {
          heading: "Hai việc hay bị gọi một tên — chưa phải chẩn đoán",
          paragraphs: [
            "Thâm sau mụn người ta hay mô tả: vết phẳng, nâu hoặc xám, đúng chỗ từng đỏ hoặc từng nặn. Nám trên mạng hay được gọi khi mảng rộng hơn, đối xứng má–trán–mép, không nhớ ‘ổ mụn nào’.",
            "Nhiều người có cả vết nhỏ và mảng. Ánh sáng, máy lạnh, lớp nền làm ảnh đổi màu. Một bài không đủ để đặt tên. Nếu không chắc — đó là lý do gặp bác sĩ, không phải lý do mua năm kem trị nám.",
          ],
          subsections: [
            {
              heading: "Thâm sau mụn thường gắn với một chỗ cũ",
              paragraphs: [
                "Hay gặp sau mụn viêm, sau nặn, sau một tuần nắng. Vết thường khu trú. Thời gian lắng không có số đúng — vài tuần đến nhiều tháng đều gặp. Việc ít hại nằm ở [thâm mụn](/guides/tham-mun): SPF, không chà, không hứa 7 ngày.",
              ],
            },
            {
              heading: "Nám không phải việc tự đặt tên từ TikTok",
              paragraphs: [
                "Mảng sắc tố rộng, tái đi tái lại, đậm hơn sau nắng hoặc sau thay đổi nội tiết — nhiều bác sĩ gọi là nám khi khám. Trang này không khám. Đừng tự uống thuốc, đừng tự peel mạnh vì một video.",
              ],
            },
          ],
        },
        {
          heading: "Việc chung: nắng, không chà — trước serum ‘trị nám’",
          paragraphs: [
            "Dù bạn đang nghĩ thâm hay nám, UV làm sắc tố dễ đậm. Xe máy, sân trường, cửa sổ văn phòng đều tính. Mồ hôi không ‘rửa nám’, nhưng chà khi đổ mồ hôi làm da thêm kích.",
          ],
          figure: sun,
          subsections: [
            {
              heading: "SPF mỗi sáng là bước rẻ nhất",
              paragraphs: [
                "Gel hoặc fluid, hai ngón tay, cổ và tai trước. Thoa lại khi ở ngoài lâu. Bỏ nắng để ‘da thở’ thường là bỏ thời gian vết đang lắng. Cách thoa ở [kem chống nắng](/guides/kem-chong-nang).",
              ],
            },
            {
              heading: "Một hoạt chất, chậm — sau khi da êm",
              paragraphs: [
                "Nhiều thành phần được nhắc cho sắc tố (azelaic, niacinamide, vitamin C ổn định, retinoid…). Không thứ nào thay SPF và không chà. Chọn một, patch-test, vài buổi tối. Đang có đơn trị nám hoặc trị mụn: hỏi bác sĩ trước.",
                "Da còn đỏ vì acid: dịu trước — [kích ứng sau adapalene hoặc BHA](/guides/kich-ung-adapalene). Serum trị thâm trên da đang rát hay thành chuyện kích.",
              ],
            },
          ],
        },
        {
          heading: "Nên làm / nên tránh",
          paragraphs: ["Review trên mạng không phải da bạn. Trang này cũng không bịa đánh giá."],
          doAvoid: {
            doItems: [
              "SPF mỗi sáng, kể cả ngày mây và gần cửa sổ.",
              "Mũ, bóng râm khi nắng gắt — bổ sung, không thay kem.",
              "Ảnh cùng góc, cùng khung giờ, mỗi tuần.",
              "Không chắc là thâm hay nám: hỏi bác sĩ, đừng tự chẩn.",
            ],
            avoidItems: [
              "Muối, bột C tự pha, kem đánh răng, miếng ráp.",
              "Hứa hẹn hết nám 3–7 ngày.",
              "Mua năm kem trị nám trong một tuần.",
              "Laser hoặc peel nhà vì một livestream.",
            ],
          },
        },
        {
          heading: "Checklist 3–4 tuần",
          paragraphs: ["Rồi hãy nhìn ảnh. Đừng phóng to một điểm dưới đèn điện thoại."],
          figure: weekly,
          checklist: [
            "Không chà, không nặn, không peel mạnh tại nhà.",
            "SPF đủ lượng mỗi sáng. Mũ khi nắng gắt.",
            "Một thay đổi sản phẩm mỗi lần, patch-test.",
            "Mảng lan lạ, ngứa nhiều, hoặc không giống chỗ từng mụn: gặp bác sĩ.",
          ],
        },
        {
          heading: "Khi nào gặp bác sĩ",
          paragraphs: [
            "Thuốc bôi mạnh, thủ thuật, và việc đặt tên nám thuộc phòng khám. DaDiary không đo phần trăm hết thâm hay hết nám.",
          ],
          checklist: [
            "Mảng lan nhanh, đổi màu lạ, ngứa hoặc đau.",
            "Vết không gắn với chỗ từng mụn — và bạn muốn một tên, không phải đoán.",
            "Đang mang thai, cho con bú, hoặc sắc tố đổi sau thuốc mới.",
            "Sẹo đang thành, mụn nang — ưu tiên khám hơn serum trị thâm.",
          ],
        },
        {
          heading: "Chụp ảnh theo tuần — không phải để ‘chẩn nám’",
          paragraphs: [
            "Một ảnh cùng góc, ánh sáng gần giống, mỗi tuần. Gợi ý vẫn bắt đầu từ dịu + SPF, không ghi chẩn đoán lên mặt bạn. [Bắt đầu bằng ảnh](/onboarding) nếu chưa có routine; đã vào app thì [check-in cùng cửa sổ](/check-in). Đăng ký khi muốn lưu streak. Sắc tố cần thời gian; thói quen cần nhẹ.",
          ],
        },
      ],
      faqs: [
        {
          question: "Nhìn gương có biết mình bị nám hay chỉ thâm mụn không?",
          answer:
            "Không chắc. Vết nhỏ chỗ từng mụn khác mảng rộng trên má — nhưng ánh sáng và lớp nền đánh lừa. Bài này không chẩn. Không chắc thì hỏi bác sĩ.",
        },
        {
          question: "Chống nắng có hết nám không?",
          answer:
            "Không có lời hứa hết nám ở đây. SPF giúp sắc tố ít đậm thêm vì nắng. Đó là việc ít hại, không phải đơn trị nám.",
        },
        {
          question: "Vitamin C hoặc tranexamic mua kệ có phải thuốc nám không?",
          answer:
            "Mỹ phẩm kệ không phải đơn. Một số người dùng được khi da êm; không bắt buộc. Người mới: SPF và không chà trước. Đang có đơn: hỏi trước khi chồng thêm.",
        },
        {
          question: "Có nên đi laser vì sợ nám?",
          answer:
            "Quyết định với bác sĩ da liễu, sau khi da đủ êm. Tự peel mạnh ở nhà dễ thâm thêm. DaDiary không chỉ định thủ thuật.",
        },
      ],
    };
  }

  return {
    title: "Post-acne marks and melasma: a cautious split, then sun care",
    description:
      "A mark after a spot versus a wider patch people call melasma? This page does not diagnose — it shares cautious clues and SPF. DaDiary Beta: no 7-day fade — weekly photos.",
    kicker: "Marks and melasma",
    lede:
      "This page will not look at a photo and write ‘melasma’ or ‘a mark’ for you. The two get one nickname, and they blur more in humid sun and on a phone. The shared lower-harm jobs: sun care, no scrubbing, knowing when to see a clinician. DaDiary is in Beta: tips, not a diagnosis.",
    heroFigure: hero,
    sections: [
      {
        heading: "Two jobs, one nickname — not a diagnosis",
        paragraphs: [
          "A post-acne mark is often described as flat, brown or grey, exactly where a red spot or a pick lived. Melasma is the word people use online for a wider patch, often on the cheeks, forehead, or upper lip, with no remembered ‘which pimple’.",
          "Many people have both small marks and a wider patch. Light, air-con, and makeup shift a photo. An article is not enough to name it. If you are unsure — that is a reason to see a clinician, not a reason to buy five fade creams.",
        ],
        subsections: [
          {
            heading: "A post-acne mark usually sits on an old spot",
            paragraphs: [
              "Common after an inflamed spot, after picking, after a sunny week. The mark is usually local. Fade time has no universal number — weeks to many months are all common. Lower-harm care is in the [marks guide](/guides/tham-mun): SPF, no scrubbing, no 7-day promise.",
            ],
          },
          {
            heading: "Melasma is not a name you give yourself from TikTok",
            paragraphs: [
              "A wider pigment patch that comes and goes, darker after sun or after a hormone shift — clinicians may call that melasma in a visit. This page is not a visit. Don’t self-start a pill or a strong peel because of a video.",
            ],
          },
        ],
      },
      {
        heading: "The shared job: sun, no scrub — before a ‘melasma’ serum",
        paragraphs: [
          "Whether you are thinking mark or melasma, UV makes pigment easier to darken. Motorbikes, school yards, office windows all count. Sweat does not wash a patch off, but rubbing sweaty skin adds irritation.",
        ],
        figure: sun,
        subsections: [
          {
            heading: "Morning SPF is the cheapest step",
            paragraphs: [
              "A gel or fluid, two fingers, neck and the front of the ears. Reapply when you stay outside. Skipping sun care so skin can ‘breathe’ often skips the time a mark was fading. How to wear it is in the [sunscreen guide](/guides/kem-chong-nang).",
            ],
          },
          {
            heading: "One active, slowly — after skin is calm",
            paragraphs: [
              "Many ingredients get mentioned for pigment (azelaic, niacinamide, stable vitamin C, retinoids…). None replace SPF and not scrubbing. Pick one, patch-test, a few evenings. Already on a prescribed fade or acne cream: ask first.",
              "Still red from an acid: soothe first — [irritation after adapalene or BHA](/guides/kich-ung-adapalene). A fade serum on stinging skin often becomes an irritation story.",
            ],
          },
        ],
      },
      {
        heading: "Do this / skip this",
        paragraphs: ["Internet reviews are not your face. This page does not invent testimonials."],
        doAvoid: {
          doItems: [
            "SPF every morning, including cloudy days and near windows.",
            "Hat and shade in harsh sun — extras, not a sunscreen replacement.",
            "Same-angle photos, same time of day, weekly.",
            "Unsure if it is a mark or melasma: ask a clinician, don’t self-diagnose.",
          ],
          avoidItems: [
            "Salt, DIY vitamin C powder, toothpaste, rough pads.",
            "A 3–7 day ‘melasma gone’ promise.",
            "Five fade creams in one week.",
            "A home laser or peel because of a livestream.",
          ],
        },
      },
      {
        heading: "3–4 week checklist",
        paragraphs: ["Then look at photos. Don’t zoom one pixel under phone flash."],
        figure: weekly,
        checklist: [
          "No scrubbing, no picking, no strong at-home peels.",
          "Enough SPF every morning. A hat in harsh sun.",
          "One product change at a time, patch-tested.",
          "A patch spreading oddly, a lot of itch, or not like an old spot: see a clinician.",
        ],
      },
      {
        heading: "When to see a doctor",
        paragraphs: [
          "Strong prescription creams, procedures, and the name ‘melasma’ belong in a clinic. DaDiary does not quote fade percentages.",
        ],
        checklist: [
          "A patch spreading fast, an odd color change, itch or pain.",
          "A mark that does not sit on an old spot — and you want a name, not a guess.",
          "Pregnant, breastfeeding, or pigment that changed after a new medicine.",
          "Scars forming, cysts — a visit before a fade serum.",
        ],
      },
      {
        heading: "Weekly photos — not to ‘diagnose melasma’",
        paragraphs: [
          "One same-angle photo, similar light, each week. The suggestion still starts with calm care + SPF, and does not stamp a diagnosis on your face. [Start with a photo](/onboarding) if you have no routine yet; if you already use the app, [check in at the same window](/check-in). Sign up when you want a streak. Pigment needs time; habits need to stay kind.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can I tell melasma from a post-acne mark in the mirror?",
        answer:
          "Not for sure. A small mark on an old spot is different from a wide cheek patch — but light and makeup lie. This page does not diagnose. If you are unsure, ask a clinician.",
      },
      {
        question: "Will sunscreen clear melasma?",
        answer:
          "There is no ‘melasma gone’ promise here. SPF helps pigment darken less from the sun. That is a lower-harm job, not a melasma prescription.",
      },
      {
        question: "Are shelf vitamin C or tranexamic a melasma drug?",
        answer:
          "Shelf cosmetics are not a prescription. Some people use them when skin is calm; they are not required. Beginners: SPF and no scrubbing first. Already on a prescription: ask before you layer more.",
      },
      {
        question: "Should I get a laser because I fear melasma?",
        answer:
          "A decision with a dermatologist, after skin is calm enough. Strong peels at home often darken marks. DaDiary does not prescribe procedures.",
      },
    ],
  };
}

export const thamVsNam: Record<GuideLocale, GuideArticleCopy> = {
  vi: copy("vi"),
  en: copy("en"),
};
