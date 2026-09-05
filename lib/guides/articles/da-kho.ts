import { figure } from "../media";
import type { GuideArticleCopy, GuideLocale } from "../types";

function copy(locale: GuideLocale): GuideArticleCopy {
  const hero = figure(
    "/guides/da-kho/hero.svg",
    {
      vi: {
        alt: "Hai biểu tượng mặt: bên trái da căng sau rửa mạnh, bên phải da êm sau dưỡng khi còn ẩm.",
        caption: "Căng sau rửa chưa chắc ‘da sạch’. Thường là hàng rào đang khô.",
      },
      en: {
        alt: "Two face icons: tight skin after a harsh wash on the left, calmer skin after moisturizing on damp skin on the right.",
        caption: "Tight after washing is not ‘clean’. It often means the barrier is dry.",
      },
    },
    locale,
  );
  const layers = figure(
    "/guides/da-kho/layers.svg",
    {
      vi: {
        alt: "Ba lớp cho da khô: rửa dịu, dưỡng khi còn ẩm, rồi kem chống nắng buổi sáng.",
        caption: "Khóa ẩm khi da còn hơi ướt. SPF vẫn là bước sáng — da khô cũng bắt nắng.",
      },
      en: {
        alt: "Three layers for dry skin: gentle cleanse, moisturizer on damp skin, then morning sunscreen.",
        caption: "Lock water while skin is still a little wet. Morning SPF still counts — dry skin still burns.",
      },
    },
    locale,
  );
  const climate = figure(
    "/guides/da-kho/climate.svg",
    {
      vi: {
        alt: "Ba khung: máy lạnh thổi, trời mưa ẩm, và nắng xe máy — da khô vẫn đổi trong một ngày.",
        caption: "Máy lạnh hút nước. Mưa vẫn có UV. Nắng xe máy làm thâm dễ đậm nếu bỏ SPF.",
      },
      en: {
        alt: "Three frames: blowing air-con, humid rain, and motorbike sun — dry skin still changes in one day.",
        caption: "Air-con pulls water. Rain still has UV. Motorbike sun darkens marks if you skip SPF.",
      },
    },
    locale,
  );

  if (locale === "vi") {
    return {
      title: "Da khô nóng ẩm: dưỡng khi còn ẩm, đừng rửa đến kít",
      description:
        "Da căng sau rửa, nẻ khóe miệng, máy lạnh hút nước? Rửa dịu, dưỡng lúc da còn ẩm, SPF mỗi sáng. Checklist làm/tránh — rồi chụp ảnh nhận routine.",
      kicker: "Da khô",
      lede:
        "Trời nóng ẩm mà da vẫn khô? Hay gặp. Máy lạnh, rửa mạnh, bỏ dưỡng vì sợ bí — rồi má căng, T-zone lại bóng. Bài này giữ ngắn: khóa ẩm, SPF, và khi nào nên gặp bác sĩ. DaDiary đang Beta: gợi ý tham khảo, không chẩn bệnh.",
      heroFigure: hero,
      sections: [
        {
          heading: "Da khô ở khí hậu này hay như thế nào",
          paragraphs: [
            "Khô không phải da ‘thiếu dầu nên phải rửa sạch hơn’. Hay gặp: căng sau rửa, bong nhẹ khóe miệng, ngứa khi điều hòa.",
            "Nóng ẩm bên ngoài không tự dưỡng da. Mồ hôi rồi chà, hoặc rửa đến kít, làm hàng rào dễ nứt hơn.",
          ],
          subsections: [
            {
              heading: "Khô thật hay chỉ căng sau rửa?",
              paragraphs: [
                "Nhiều bạn gọi mình da khô khi mặt chỉ căng mười phút sau sữa rửa ‘sạch sâu’, rồi lại bình thường. Đó thường là rửa mạnh — chưa chắc đã thiếu dầu cả ngày.",
              ],
              checklist: [
                "Đổi sữa rửa dịu 3–5 ngày trước khi mua cream đặc.",
                "Dưỡng lúc da còn hơi ẩm, không chờ khô kít.",
                "Ảnh cùng góc theo tuần — cảm giác từng đêm dễ đánh lừa.",
              ],
            },
            {
              heading: "Má khô, T-zone bóng",
              paragraphs: [
                "Da hỗn hợp rất phổ biến: má căng vì máy lạnh, trán–mũi vẫn bóng vì nắng ẩm. Đừng cream đặc cả mặt buổi sáng rồi đổ lỗi ‘dưỡng gây mụn’.",
              ],
              checklist: [
                "Cả mặt một lớp mỏng; má thêm nếu căng.",
                "T-zone bóng chiều: thấm, đừng rửa giữa giờ — xem bài da dầu văn phòng.",
                "SPF cả mặt. Da khô cũng bắt nắng trên xe máy.",
              ],
            },
          ],
        },
        {
          heading: "Nền 3 bước — khóa ẩm trước serum",
          paragraphs: [
            "Serum ‘cấp ẩm’ không cứu được nếu bạn rửa đến kít rồi ngồi máy lạnh trống mặt. Giữ nền đã, rồi mới thêm một hoạt chất.",
          ],
          figure: layers,
          subsections: [
            {
              heading: "Rửa dịu, không ‘sạch bóng’",
              paragraphs: [
                "Sữa rửa không hạt, ít hương. Sáng: nước rồi dưỡng + SPF cũng được nếu da không bẩn mồ hôi. Tối: tẩy trang nếu có makeup/SPF, rồi rửa nhẹ.",
              ],
            },
            {
              heading: "Dưỡng khi da còn hơi ẩm",
              paragraphs: [
                "Lotion hoặc cream vừa — không cần hũ ‘phục hồi ban đêm’ đắt nếu bạn chưa giữ được bước này. Thoa trong vòng một phút sau rửa.",
                "Bóng ngay sau dưỡng? Giảm lượng, không bỏ hẳn. Bỏ dưỡng vì sợ bí hay để da vừa nẻ vừa tiết dầu bù.",
              ],
            },
            {
              heading: "Kem chống nắng mỗi sáng",
              paragraphs: [
                "Da khô vẫn cần SPF. Chọn kết cấu chịu được: lotion hoặc cream mỏng, hai ngón tay, cổ. Bỏ nắng để ‘da thở’ thường là bỏ thời gian thâm đang lắng — xem bài kem chống nắng.",
              ],
            },
          ],
        },
        {
          heading: "Nên làm / nên tránh",
          paragraphs: ["Không cần ‘reset’ cả tủ. Một thói quen giữ được đã tốt hơn năm hũ mới."],
          doAvoid: {
            doItems: [
              "Rửa dịu. Dưỡng lúc da còn ẩm.",
              "SPF đủ lượng mỗi sáng, kể cả ngày mây.",
              "Máy lạnh: lớp mỏng buổi sáng, thêm lotion má buổi tối nếu căng.",
              "Patch-test chai mới. Một thay đổi mỗi lần.",
            ],
            avoidItems: [
              "Rửa đến kít, tẩy hạt, muối, nước hoa hồng cồn mạnh.",
              "Bỏ dưỡng hoặc bỏ SPF vì sợ bí.",
              "Chồng nhiều acid / retinol khi da đang nẻ.",
              "Mua cream ‘phục hồi’ vì một đêm khô — chưa đổi cách rửa.",
            ],
          },
        },
        {
          heading: "Checklist 7–14 ngày",
          paragraphs: [
            "Làm đủ khoảng này trước khi thêm hyaluron đắt hoặc retinol. In ra cũng được.",
          ],
          checklist: [
            "Sáng: nước hoặc rửa dịu → dưỡng mỏng → kem chống nắng.",
            "Tối: tẩy trang nếu cần → rửa → dưỡng (má thêm nếu căng).",
            "Đổ mồ hôi: rửa nhẹ, dưỡng lại — đừng để muối mồ hôi khô trên mặt.",
            "Gối, khăn: sạch khi da đang nẻ hoặc ngứa.",
            "Ảnh cùng cửa sổ, mỗi tuần — không phóng to một điểm dưới đèn flash.",
          ],
        },
        {
          heading: "Máy lạnh, mưa, nắng xe máy",
          paragraphs: [
            "Một ngày của bạn có thể đủ cả ba. Da khô không ‘hỏng’ vì đổi theo khí hậu.",
          ],
          figure: climate,
          checklist: [
            "Cả ngày điều hòa: má dễ nẻ. Đừng rửa thêm giữa giờ. Về nhà dưỡng, không trừng phạt.",
            "Mưa ẩm: UV vẫn có. Giữ SPF sáng nếu có đoạn ngoài đường.",
            "Nắng gắt / mũ bảo hiểm: thấm mồ hôi, giữ lớp nắng. Da khô + ma sát mũ dễ đỏ dọc quai.",
          ],
        },
        {
          heading: "Khi nào gặp bác sĩ",
          paragraphs: [
            "DaDiary gợi ý nhẹ từ ảnh, không chẩn bệnh, không kê thuốc. Nẻ kéo dài không phải việc ‘mua cream đắt hơn’.",
          ],
          checklist: [
            "Nứt chảy máu, đau, mủ, sưng lan.",
            "Ngứa dữ, ban lan sau sản phẩm mới — dừng hoạt chất.",
            "Khô + sưng mắt, khó thở, hoặc không dịu sau vài ngày chỉ rửa–dưỡng–SPF: hỏi bác sĩ.",
          ],
        },
        {
          heading: "Chụp một ảnh, nhận routine vừa da",
          paragraphs: [
            "Nền chịu được rồi, một ảnh cùng góc giúp gợi ý bước tiếp — cream hay lotion, má hay cả mặt. Xem routine rồi hãy đăng ký. Không cần ảnh đẹp. Cần ảnh thật. Da khô cũng có routine ngắn; đừng đợi ‘hết khô’ mới bắt đầu.",
          ],
        },
      ],
      faqs: [
        {
          question: "Da khô có cần kem chống nắng không?",
          answer:
            "Có. Nắng xe máy và cửa sổ đủ làm thâm đậm, da nẻ dễ bắt nắng hơn. Kết cấu chịu được quan trọng hơn số SPF cao trên vỏ.",
        },
        {
          question: "Nên rửa mặt mấy lần khi da khô?",
          answer:
            "Tối thì nên, để sạch SPF và bụi. Sáng: nước rồi dưỡng + SPF thường đủ nếu da không bẩn. Rửa hai lần mạnh dễ căng hơn là ‘sạch hơn’.",
        },
        {
          question: "Hyaluronic acid có bắt buộc không?",
          answer:
            "Không. Khóa ẩm bằng dưỡng + không rửa kít thường đủ để bắt đầu. Nếu dùng HA: thoa trên da ẩm, dưỡng sau — đừng để HA khô trên mặt máy lạnh.",
        },
        {
          question: "Da vừa khô vừa nổi mụn thì sao?",
          answer:
            "Hay gặp khi hàng rào yếu. Đừng trị mụn bằng cách bỏ dưỡng. Giữ nền dịu + SPF; một hoạt chất chậm, sau khi da bớt nẻ. Đau, mủ, sẹo — gặp bác sĩ, đừng tự chồng acid.",
        },
      ],
    };
  }

  return {
    title: "Dry skin in humid heat: moisturize while damp, don’t wash until it squeaks",
    description:
      "Tight after washing, cracked corners, air-con pulling water? Gentle cleanse, moisturizer on damp skin, SPF every morning. A do/skip list — then a photo for a starter routine.",
    kicker: "Dry skin",
    lede:
      "Humid outside and still dry? Common. Air-con, a harsh wash, skipping moisturizer to avoid heaviness — then tight cheeks and a shiny T-zone. This page stays short: lock water, wear SPF, know when to see a doctor. DaDiary is in Beta: reference tips, not a diagnosis.",
    heroFigure: hero,
    sections: [
      {
        heading: "What dry skin often looks like here",
        paragraphs: [
          "Dry does not mean ‘wash harder because you lack oil’. Common: tight after cleansing, light flaking at the mouth corners, itch under air-con.",
          "Outdoor humidity is not a moisturizer. Sweat then rub, or wash until it squeaks, and the barrier cracks more easily.",
        ],
        subsections: [
          {
            heading: "Truly dry, or just tight after washing?",
            paragraphs: [
              "Many people call themselves dry when the face only feels tight for ten minutes after a ‘deep clean’ wash, then settles. That is often a harsh cleanser — not all-day oil poverty.",
            ],
            checklist: [
              "Switch to a gentler wash for 3–5 days before buying a heavy cream.",
              "Moisturize while skin is still a little damp, not bone-dry.",
              "Same-angle photos by the week — nightly feelings lie.",
            ],
          },
          {
            heading: "Dry cheeks, shiny T-zone",
            paragraphs: [
              "Combination skin is common: cheeks tight from air-con, forehead and nose still shiny from humid heat. Don’t cream the whole face in the morning and blame ‘moisturizer acne’.",
            ],
            checklist: [
              "A thin layer everywhere; more on cheeks if they feel tight.",
              "Afternoon T-zone shine: blot, don’t wash at the desk — see the office oily-skin guide.",
              "SPF on the whole face. Dry skin still burns on a motorbike.",
            ],
          },
        ],
      },
      {
        heading: "A 3-step base — lock water before a serum",
        paragraphs: [
          "A ‘hydrating’ serum cannot rescue a squeaky wash and a bare face under air-con. Keep the base, then add one active.",
        ],
        figure: layers,
        subsections: [
          {
            heading: "Cleanse without a squeaky finish",
            paragraphs: [
              "A grit-free, fragrance-light cleanser. Morning: water, then moisturizer + SPF can be enough if you are not sweaty. Night: remove makeup/SPF if worn, then a gentle wash.",
            ],
          },
          {
            heading: "Moisturize while skin is still damp",
            paragraphs: [
              "A lotion or a moderate cream — you do not need an expensive ‘overnight repair’ jar if this step is missing. Apply within a minute of washing.",
              "Shine right after? Use less, don’t drop it. Skipping moisturizer to avoid heaviness often leaves skin cracked and oilier later.",
            ],
          },
          {
            heading: "Sunscreen every morning",
            paragraphs: [
              "Dry skin still needs SPF. Pick a texture you can wear: a lotion or thin cream, two fingers, including the neck. Skipping sun care so skin can ‘breathe’ often skips the time a mark was fading — see the sunscreen guide.",
            ],
          },
        ],
      },
      {
        heading: "Do this / skip this",
        paragraphs: ["You don’t need to empty the shelf. One keepable habit beats five new jars."],
        doAvoid: {
          doItems: [
            "Gentle cleanse. Moisturize on damp skin.",
            "Enough SPF every morning, including cloudy days.",
            "Air-con: a thin morning layer, extra cheek lotion at night if tight.",
            "Patch-test new bottles. One change at a time.",
          ],
          avoidItems: [
            "Washing until it squeaks, gritty scrubs, salt, high-alcohol toner.",
            "Dropping moisturizer or SPF because you fear heaviness.",
            "Stacking acids / retinol on cracked skin.",
            "Buying a ‘repair’ cream after one dry night — before you change how you wash.",
          ],
        },
      },
      {
        heading: "7–14 day checklist",
        paragraphs: [
          "Do this stretch before an expensive hyaluronic or retinol. Screenshot it if you want.",
        ],
        checklist: [
          "Morning: water or a gentle wash → thin moisturizer → sunscreen.",
          "Night: remove makeup if needed → cleanse → moisturizer (more on cheeks if tight).",
          "Heavy sweat: gentle wash, moisturizer again — don’t let sweat salt dry on the face.",
          "Pillow and towel: cleaner when skin is cracked or itchy.",
          "Same-window photos weekly — don’t zoom one pixel under flash.",
        ],
      },
      {
        heading: "Air-con, rain, motorbike sun",
        paragraphs: [
          "One day can hold all three. Dry skin is allowed to follow the climate.",
        ],
        figure: climate,
        checklist: [
          "All-day air-con: cheeks crack easily. No extra midday wash. Moisturize at home; don’t punish.",
          "Humid rain: UV is still there. Keep morning SPF if you go outside.",
          "Harsh sun / a helmet: blot sweat, keep the sun layer. Dry skin plus helmet friction often reddens along the strap.",
        ],
      },
      {
        heading: "When to see a doctor",
        paragraphs: [
          "DaDiary suggests gentle care from photos. It does not diagnose or prescribe. Lasting cracks are not a ‘buy a pricier cream’ problem.",
        ],
        checklist: [
          "Splits that bleed, pain, pus, spreading swelling.",
          "Severe itch or a spreading rash after a new product — stop actives.",
          "Dryness plus swollen eyes, trouble breathing, or no calm after a few days of cleanse–moisturize–SPF: ask a clinician.",
        ],
      },
      {
        heading: "One photo, a routine that fits",
        paragraphs: [
          "Once the base sits well, one same-angle photo helps suggest the next step — cream or lotion, cheeks or the whole face. See the routine, then sign up. It does not need to be pretty. It needs to be real. Dry skin still gets a short routine; don’t wait until you are ‘not dry’ to start.",
        ],
      },
    ],
    faqs: [
      {
        question: "Does dry skin still need sunscreen?",
        answer:
          "Yes. Motorbike sun and windows are enough to darken marks, and cracked skin burns more easily. A wearable texture matters more than the highest number on the bottle.",
      },
      {
        question: "How often should I wash if my skin is dry?",
        answer:
          "Night, usually, to remove SPF and dust. Morning: water then moisturizer + SPF is often enough if you are not dirty. Two harsh washes tend to tighten more than they ‘clean’.",
      },
      {
        question: "Is hyaluronic acid required?",
        answer:
          "No. Locking water with moisturizer and skipping the squeaky wash is enough to start. If you use HA: apply on damp skin, moisturizer after — don’t leave HA to dry on an air-con face.",
      },
      {
        question: "Dry and breaking out — what then?",
        answer:
          "Common when the barrier is weak. Don’t treat spots by dropping moisturizer. Keep a calm base + SPF; one slow active after the cracks ease. Pain, pus, scars — see a clinician, don’t stack acids on your own.",
      },
    ],
  };
}

export const daKho: Record<GuideLocale, GuideArticleCopy> = {
  vi: copy("vi"),
  en: copy("en"),
};
