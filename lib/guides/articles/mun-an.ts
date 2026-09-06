import { figure } from "../media";
import type { GuideArticleCopy, GuideLocale } from "../types";

function copy(locale: GuideLocale): GuideArticleCopy {
  const hero = figure(
    "/guides/mun-an/hero.svg",
    {
      vi: {
        alt: "Minh họa không nặn: tay thả lỏng trước gương, vài hạt nhỏ gần màu da — không phải ảnh mụn gây sốc.",
        caption: "Hạt nhỏ sờ hơi cứng. Tay xuống. Không ‘lấy nhân’ tại nhà.",
      },
      en: {
        alt: "Illustration of not picking: relaxed hands at a mirror, a few small near-skin-colored bumps — not a graphic acne photo.",
        caption: "Small, slightly firm bumps. Hands down. No at-home ‘extractions’.",
      },
    },
    locale,
  );
  const slow = figure(
    "/guides/mun-an/slow.svg",
    {
      vi: {
        alt: "Ba bước chậm cho da dầu mụn ẩn: rửa dịu, gel mỏng, kem chống nắng — chưa tới BHA.",
        caption: "Nền giữ được rồi hãy tính BHA. Không phải đêm đầu đã mỗi tối.",
      },
      en: {
        alt: "Three slow steps for oily, clogged skin: gentle cleanse, thin gel, sunscreen — BHA not yet.",
        caption: "Keep the base, then consider BHA. Not every night from night one.",
      },
    },
    locale,
  );
  const calendar = figure(
    "/guides/mun-an/calendar.svg",
    {
      vi: {
        alt: "Lịch một tuần: hai đêm BHA có dấu, các đêm còn lại chỉ dưỡng — minh họa tần suất chậm.",
        caption: "Hai đêm/tuần đã là bắt đầu. Không cần ‘mỗi đêm cho lỗ chân lông sạch’.",
      },
      en: {
        alt: "A one-week calendar: two BHA nights marked, the rest moisturizer-only — a slow frequency.",
        caption: "Two nights a week is a start. You do not need ‘every night to clear pores’.",
      },
    },
    locale,
  );

  if (locale === "vi") {
    return {
      title: "Mụn ẩn da dầu: routine chậm, BHA từ từ, không nặn",
      description:
        "Hạt nhỏ, da dầu, muốn BHA? Nền rửa–dưỡng–SPF trước, vài đêm/tuần, không tự nặn. DaDiary Beta: không chẩn loại mụn — chụp ảnh nhận routine nhẹ.",
      kicker: "Mụn ẩn",
      lede:
        "Mình không soi lỗ chân lông rồi ghi ‘comedone’ giúp bạn. Hạt nhỏ gần màu da, sờ hơi cứng, hay gặp trên da dầu nóng ẩm — và hay bị nặn cho ‘xong’. Việc ít hại: routine chậm, BHA nếu da chịu được, tay xuống. DaDiary đang Beta: gợi ý, không phải phòng khám.",
      heroFigure: hero,
      sections: [
        {
          heading: "Hạt nhỏ — chưa phải tên bệnh",
          paragraphs: [
            "Người ta hay gọi mụn ẩn khi thấy hạt nhỏ, gần màu da, không đỏ nhiều, sờ hơi cứng. Mụn viêm: đỏ, có thể đau hoặc có đầu trắng. Nhiều người có cả hai.",
            "Tên trên mạng (closed comedone, ‘nhân mụn’) không thay khám nếu đau, có mủ, hoặc đang để sẹo. Bài rộng hơn ở [mụn](/guides/mun). Da bóng T-zone: [da dầu](/guides/da-dau).",
          ],
          subsections: [
            {
              heading: "Vì sao hay nặn — và vì sao đừng",
              paragraphs: [
                "Nặn cho phẳng trước sự kiện thường để lại đỏ, thâm, đôi khi sẹo. ‘Lấy nhân’ kim, kẹp, video nhà — dễ xước và nhiễm hơn là sạch lỗ chân lông. Tay xuống. Gối sạch. Lót mũ sạch.",
              ],
            },
            {
              heading: "Dầu không phải nhân đang chờ moi",
              paragraphs: [
                "T-zone bóng trên nắng ẩm là bình thường. Chà cho ‘sạch bóng’ làm hàng rào yếu, hạt dễ thành đỏ. Thấm dầu giữa giờ, đừng rửa rồi bỏ trống — rồi mới nghĩ tới một hoạt chất.",
              ],
            },
          ],
        },
        {
          heading: "Routine chậm trước khi mở BHA",
          paragraphs: [
            "Nếu nền 3 bước còn chưa giữ được, BHA chỉ thêm khô. Ổn định rửa dịu–dưỡng mỏng–SPF khoảng hai tuần — [routine người mới](/guides/routine-cham-da) nói rõ khung này.",
          ],
          figure: slow,
          checklist: [
            "Da không đang rát cả ngày, không nẻ chảy.",
            "Bạn chịu được kem chống nắng mỗi sáng.",
            "Sẵn sàng chỉ thêm một thay đổi — không kèm adapalene, AHA, peel cùng tuần.",
            "Patch-test 2–3 đêm sau tai hoặc dọc hàm.",
          ],
        },
        {
          heading: "BHA: vì sao được nhắc, tần suất nào ít hại hơn",
          paragraphs: [
            "BHA (thường salicylic) tan trong dầu, nên hay được nhắc cho lỗ chân lông và hạt nhỏ. ‘Hay được nhắc’ không phải đơn, không phải hết mụn ẩn trong 14 ngày, không phải mỗi đêm từ tuần đầu.",
            "Sản phẩm kệ không phải thuốc. Đang có đơn adapalene hoặc retinoid: hỏi bác sĩ trước khi tự thêm BHA lên cùng vùng. Da đang rát: [dừng kích](/guides/kich-ung-adapalene) trước.",
          ],
          figure: calendar,
          subsections: [
            {
              heading: "Hai đêm một tuần đã đủ để học",
              paragraphs: [
                "Lượng mỏng, tối, trên da khô. Dưỡng sau. Đêm còn lại: chỉ dưỡng. Êm 2–3 tuần mới nghĩ tới đêm thứ ba. Không tăng vì một video hứa ‘lỗ chân lông sạch’.",
                "Rát, đỏ lan, bong nhiều: dừng. Đó không phải lúc ‘cố cho thông’. Ngứa nhẹ thoáng qua khác với rát cả ngày.",
              ],
            },
            {
              heading: "Không chồng cho ‘thông hết nhân’",
              paragraphs: [
                "BHA + adapalene + tẩy hạt cùng tuần là combo hay gặp khi da đang dầu. Kết quả hay gặp: khô, đỏ, rồi nặn vì sốt ruột. Một hoạt chất. Ảnh cùng góc theo tuần.",
              ],
            },
          ],
        },
        {
          heading: "Nên làm / nên tránh",
          paragraphs: ["Không ai ‘xứng đáng’ bị hạt vì tối qua ăn gì."],
          doAvoid: {
            doItems: [
              "Rửa dịu, dưỡng mỏng, SPF mỗi sáng.",
              "BHA nếu dùng: patch-test, hai đêm/tuần, dưỡng sau.",
              "Ảnh cùng góc để thấy hạt lắng hay thành đỏ.",
              "Gối, khăn, ốp điện thoại, tay: sạch hơn khi chạm mặt.",
            ],
            avoidItems: [
              "Tự nặn, kẹp, kim, ‘lấy nhân’ theo video.",
              "Mỗi đêm BHA từ tuần đầu, hoặc chồng adapalene cùng đêm.",
              "Tẩy hạt cho mụn ẩn ‘tróc’.",
              "Bỏ SPF vì sợ bí — thâm sau đó đậm hơn hạt.",
            ],
          },
        },
        {
          heading: "Khi nào gặp bác sĩ",
          paragraphs: [
            "DaDiary không kê isotretinoin, không chỉ định nặn phòng khám, không gọi tên bệnh từ ảnh. Khám sớm nếu da đang để sẹo.",
          ],
          checklist: [
            "Hạt thành nang, đau nhiều, mủ, sốt, sưng lan.",
            "Sẹo đang thành, hoặc bạn không nhịn được tay — phòng khám nặn an toàn hơn nhà.",
            "Mụn lưng/ngực lan nhanh.",
            "Mụn đột ngột sau thuốc mới.",
          ],
        },
        {
          heading: "Chụp ảnh — không phải để soi từng hạt",
          paragraphs: [
            "Một ảnh cùng góc, ánh sáng gần giống, mỗi tuần. Gợi ý vẫn bắt đầu từ dịu + SPF, không phải ‘nặn giúp’. [Bắt đầu bằng ảnh](/onboarding) nếu chưa có routine; đã vào app thì [check-in](/check-in) cùng cửa sổ. Đăng ký sau khi thấy gợi ý. Hạt cần thời gian; tay cần nghỉ.",
          ],
        },
      ],
      faqs: [
        {
          question: "Mụn ẩn có cần tẩy da chết mạnh không?",
          answer:
            "Không. Tẩy mạnh làm hàng rào yếu, hạt dễ thành mụn viêm. BHA nhẹ vài buổi tối, hoặc chỉ rửa + dưỡng + SPF đến khi da chịu được.",
        },
        {
          question: "BHA dùng mỗi ngày được không?",
          answer:
            "Người mới: chưa. Hai đêm/tuần đã là bắt đầu. Mỗi ngày từ tuần đầu hay kèm rát và bong. Êm vài tuần mới nghĩ tới thêm một đêm — không phải lời kê đơn.",
        },
        {
          question: "Có nên đi spa nặn mụn ẩn không?",
          answer:
            "Nặn nhà: đừng. Phòng khám hoặc spa: hỏi sạch dụng cụ và da có đang viêm không. Đau, mủ, sẹo — gặp bác sĩ, đừng đặt lịch vì sốt ruột.",
        },
        {
          question: "Kem chống nắng có làm mụn ẩn nhiều hơn không?",
          answer:
            "Một số công thức bí với da dầu. Đổi gel/fluid, thoa đủ, rửa sạch tối. Bỏ SPF hẳn thường làm thâm chậm hết hơn là ‘hết hạt’.",
        },
      ],
    };
  }

  return {
    title: "Clogged pores on oily skin: a slow routine, careful BHA, no picking",
    description:
      "Small bumps, oily skin, thinking about BHA? Keep cleanse–moisturize–SPF first, a few nights a week, don’t extract. DaDiary Beta: no comedone diagnosis — then a photo for a gentle routine.",
    kicker: "Clogged pores",
    lede:
      "This page will not inspect a pore and write ‘comedone’ for you. Small, near-skin-colored, slightly firm bumps are common on oily humid-heat skin — and they get picked so they look ‘done’. Lower-harm: a slow routine, BHA only if skin can stand it, hands down. DaDiary is in Beta: tips, not a clinic.",
    heroFigure: hero,
    sections: [
      {
        heading: "Small bumps — not a disease name",
        paragraphs: [
          "People often say clogged pores when they see small, near-skin-colored bumps that are not very red and feel a bit firm. Inflamed spots: red, maybe sore or white-tipped. Many people have both.",
          "Internet names (closed comedone, ‘the core’) do not replace a visit if you have pain, pus, or scarring. The wider read is the [acne guide](/guides/mun). A shiny T-zone: [oily skin](/guides/da-dau).",
        ],
        subsections: [
          {
            heading: "Why picking feels useful — and why to skip it",
            paragraphs: [
              "Extracting so a bump is flat before an event often leaves red, a mark, sometimes a scar. Needles, clips, a home video — easier to scratch and infect than to ‘clear a pore’. Hands down. Clean pillow. Clean helmet liner.",
            ],
          },
          {
            heading: "Oil is not a clog waiting to be dug out",
            paragraphs: [
              "A shiny T-zone in humid heat is ordinary. Scrubbing until it squeaks weakens the barrier; bumps turn red more easily. Blot midday instead of washing and going bare — then consider one active.",
            ],
          },
        ],
      },
      {
        heading: "A slow routine before you open BHA",
        paragraphs: [
          "If the 3-step base is not keepable yet, BHA only adds dryness. Hold a gentle cleanse–thin moisturizer–SPF for about two weeks — the [beginner routine](/guides/routine-cham-da) spells out that frame.",
        ],
        figure: slow,
        checklist: [
          "You are not stinging all day or splitting.",
          "You can wear sunscreen every morning.",
          "You will add only one change — no adapalene, AHA, or peel in the same week.",
          "Patch-test 2–3 nights behind the ear or along the jaw.",
        ],
      },
      {
        heading: "BHA: why it gets mentioned, and a lower-harm frequency",
        paragraphs: [
          "BHA (often salicylic) is oil-soluble, so it gets mentioned for pores and small bumps. ‘Often mentioned’ is not a prescription, not clear skin in 14 days, and not every night from week one.",
          "Shelf products are not a medicine. Already on prescribed adapalene or another retinoid: ask before you add BHA on the same area. Skin already stinging: [pause irritants](/guides/kich-ung-adapalene) first.",
        ],
        figure: calendar,
        subsections: [
          {
            heading: "Two nights a week is enough to learn",
            paragraphs: [
              "A thin amount, at night, on dry skin. Moisturizer after. Other nights: moisturizer only. Calm for 2–3 weeks before you even think about a third night. Don’t raise it because a video promised ‘clear pores’.",
              "Sting, spreading red, a lot of flake: stop. That is not the moment to ‘push until it unclogs’. Brief mild itch is different from all-day burn.",
            ],
          },
          {
            heading: "Don’t stack to ‘clear every clog’",
            paragraphs: [
              "BHA + adapalene + a scrub in one week is a familiar combo on oily skin. The familiar result: dry, red, then picking from impatience. One active. Same-angle photos weekly.",
            ],
          },
        ],
      },
      {
        heading: "Do this / skip this",
        paragraphs: ["No one ‘deserves’ a bump because of last night’s meal."],
        doAvoid: {
          doItems: [
            "Gentle cleanse, thin moisturizer, SPF every morning.",
            "If you use BHA: patch-test, two nights a week, moisturizer after.",
            "Same-angle photos to see if bumps stay quiet or turn red.",
            "Pillow, towel, phone, hands: cleaner when they touch your face.",
          ],
          avoidItems: [
            "Home extractions, clips, needles, a video ‘core removal’.",
            "Every-night BHA from week one, or adapalene the same night.",
            "Gritty scrubs to ‘lift’ clogged pores.",
            "Dropping SPF because it feels heavy — marks linger longer than bumps.",
          ],
        },
      },
      {
        heading: "When to see a doctor",
        paragraphs: [
          "DaDiary does not prescribe isotretinoin, does not book a clinic extraction, and does not name a disease from a photo. Go earlier if scars are forming.",
        ],
        checklist: [
          "Bumps becoming cysts, a lot of pain, pus, fever, spreading swelling.",
          "Scars forming, or you cannot keep your hands off — a clinic extraction is safer than a bathroom one.",
          "A fast back or chest flare.",
          "A sudden crop after a new medicine.",
        ],
      },
      {
        heading: "Take a photo — not to zoom every bump",
        paragraphs: [
          "One same-angle photo, similar light, each week. The suggestion still starts with calm care + SPF, not ‘we will extract it’. [Start with a photo](/onboarding) if you have no routine yet; if you already use the app, [check in](/check-in) at the same window. Sign up after you see the suggestion. Bumps need time; hands need a rest.",
        ],
      },
    ],
    faqs: [
      {
        question: "Do clogged pores need a harsh exfoliant?",
        answer:
          "No. Harsh scrubs weaken the barrier and often turn bumps into inflamed spots. Mild BHA a few evenings, or just cleanse + moisturize + SPF until skin can tolerate more.",
      },
      {
        question: "Can I use BHA every day?",
        answer:
          "If you are new: not yet. Two nights a week is a start. Every day from week one often means sting and flakes. Calm for a few weeks before you even think about one extra night — not a prescription.",
      },
      {
        question: "Should I book a spa extraction for clogged pores?",
        answer:
          "At home: don’t. Clinic or spa: ask about clean tools and whether skin is already inflamed. Pain, pus, scars — see a clinician, don’t book because you are impatient.",
      },
      {
        question: "Can sunscreen make clogged pores worse?",
        answer:
          "Some formulas feel heavy. Switch to a gel or fluid, use enough, wash it off at night. Dropping SPF entirely usually slows marks more than it ‘clears’ bumps.",
      },
    ],
  };
}

export const munAn: Record<GuideLocale, GuideArticleCopy> = {
  vi: copy("vi"),
  en: copy("en"),
};
