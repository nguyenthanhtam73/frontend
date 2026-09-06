import { figure } from "../media";
import type { GuideArticleCopy, GuideLocale } from "../types";

function copy(locale: GuideLocale): GuideArticleCopy {
  const hero = figure(
    "/guides/kich-ung-adapalene/hero.svg",
    {
      vi: {
        alt: "Mặt giản lược hơi đỏ cạnh hai chai không nhãn bị gạch — adapalene hoặc BHA khi da đang rát.",
        caption: "Rát cả ngày là tín hiệu dừng kích, không phải ‘cố cho da quen’.",
      },
      en: {
        alt: "A slightly flushed simple face next to two crossed-out unlabeled bottles — adapalene or BHA on stinging skin.",
        caption: "All-day sting is a stop signal, not a reason to ‘push through’.",
      },
    },
    locale,
  );
  const pause = figure(
    "/guides/kich-ung-adapalene/pause.svg",
    {
      vi: {
        alt: "Ba bước khi da đang kích: rửa dịu, dưỡng mỏng, kem chống nắng — không thêm acid.",
        caption: "Rửa dịu · dưỡng · SPF. Acid và tẩy hạt để sang một bên.",
      },
      en: {
        alt: "Three steps on irritated skin: gentle cleanse, thin moisturizer, sunscreen — no extra acid.",
        caption: "Gentle cleanse · moisturizer · SPF. Acids and scrubs wait.",
      },
    },
    locale,
  );
  const flags = figure(
    "/guides/kich-ung-adapalene/flags.svg",
    {
      vi: {
        alt: "Cửa phòng khám và dấu cảnh báo nhẹ: sưng, mủ, ban lan — không phải ảnh da tổn thương.",
        caption: "Sưng, mủ, ban lan, mắt sưng: dừng sản phẩm, đi khám. Đừng tăng acid.",
      },
      en: {
        alt: "A clinic door and a gentle warning mark: swelling, pus, a spreading rash — not an injury photo.",
        caption: "Swelling, pus, a spreading rash, swollen eyes: stop the product, get care. Don’t raise acid.",
      },
    },
    locale,
  );

  if (locale === "vi") {
    return {
      title: "Kích ứng sau adapalene hoặc BHA: dừng kích, dịu da",
      description:
        "Da rát, bong, đỏ sau adapalene hoặc BHA? Dừng chất kích, dưỡng mỏng, SPF — biết dấu hiệu cần bác sĩ. DaDiary Beta: không chẩn bệnh — chụp ảnh khi da đang êm.",
      kicker: "Kích ứng hàng rào",
      lede:
        "Mình không bảo bạn ‘cố chịu cho quen’. Adapalene và BHA trên kệ không phải đơn thuốc, và da đang rát cả ngày cũng không phải lúc chồng thêm acid. Việc ít hại: bớt kích, dịu da, biết khi nào gặp bác sĩ. DaDiary đang Beta: gợi ý, không chẩn bệnh.",
      heroFigure: hero,
      sections: [
        {
          heading: "Da đang kêu khác với ‘đang chạy’",
          paragraphs: [
            "Người mới hay nghe ‘purge’ rồi tăng lượng. Trang này không phân biệt purge và kích ứng từ một bài hay một ảnh. Cảm giác hay gặp: rát khi thoa, đỏ lan, bong mỏng, căng như giấy.",
            "Êm hơn buổi sáng hôm sau thì có thể chỉ là da đang học. Rát cả ngày, nẻ chảy, ban, sưng — đó là lúc dừng chất kích, không phải lúc ‘cố thêm’.",
          ],
          subsections: [
            {
              heading: "Adapalene kệ khác đơn bác sĩ",
              paragraphs: [
                "Adapalene trên kệ là retinoid mỹ phẩm. Gel theo đơn là chuyện khác — liều và cách dừng thuộc bác sĩ, không thuộc một bài. Đang có đơn: hỏi trước khi tự ngưng hoặc tự thêm BHA lên cùng vùng.",
                "Retinol kệ cũng không phải bước cứu khi da đang nẻ — xem [retinol cho người mới](/guides/retinol-cho-nguoi-moi) khi da đã êm.",
              ],
            },
            {
              heading: "BHA không ‘rửa sạch nhân’",
              paragraphs: [
                "BHA (thường là salicylic) hay được nhắc cho da dầu, mụn ẩn. Nó vẫn có thể khô và rát, nhất là mỗi đêm từ tuần đầu hoặc chồng với adapalene. Việc chậm hơn nằm ở [mụn ẩn](/guides/mun-an).",
              ],
            },
          ],
        },
        {
          heading: "Dừng chất kích — rồi mới dịu",
          paragraphs: [
            "Mục tiêu vài ngày đầu: da chịu được rửa và dưỡng, không thêm biến. Không phải ‘phục hồi 48 giờ’ trên quảng cáo.",
          ],
          figure: pause,
          subsections: [
            {
              heading: "Tạm để sang một bên",
              paragraphs: [
                "Adapalene, BHA, AHA, retinol, vitamin C mạnh, tẩy hạt, mask đất sét, toner cồn, máy rửa mặt. Một tuần một thay đổi thì dễ biết chai nào đang làm chuyện. Đang rát: dừng cả nhóm, đừng chỉ đổi sang acid ‘dịu hơn’.",
              ],
            },
            {
              heading: "Giữ ba việc ít hại",
              paragraphs: [
                "Rửa dịu, không sạch bóng. Dưỡng mỏng khi da hơi ẩm. SPF mỗi sáng — kể cả khi ở nhà gần cửa sổ. Bỏ nắng vì da đang đỏ thường làm thâm đậm hơn, không làm hàng rào khỏe hơn.",
                "Da dễ đỏ sẵn: khung tối giản ở [da nhạy cảm](/guides/da-nhay-cam). Nền 3 bước ở [routine người mới](/guides/routine-cham-da).",
              ],
            },
          ],
        },
        {
          heading: "Nên làm / nên tránh",
          paragraphs: ["Không có review bịa trên trang này. Da bạn không phải trước-sau trên ads."],
          doAvoid: {
            doItems: [
              "Dừng acid và tẩy khi rát cả ngày hoặc nẻ.",
              "Rửa dịu, dưỡng mỏng, SPF mỗi sáng.",
              "Ảnh cùng góc, cùng cửa sổ — thấy đỏ lắng hay lan.",
              "Đơn bác sĩ: hỏi trước khi tự ngưng adapalene.",
            ],
            avoidItems: [
              "Chồng BHA + adapalene + peel ‘cho nhanh’.",
              "Muối, kem đánh răng, miếng ráp, đá chà.",
              "Gọi mọi đỏ là purge rồi tăng lượng.",
              "Bỏ hết, kể cả dưỡng và SPF, rồi ngồi chờ ‘da tự lành’.",
            ],
          },
        },
        {
          heading: "Checklist vài ngày dịu da",
          paragraphs: [
            "Làm trước khi nghĩ tới đêm adapalene hay BHA tiếp. Gương lúc 11 giờ đêm hay thổi phồng.",
          ],
          checklist: [
            "Không acid, không hạt, không mask đất mỗi ngày.",
            "Rửa dịu sáng tối; thêm lần chỉ khi mồ hôi nhiều.",
            "Dưỡng mỏng sau rửa. Da dầu đang rát vẫn cần hàng rào.",
            "SPF mỗi sáng, kết cấu chịu được — xem [kem chống nắng](/guides/kem-chong-nang).",
            "Một ảnh cùng cửa sổ. Không zoom một điểm dưới đèn flash.",
            "Sưng, mủ, ban lan, mắt sưng: đi khám — đừng tự tăng chai.",
          ],
        },
        {
          heading: "Khi nào gặp bác sĩ",
          paragraphs: [
            "DaDiary không kê đơn, không bảo bạn ngưng thuốc, không đo ‘bao nhiêu phần trăm hàng rào’. Khám sớm hơn tip mới nếu da đang tổn.",
          ],
          figure: flags,
          checklist: [
            "Sưng, mủ, đau nhiều, sốt, ban lan nhanh.",
            "Mắt sưng, khó thở, môi phù sau sản phẩm — dừng, đi cấp cứu nếu cần.",
            "Nẻ chảy không dịu sau vài ngày chỉ rửa–dưỡng–SPF.",
            "Đang mang thai, cho con bú, hoặc đang có đơn retinoid — hỏi bác sĩ, đừng tự chỉnh theo bài.",
          ],
        },
        {
          heading: "Chụp ảnh khi da đang êm — rồi hãy hỏi routine",
          paragraphs: [
            "Một ảnh cùng góc khi da đã chịu được rửa–dưỡng–SPF. Gợi ý có thể bảo bạn chờ thêm. Xem routine rồi đăng ký. [Bắt đầu bằng ảnh](/onboarding) nếu chưa vào app; đã có nhật ký thì [check-in cùng cửa sổ](/check-in). Adapalene không phải vé vào cửa DaDiary.",
          ],
        },
      ],
      faqs: [
        {
          question: "Da bong sau adapalene có phải đang hết mụn không?",
          answer:
            "Không có câu đó ở đây. Bong nhẹ có thể gặp. Rát cả ngày, nẻ, ban — dừng chất kích. Mụn nang, đau, sẹo: gặp bác sĩ, đừng tự tăng chai kệ.",
        },
        {
          question: "Có được dùng BHA cùng đêm với adapalene không?",
          answer:
            "Người mới: không. Mỗi thứ đã có thể khô. Chồng hai cái khi da đang đỏ là cách hay gặp để hàng rào kêu. Êm rồi vẫn chỉ một thay đổi mỗi lần.",
        },
        {
          question: "Bao lâu thì được thoa lại?",
          answer:
            "Không có số đúng cho mọi mặt. Da chịu được rửa–dưỡng–SPF vài ngày, không còn nẻ chảy, rồi hãy nghĩ tới một đêm rất mỏng. Đơn bác sĩ: hỏi người kê đơn, đừng tự ‘nghỉ một tuần rồi gấp đôi’.",
        },
        {
          question: "Serum phục hồi có bắt buộc không?",
          answer:
            "Không. Ít thành phần, dưỡng chịu được, SPF — thường đủ để bắt đầu dịu. Chai ‘repair’ thơm nồng vẫn có thể kích. Patch-test nếu vẫn muốn thêm.",
        },
      ],
    };
  }

  return {
    title: "Irritation after adapalene or BHA: pause actives, soothe",
    description:
      "Sting, flakes, or red after adapalene or BHA? Stop irritants, thin moisturizer, SPF — and know when to see a clinician. DaDiary Beta: no diagnosis — photograph calmer skin.",
    kicker: "Barrier irritation",
    lede:
      "This page does not tell you to ‘push through’. Shelf adapalene and BHA are not a prescription, and all-day sting is not the moment to stack another acid. Lower-harm: fewer irritants, soothe, know when to see a clinician. DaDiary is in Beta: tips, not a diagnosis.",
    heroFigure: hero,
    sections: [
      {
        heading: "Skin complaining is not the same as ‘working’",
        paragraphs: [
          "Beginners often hear ‘purge’ and raise the amount. This page cannot tell purge from irritation from an article or one photo. Common feelings: sting on application, spreading red, thin flakes, tight like paper.",
          "Calmer the next morning can just mean skin is learning. All-day sting, splits, a rash, swelling — that is when you pause irritants, not when you push.",
        ],
        subsections: [
          {
            heading: "Shelf adapalene is not a prescription",
            paragraphs: [
              "Shelf adapalene is a cosmetic retinoid. A prescribed gel is different — dose and whether to stop belong with a clinician, not a blog. Already on a prescription: ask before you pause it or add BHA on the same area.",
              "Shelf retinol is also not a rescue on cracked skin — read [retinol for beginners](/guides/retinol-cho-nguoi-moi) once skin is calm.",
            ],
          },
          {
            heading: "BHA does not ‘wash out’ a clog",
            paragraphs: [
              "BHA (often salicylic) gets mentioned for oilier, clogged skin. It can still dry and sting, especially every night from week one or stacked with adapalene. The slower job is in the [clogged-pore guide](/guides/mun-an).",
            ],
          },
        ],
      },
      {
        heading: "Pause irritants — then soothe",
        paragraphs: [
          "The first few days’ job: skin can stand a cleanse and a moisturizer, with no extra noise. It is not a 48-hour ‘repair’ ad.",
        ],
        figure: pause,
        subsections: [
          {
            heading: "Park these for now",
            paragraphs: [
              "Adapalene, BHA, AHA, retinol, strong vitamin C, gritty scrubs, clay masks, high-alcohol toner, a cleansing gadget. One change a week makes the culprit easier to see. Already stinging: pause the whole group — don’t just swap to a ‘gentler’ acid.",
            ],
          },
          {
            heading: "Keep three lower-harm jobs",
            paragraphs: [
              "Gentle cleanse, not squeaky. Thin moisturizer on slightly damp skin. SPF every morning — including near a window. Skipping sun care because skin is red often darkens marks; it does not strengthen a barrier.",
              "Skin that flushes easily: the short frame in [sensitive skin](/guides/da-nhay-cam). The 3-step base is in the [beginner routine](/guides/routine-cham-da).",
            ],
          },
        ],
      },
      {
        heading: "Do this / skip this",
        paragraphs: ["No invented reviews here. Your face is not an ad before-and-after."],
        doAvoid: {
          doItems: [
            "Pause acids and scrubs on all-day sting or splits.",
            "Gentle cleanse, thin moisturizer, SPF every morning.",
            "Same-angle, same-window photos — see if red is settling.",
            "On a prescription: ask before you stop adapalene yourself.",
          ],
          avoidItems: [
            "Stacking BHA + adapalene + a peel ‘to go faster’.",
            "Salt, toothpaste, rough pads, ice scrubs.",
            "Calling every flush a purge and raising the amount.",
            "Stopping everything, including moisturizer and SPF, and waiting for skin to ‘heal itself’.",
          ],
        },
      },
      {
        heading: "A few-day soothe checklist",
        paragraphs: [
          "Do this before you think about the next adapalene or BHA night. The 11 p.m. mirror exaggerates.",
        ],
        checklist: [
          "No acids, no grit, no daily clay.",
          "Gentle cleanse morning and night; extra only after heavy sweat.",
          "Thin moisturizer after cleansing. Oily skin that stings still needs a barrier.",
          "SPF every morning, a texture you can wear — see the [sunscreen guide](/guides/kem-chong-nang).",
          "One same-window photo. Don’t zoom a pixel under flash.",
          "Swelling, pus, a spreading rash, swollen eyes: see a clinician — don’t raise a bottle.",
        ],
      },
      {
        heading: "When to see a doctor",
        paragraphs: [
          "DaDiary does not prescribe, does not tell you to stop a medicine, and does not score ‘barrier percent’. Go earlier than a new tip if skin is injured.",
        ],
        figure: flags,
        checklist: [
          "Swelling, pus, a lot of pain, fever, a fast-spreading rash.",
          "Swollen eyes, trouble breathing, puffy lips after a product — stop, get urgent care if needed.",
          "Splits that do not settle after a few days of cleanse–moisturize–SPF.",
          "Pregnant, breastfeeding, or already on a retinoid prescription — ask a clinician, don’t edit from an article.",
        ],
      },
      {
        heading: "Photograph calmer skin — then ask for a routine",
        paragraphs: [
          "One same-angle photo once skin can stand cleanse–moisturize–SPF. The suggestion may tell you to wait. See the routine, then sign up. [Start with a photo](/onboarding) if you are new; if you already keep a diary, [check in at the same window](/check-in). Adapalene is not the ticket into DaDiary.",
        ],
      },
    ],
    faqs: [
      {
        question: "Do flakes after adapalene mean acne is clearing?",
        answer:
          "There is no claim like that here. Light flakes can happen. All-day sting, splits, a rash — pause irritants. Cysts, pain, scars: see a clinician, don’t raise a shelf bottle.",
      },
      {
        question: "Can I use BHA the same night as adapalene?",
        answer:
          "If you are new: no. Each can dry on its own. Stacking both on a red face is a common way to make the barrier complain. Even when calm, one change at a time.",
      },
      {
        question: "How soon can I put it back on?",
        answer:
          "There is no universal number. When cleanse–moisturize–SPF is tolerable for a few days and you are not splitting, then consider one very thin night. On a prescription: ask the prescriber — don’t ‘take a week off then double’.",
      },
      {
        question: "Do I need a ‘repair’ serum?",
        answer:
          "No. A short-ingredient moisturizer you can wear, plus SPF, is usually enough to start calming. A fragrant ‘repair’ bottle can still irritate. Patch-test if you still want to add one.",
      },
    ],
  };
}

export const kichUngAdapalene: Record<GuideLocale, GuideArticleCopy> = {
  vi: copy("vi"),
  en: copy("en"),
};
