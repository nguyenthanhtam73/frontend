import { figure } from "../media";
import type { GuideArticleCopy, GuideLocale } from "../types";

function copy(locale: GuideLocale): GuideArticleCopy {
  const hero = figure(
    "/guides/da-dau/hero.svg",
    {
      vi: {
        alt: "Minh họa da dầu khí hậu nóng ẩm: vùng T-zone bóng hơn má, mũ bảo hiểm để cạnh cửa sổ.",
        caption: "T-zone bóng, má bình thường — rất hay gặp. Không có nghĩa da bạn ‘hỏng’.",
      },
      en: {
        alt: "Illustration of oily skin in humid heat: a shinier T-zone than the cheeks, a helmet by the window.",
        caption: "A shiny T-zone with calmer cheeks is common. It does not mean your skin is broken.",
      },
    },
    locale,
  );
  const steps = figure(
    "/guides/da-dau/steps.svg",
    {
      vi: {
        alt: "Ba bước nền cho da dầu: rửa dịu, gel mỏng, kem chống nắng hai ngón tay.",
        caption: "Ba bước này giữ được thì hãy tính serum.",
      },
      en: {
        alt: "Three base steps for oily skin: gentle cleanse, thin gel, two-finger sunscreen.",
        caption: "Keep these three before you add a serum.",
      },
    },
    locale,
  );
  const doAvoid = figure(
    "/guides/da-dau/do-avoid.svg",
    {
      vi: {
        alt: "So sánh nên làm và nên tránh: sữa rửa dịu bên trái, chà mạnh và bỏ dưỡng bên phải.",
      },
      en: {
        alt: "Do versus skip: a gentle cleanser on the left, harsh scrubbing and skipping moisturizer on the right.",
      },
    },
    locale,
  );
  const climate = figure(
    "/guides/da-dau/climate.svg",
    {
      vi: {
        alt: "Ba khung khí hậu: nắng xe máy, trời mưa ẩm, và văn phòng máy lạnh.",
        caption: "Một ngày của bạn có thể đủ cả ba. Routine mỏng chịu được nắng ẩm hơn cream đặc.",
      },
      en: {
        alt: "Three climate frames: motorbike sun, humid rain, and an air-conditioned office.",
        caption: "One day can hold all three. A thin routine usually beats a heavy cream.",
      },
    },
    locale,
  );

  if (locale === "vi") {
    return {
      title: "Da dầu nóng ẩm: routine mỏng, SPF mỗi sáng",
      description:
        "Da dầu bóng T-zone khi nắng ẩm Việt Nam? Rửa dịu, gel mỏng, SPF mỗi sáng. DaDiary Beta: gợi ý, không chẩn bệnh — rồi chụp ảnh nhận routine.",
      kicker: "Da dầu",
      lede:
        "Bạn không cần 8 bước. Mình hay thấy người rửa thật mạnh, bỏ dưỡng, rồi da vừa bóng vừa căng lúc 3 giờ — mệt thật. Bài này giữ ngắn: nền 3 bước, SPF, và khi nào nên gặp bác sĩ. DaDiary đang Beta: gợi ý tham khảo, không chẩn bệnh.",
      heroFigure: hero,
      sections: [
        {
          heading: "Da dầu ở Việt Nam hay như thế nào",
          paragraphs: [
            "Dầu không phải da bẩn. Trời nóng, đội mũ, ngồi xe máy — T-zone bóng sớm là bình thường.",
            "Lỗ chân lông nhìn to hơn khi bã nhờn và mồ hôi đọng. Chưa chắc đã là mụn viêm.",
          ],
          subsections: [
            {
              heading: "Da dầu hay da hỗn hợp?",
              paragraphs: [
                "Nhiều bạn gọi mình da dầu khi chỉ trán–mũi bóng, má lại bình thường hoặc khô sau máy lạnh. Đó là da hỗn hợp — rất phổ biến.",
              ],
              checklist: [
                "Rửa và chống nắng cả mặt.",
                "Dưỡng mỏng hơn ở T-zone; má căng thì thêm một chút lotion.",
                "Đừng chọn sữa rửa ‘sạch bóng’ chỉ vì trán dễ dầu.",
              ],
            },
            {
              heading: "Dầu, mồ hôi, lỗ chân lông",
              paragraphs: [
                "Mồ hôi không phải mụn. Nhưng để mồ hôi lẫn bụi và kem chống nắng cả buổi thì da dễ bí.",
              ],
              checklist: [
                "Đổ mồ hôi nhiều: rửa dịu, dưỡng lại.",
                "Ngồi máy lạnh, da chỉ hơi bóng: giấy thấm là đủ.",
                "Thấm nhẹ. Đừng cọ.",
              ],
            },
          ],
        },
        {
          heading: "Nền 3 bước — trước khi nghĩ tới serum",
          paragraphs: [
            "Mua ít. Quan sát vài tuần. Da chịu được rồi hãy thêm một hoạt chất.",
          ],
          figure: steps,
          subsections: [
            {
              heading: "Rửa dịu, không ‘sạch bóng’",
              paragraphs: [
                "Sữa rửa không hạt, không mùi nồng. Ướt mặt, xoay nhẹ khoảng nửa phút, xả kỹ.",
              ],
              checklist: [
                "Sáng: rửa nếu da nhờn hoặc còn SPF hôm qua. Má khô sau máy lạnh? Nước rồi dưỡng + SPF cũng được.",
                "Tối: có makeup hoặc SPF thì tẩy trang rồi rửa.",
                "Bỏ muối, cà phê, miếng ráp.",
              ],
            },
            {
              heading: "Dưỡng mỏng khi da còn hơi ẩm",
              paragraphs: [
                "Da dầu vẫn cần nước. Gel hoặc lotion thấm nhanh thường chịu được hơn cream đặc.",
                "Bỏ dưỡng vì sợ bóng hay khiến da vừa căng vừa bóng lại. Bóng sau dưỡng? Giảm lượng — đừng bỏ hẳn.",
              ],
            },
            {
              heading: "Kem chống nắng mỗi sáng",
              paragraphs: [
                "Nắng xe máy và cửa sổ đủ để thâm lâu lắng. Chọn gel hoặc fluid. Khoảng hai ngón tay cho mặt, nhớ cổ.",
                "SPF không trị mụn. Nó giúp vết thâm đỡ đậm thêm khi da đang yên.",
              ],
            },
          ],
        },
        {
          heading: "Nên làm / nên tránh",
          paragraphs: ["Không cần ‘reset’ cả tủ trong một đêm. Đổi một thói quen đã tốt."],
          figure: doAvoid,
          doAvoid: {
            doItems: [
              "Rửa dịu sáng và tối.",
              "Lotion/gel mỏng + SPF đủ lượng mỗi sáng.",
              "Patch-test sản phẩm mới: sau tai hoặc dọc hàm 2–3 đêm.",
              "Một thay đổi mỗi lần. Ảnh cùng góc theo tuần.",
            ],
            avoidItems: [
              "Rửa đến kít mặt, tẩy hạt mỗi ngày.",
              "Chồng AHA + BHA + retinol trong tuần đầu.",
              "Bỏ dưỡng hoặc bỏ SPF vì sợ bí.",
              "Thêm trị dầu mới chỉ vì bóng lúc 3 giờ chiều.",
            ],
          },
        },
        {
          heading: "Checklist 7–14 ngày",
          paragraphs: [
            "Làm đủ khoảng này trước khi thêm acid. In ra hoặc chụp màn hình cũng được.",
          ],
          checklist: [
            "Sáng: rửa dịu (hoặc nước) → gel mỏng → kem chống nắng.",
            "Tối: tẩy trang nếu có SPF/makeup → rửa → dưỡng mỏng.",
            "Đổ mồ hôi nhiều: rửa nhẹ, dưỡng lại.",
            "Giấy thấm: thấm, không cọ. Không rửa lần ba nếu da chưa bẩn mồ hôi.",
            "Gối, khăn, lót mũ: sạch hơn khi da đang nổi.",
          ],
        },
        {
          heading: "Nắng, mưa, máy lạnh",
          paragraphs: [
            "Khí hậu đổi trong ngày. Bạn không sai vì da đổi theo.",
          ],
          figure: climate,
          checklist: [
            "Nắng gắt / đi lâu: thấm mồ hôi, thoa lại SPF nếu được. Đừng rửa giữa đường rồi bỏ trống.",
            "Trời râm mùa mưa: UV vẫn có thể cao. Những ngày có đoạn ngoài đường, giữ SPF sáng.",
            "Cả ngày máy lạnh: má có thể khô, T-zone vẫn bóng. SPF cả mặt; tối thêm lotion ở má — chi tiết ở [da dầu văn phòng](/guides/da-dau-van-phong).",
          ],
        },
        {
          heading: "Khi nào gặp bác sĩ",
          paragraphs: [
            "DaDiary gợi ý nhẹ từ ảnh, không chẩn bệnh, không kê thuốc. Đi khám sớm hơn bạn nghĩ nếu da đang để sẹo.",
          ],
          checklist: [
            "Mụn nang đau, mủ, sưng lan, sốt.",
            "Sẹo đang thành.",
            "Rát cả ngày, bong tróc, ban sau sản phẩm mới — dừng hoạt chất. Không dịu sau vài ngày chỉ rửa–dưỡng–SPF thì hỏi bác sĩ.",
          ],
        },
        {
          heading: "Chụp một ảnh, nhận routine vừa da",
          paragraphs: [
            "Nền 3 bước chịu được rồi, một ảnh cùng góc (ánh sáng giống nhau nếu được) giúp gợi ý bước tiếp theo. Xem routine rồi hãy đăng ký. Không cần ảnh đẹp. Cần ảnh thật.",
          ],
        },
      ],
      faqs: [
        {
          question: "Da dầu có cần kem chống nắng không?",
          answer:
            "Có. Nắng và nóng ẩm làm thâm lâu hết. Kết cấu mỏng, thoa đều mỗi sáng — quan trọng hơn số SPF cao trên vỏ.",
        },
        {
          question: "Rửa mặt mấy lần một ngày?",
          answer:
            "Thường sáng và tối. Thêm lần chỉ khi đổ mồ hôi nhiều. Rửa quá dễ kích dầu.",
        },
        {
          question: "Da dầu có dùng retinol được không?",
          answer:
            "Có thể, nhưng không phải bước đầu khi da đang rát. Ổn định rửa–dưỡng–SPF, patch-test, rồi mới vài đêm/tuần — xem [retinol cho người mới](/guides/retinol-cho-nguoi-moi). Đang trị theo đơn — hỏi bác sĩ trước.",
        },
        {
          question: "Bóng T-zone buổi chiều có phải routine sai?",
          answer:
            "Không hẳn. Khí hậu này làm nhiều da bóng sớm. Thấm dầu, giữ SPF, xem ảnh theo tuần. Vừa bóng vừa rát, hoặc mụn tăng sau chai mới — lùi về 3 bước.",
        },
      ],
    };
  }

  return {
    title: "Oily skin in humid heat: a thin routine and morning SPF",
    description:
      "Shiny T-zone in Vietnamese humid heat? Gentle cleanse, thin gel, morning SPF. DaDiary Beta: tips, not a diagnosis — then a photo for a starter routine.",
    kicker: "Oily skin",
    lede:
      "You do not need eight steps. A harsh wash and no moisturizer often leave skin shiny and tight by 3 p.m. This page stays short: a 3-step base, SPF, and when to see a doctor. DaDiary is in Beta: reference tips, not a diagnosis.",
    heroFigure: hero,
    sections: [
      {
        heading: "What oily skin often looks like here",
        paragraphs: [
          "Oil is not dirt. Heat, a helmet, a motorbike — an early shiny T-zone is normal.",
          "Pores look larger when sebum and sweat sit there. That is not always inflamed acne.",
        ],
        subsections: [
          {
            heading: "Oily or combination?",
            paragraphs: [
              "Many people say they are oily when only the forehead and nose shine, and cheeks feel normal or tight after air-con. That is combination skin — and it is common.",
            ],
            checklist: [
              "Cleanse and wear SPF on the whole face.",
              "Less lotion on the T-zone; a little more if cheeks feel tight.",
              "Don’t pick a squeaky-clean cleanser just because the forehead shines.",
            ],
          },
          {
            heading: "Oil, sweat, pores",
            paragraphs: [
              "Sweat is not acne. Sweat plus dust plus sunscreen all day can feel congested.",
            ],
            checklist: [
              "Heavy sweat: gentle wash, moisturizer again.",
              "Air-con, only a little shine: blotting is enough.",
              "Press. Don’t scrub.",
            ],
          },
        ],
      },
      {
        heading: "A 3-step base — before any serum",
        paragraphs: ["Buy less. Watch a few weeks. Then add one active if skin allows."],
        figure: steps,
        subsections: [
          {
            heading: "Cleanse without a squeaky finish",
            paragraphs: [
              "A grit-free, fragrance-light cleanser. Wet the face, massage about half a minute, rinse well.",
            ],
            checklist: [
              "Morning: wash if you are shiny or still wearing yesterday’s SPF. Cheeks dry from air-con? Water, then moisturizer + SPF can be enough.",
              "Night: if you wore makeup or SPF, remove it, then cleanse.",
              "Skip salt, coffee grounds, and rough pads.",
            ],
          },
          {
            heading: "A thin moisturizer on slightly damp skin",
            paragraphs: [
              "Oily skin still wants water. A fast gel or lotion usually beats a heavy cream.",
              "Skipping moisturizer to avoid shine often leaves skin tight and shiny. Glow right after? Use less — don’t drop it.",
            ],
          },
          {
            heading: "Sunscreen every morning",
            paragraphs: [
              "Motorbike sun and windows are enough to keep marks around. Pick a gel or fluid. About two fingers for the face, including the neck.",
              "SPF is not an acne drug. It helps marks stay lighter while skin is calm.",
            ],
          },
        ],
      },
      {
        heading: "Do this / skip this",
        paragraphs: ["You don’t need to empty the shelf overnight. Change one habit."],
        figure: doAvoid,
        doAvoid: {
          doItems: [
            "Gentle cleanse morning and night.",
            "Thin gel/lotion + enough SPF every morning.",
            "Patch-test new products: behind the ear or along the jaw for 2–3 nights.",
            "One change at a time. Same-angle photos by the week.",
          ],
          avoidItems: [
            "Washing until the face squeaks, daily gritty scrubs.",
            "Stacking AHA + BHA + retinol in week one.",
            "Dropping moisturizer or SPF because you fear heaviness.",
            "Adding a new oil-control only because you shine at 3 p.m.",
          ],
        },
      },
      {
        heading: "7–14 day checklist",
        paragraphs: ["Do this stretch before you add an acid. Screenshot it if you want."],
        checklist: [
          "Morning: gentle cleanse (or water) → thin gel → sunscreen.",
          "Night: remove SPF/makeup if worn → cleanse → thin moisturizer.",
          "Heavy sweat: gentle wash, moisturizer again.",
          "Blot, don’t rub. No third cleanse unless sweat is heavy.",
          "Pillow, towel, helmet liner: cleaner when you are breaking out.",
        ],
      },
      {
        heading: "Sun, rain, air-con",
        paragraphs: ["The climate can change in one day. Your skin is allowed to follow."],
        figure: climate,
        checklist: [
          "Harsh sun / a long ride: blot, reapply SPF if you can. Don’t wash on the roadside and leave skin bare.",
          "Cloudy rainy days: UV can still be high. Any outdoor stretch, keep morning SPF.",
          "All-day air-con: cheeks may dry while the T-zone shines. SPF on the whole face; extra lotion on cheeks at night — more in the [office oily-skin guide](/guides/da-dau-van-phong).",
        ],
      },
      {
        heading: "When to see a doctor",
        paragraphs: [
          "DaDiary suggests gentle care from photos. It does not diagnose or prescribe. Go earlier than you think if scars are forming.",
        ],
        checklist: [
          "Painful cysts, pus, spreading swelling, fever.",
          "Scars that are forming.",
          "All-day sting, peeling, or a rash after a new product — stop actives. If cleanse–moisturize–SPF does not settle in a few days, ask a clinician.",
        ],
      },
      {
        heading: "One photo, a routine that fits",
        paragraphs: [
          "Once the 3-step base sits well, one same-angle photo (similar light if you can) helps suggest the next step. See the routine, then sign up. It does not need to be pretty. It needs to be real.",
        ],
      },
    ],
    faqs: [
      {
        question: "Does oily skin still need sunscreen?",
        answer:
          "Yes. Sun and heat keep marks around. A thin texture worn evenly each morning matters more than the highest number on the bottle.",
      },
      {
        question: "How often should I wash my face?",
        answer:
          "Usually morning and night. Extra only after heavy sweat. Over-washing often boosts oil.",
      },
      {
        question: "Can oily skin use retinol?",
        answer:
          "Sometimes — not as step one while skin stings. Stabilize cleanse–moisturize–SPF, patch-test, then a few nights a week — see [retinol for beginners](/guides/retinol-cho-nguoi-moi). On a prescription? Ask first.",
      },
      {
        question: "Is a shiny T-zone in the afternoon a failed routine?",
        answer:
          "Not by itself. This climate makes many faces shine early. Blot, keep SPF, read weekly photos. Shiny and stinging, or a jump after a new bottle — return to three steps.",
      },
    ],
  };
}

export const daDau: Record<GuideLocale, GuideArticleCopy> = {
  vi: copy("vi"),
  en: copy("en"),
};
