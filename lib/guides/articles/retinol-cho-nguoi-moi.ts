import { figure } from "../media";
import type { GuideArticleCopy, GuideLocale } from "../types";

function copy(locale: GuideLocale): GuideArticleCopy {
  const calendar = figure(
    "/guides/retinol-cho-nguoi-moi/calendar.svg",
    {
      vi: {
        alt: "Lịch một tuần: hai đêm retinol có dấu, các đêm còn lại chỉ dưỡng — minh họa bắt đầu chậm.",
        caption: "Hai đêm/tuần đã là bắt đầu. Không cần ‘mỗi đêm từ tuần đầu’.",
      },
      en: {
        alt: "A one-week calendar: two retinol nights marked, the rest moisturizer-only — a slow start.",
        caption: "Two nights a week is a start. You do not need ‘every night from week one’.",
      },
    },
    locale,
  );
  const sandwich = figure(
    "/guides/retinol-cho-nguoi-moi/sandwich.svg",
    {
      vi: {
        alt: "Thứ tự tối: dưỡng mỏng, một lớp retinol nhỏ, dưỡng lại — không nhãn thương hiệu.",
        caption: "Dưỡng → một lớp mỏng → dưỡng. Không phải càng nhiều càng nhanh.",
      },
      en: {
        alt: "Night order: a thin moisturizer, a small retinol layer, moisturizer again — no brand labels.",
        caption: "Moisturizer → a thin layer → moisturizer. More product is not faster.",
      },
    },
    locale,
  );
  const daytime = figure(
    "/guides/retinol-cho-nguoi-moi/daytime.svg",
    {
      vi: {
        alt: "Buổi sáng sau đêm retinol: tuýp chống nắng và mũ, không thoa thêm acid.",
        caption: "Sáng hôm sau: SPF đủ lượng. Bỏ nắng là cách thâm và rát kéo dài.",
      },
      en: {
        alt: "The morning after a retinol night: a sunscreen tube and a hat, no extra acid.",
        caption: "Next morning: enough SPF. Skipping sun care is how marks and sting linger.",
      },
    },
    locale,
  );

  if (locale === "vi") {
    return {
      title: "Retinol cho người mới: chậm, SPF, dừng khi rát",
      description:
        "Muốn thử retinol trên da nóng ẩm? Ổn định rửa–dưỡng–SPF, patch-test, vài đêm/tuần, không chồng acid. DaDiary Beta: không kê đơn, không hứa hết mụn — chụp ảnh nhận routine nhẹ.",
      kicker: "Retinol người mới",
      lede:
        "Retinol kệ không phải đơn tretinoin. Mình không bảo bạn ‘phải dùng’. Nếu vẫn muốn thử: chậm, SPF mỗi sáng, dừng khi rát — không ‘cố cho da quen’ khi đang nẻ. DaDiary đang Beta: không chẩn bệnh, không thay bác sĩ.",
      heroFigure: calendar,
      sections: [
        {
          heading: "Retinol kệ khác thuốc kê đơn",
          paragraphs: [
            "Retinol trên kệ là mỹ phẩm. Tretinoin và một số retinoid khác là thuốc — liều và cách dùng thuộc bác sĩ.",
            "Trang này không bảo bạn đổi đơn, không so ‘mạnh bằng thuốc’, không hứa hết mụn hay hết thâm trong 7 ngày.",
          ],
          subsections: [
            {
              heading: "Việc retinol không làm",
              paragraphs: [
                "Không thay kem chống nắng. Không thay việc không nặn. Không phải bước đầu khi da đang đỏ, nẻ, hay mụn nang đau — xem [da nhạy cảm](/guides/da-nhay-cam) và [bài mụn](/guides/mun).",
              ],
            },
            {
              heading: "Ai nên hỏi bác sĩ trước",
              paragraphs: [
                "Đang mang thai, cho con bú, hoặc có kế hoạch: hỏi bác sĩ, đừng tự bắt đầu vì một bài. Đang trị theo đơn: hỏi trước khi thêm retinol kệ lên cùng vùng.",
              ],
            },
          ],
        },
        {
          heading: "Điều kiện trước khi mở nắp",
          paragraphs: [
            "Nếu nền 3 bước còn chưa giữ được, retinol chỉ thêm biến. Ổn định rửa dịu–dưỡng–SPF khoảng hai tuần — [routine người mới](/guides/routine-cham-da) nói rõ khung này.",
          ],
          checklist: [
            "Da không đang rát cả ngày, không nẻ chảy.",
            "Bạn chịu được kem chống nắng mỗi sáng.",
            "Sẵn sàng chỉ thêm một thay đổi — không kèm peel, AHA, BHA mạnh cùng tuần.",
            "Patch-test 2–3 đêm sau tai hoặc dọc hàm.",
          ],
        },
        {
          heading: "Cách bắt đầu chậm",
          paragraphs: [
            "Mục tiêu tuần đầu: da còn chịu được sáng hôm sau. Không phải ‘thấy bong là đang chạy’.",
          ],
          figure: sandwich,
          subsections: [
            {
              heading: "Hai đêm một tuần đã đủ để học",
              paragraphs: [
                "Lượng rất nhỏ, tối, trên da khô. Nhiều người chịu hơn nếu dưỡng mỏng trước và sau (sandwich). Đêm còn lại: chỉ dưỡng.",
                "Êm 2–3 tuần mới nghĩ tới đêm thứ ba. Không tăng vì một video hứa ‘30 ngày’.",
              ],
            },
            {
              heading: "Sáng hôm sau: SPF, không thêm acid",
              paragraphs: [
                "Hai ngón tay, cổ, tai trước. Mũ khi nắng gắt. Thâm sau mụn dễ đậm nếu vừa kích vừa bỏ nắng — [bài thâm mụn](/guides/tham-mun) nói rõ việc này.",
              ],
              figure: daytime,
            },
          ],
        },
        {
          heading: "Nên làm / nên tránh",
          paragraphs: ["Không có review bịa trên trang này. Da bạn không phải trước-sau trên ads."],
          doAvoid: {
            doItems: [
              "Patch-test. Hai đêm/tuần. Dưỡng sau.",
              "SPF đủ lượng mỗi sáng, kể cả ngày mây.",
              "Một thay đổi mỗi lần. Ảnh cùng góc theo tuần.",
              "Dừng khi rát, nẻ, ban — lùi về rửa–dưỡng–SPF.",
            ],
            avoidItems: [
              "Mỗi đêm từ tuần đầu, ‘lớp dày cho nhanh’.",
              "Chồng AHA / BHA / vitamin C mạnh cùng đêm.",
              "Dùng quanh mắt, môi, cánh mũi nếu đang rát — vùng đó mỏng.",
              "Tiếp tục khi da nẻ chảy vì sợ ‘mất công’.",
            ],
          },
        },
        {
          heading: "Bong da, ‘purge’, và kích ứng",
          paragraphs: [
            "Bong nhẹ có thể gặp. Rát cả ngày, ban, sưng, mụn hàng loạt đau — đó không phải lúc ‘cố thêm’. Dừng. DaDiary không phân biệt purge và kích từ một bài hay một ảnh.",
            "Tự gọi là purge rồi tăng lượng là cách hay gặp để làm hàng rào hỏng. Ảnh cùng cửa sổ giúp bạn (và gợi ý sau này) đọc thật hơn cảm giác 2 giờ sáng.",
          ],
        },
        {
          heading: "Khi nào gặp bác sĩ",
          paragraphs: [
            "Retinoid kê đơn, mụn nang, sẹo đang thành — việc của phòng khám. Đừng tự tăng nồng độ kệ cho ‘bằng thuốc’.",
          ],
          checklist: [
            "Mang thai, cho con bú, hoặc đang có đơn — hỏi trước.",
            "Sưng, mủ, đau, sốt, sẹo đang thành.",
            "Ban lan, mắt sưng, khó thở sau sản phẩm — dừng, đi khám.",
            "Nẻ không dịu sau vài ngày chỉ rửa–dưỡng–SPF.",
          ],
        },
        {
          heading: "Chụp ảnh nền êm, rồi hãy hỏi routine",
          paragraphs: [
            "Một ảnh cùng góc khi da đang dùng nền — chưa cần đêm retinol đầu. Gợi ý có thể bảo bạn chờ. Xem routine rồi đăng ký. Retinol không phải vé vào cửa DaDiary.",
          ],
        },
      ],
      faqs: [
        {
          question: "Retinol có trị hết mụn không?",
          answer:
            "Không có lời hứa đó ở đây. Một số người thấy ít mụn theo thời gian; một số không hợp. Mụn nang, đau, sẹo — gặp bác sĩ, đừng tự tăng chai kệ.",
        },
        {
          question: "Ban ngày có được thoa retinol không?",
          answer:
            "Người mới: để tối cho dễ nhớ SPF sáng hôm sau. Retinol không thay kem chống nắng. Nắng ẩm Việt Nam không phải lúc bỏ SPF.",
        },
        {
          question: "Nên chọn nồng độ nào?",
          answer:
            "Trang này không kê phần trăm. Nguyên tắc ít hại: thấp, ít đêm, patch-test. ‘Mạnh hơn’ không phải nhanh hơn nếu da đang rát.",
        },
        {
          question: "Đang dùng niacinamide thì có thêm retinol được không?",
          answer:
            "Có người chồng được khi da êm; không bắt buộc. Người mới: đứng yên một hoạt chất đã. Muốn thêm: một thay đổi, vài tuần, SPF vẫn mỗi sáng.",
        },
      ],
    };
  }

  return {
    title: "Retinol for beginners: go slow, wear SPF, stop if it stings",
    description:
      "Want to try retinol in humid heat? Stabilize cleanse–moisturize–SPF, patch-test, a few nights a week, no extra acids. DaDiary Beta: no prescription, no acne promise — then a photo for a gentle routine.",
    kicker: "Beginner retinol",
    lede:
      "Shelf retinol is not a tretinoin prescription. This page does not say you ‘must’ use it. If you still want to try: go slow, SPF every morning, stop if it stings — don’t ‘push through’ on cracked skin. DaDiary is in Beta: no diagnosis, not a doctor visit.",
    heroFigure: calendar,
    sections: [
      {
        heading: "Shelf retinol is not a prescription",
        paragraphs: [
          "Retinol on a shelf is a cosmetic. Tretinoin and some other retinoids are medicines — dose and use belong with a clinician.",
          "This page does not tell you to change a prescription, does not compare ‘strength to a drug’, and does not promise clear skin or faded marks in 7 days.",
        ],
        subsections: [
          {
            heading: "What retinol does not replace",
            paragraphs: [
              "It does not replace sunscreen. It does not replace leaving spots alone. It is not step one while skin is red, cracked, or holding painful cysts — see the [sensitive-skin](/guides/da-nhay-cam) and [acne](/guides/mun) guides.",
            ],
          },
          {
            heading: "Who should ask first",
            paragraphs: [
              "Pregnant, breastfeeding, or planning to be: ask a clinician, don’t start because of an article. Already on a prescribed cream: ask before adding shelf retinol on the same area.",
            ],
          },
        ],
      },
      {
        heading: "Before you open the bottle",
        paragraphs: [
          "If the 3-step base is not keepable yet, retinol only adds noise. Hold a gentle cleanse–moisturizer–SPF for about two weeks — the [beginner routine](/guides/routine-cham-da) spells out that frame.",
        ],
        checklist: [
          "You are not stinging all day or splitting.",
          "You can wear sunscreen every morning.",
          "You will add only one change — no peel, AHA, or strong BHA in the same week.",
          "Patch-test 2–3 nights behind the ear or along the jaw.",
        ],
      },
      {
        heading: "A slow start",
        paragraphs: [
          "Week one’s job: you can still face the next morning. It is not ‘flakes mean it is working’.",
        ],
        figure: sandwich,
        subsections: [
          {
            heading: "Two nights a week is enough to learn",
            paragraphs: [
              "A very small amount, at night, on dry skin. Many people tolerate it better with a thin moisturizer before and after (a sandwich). Other nights: moisturizer only.",
              "Calm for 2–3 weeks before you even think about a third night. Don’t raise it because a video promised ‘30 days’.",
            ],
          },
          {
            heading: "Next morning: SPF, no extra acid",
            paragraphs: [
              "Two fingers, neck, the front of the ears. A hat in harsh sun. Post-acne marks darken if you irritate and skip sun care — the [marks guide](/guides/tham-mun) covers that job.",
            ],
            figure: daytime,
          },
        ],
      },
      {
        heading: "Do this / skip this",
        paragraphs: [
          "No invented reviews here. Your face is not an ad before-and-after.",
        ],
        doAvoid: {
          doItems: [
            "Patch-test. Two nights a week. Moisturizer after.",
            "Enough SPF every morning, including cloudy days.",
            "One change at a time. Same-angle photos weekly.",
            "Stop if it stings, cracks, or rashes — return to cleanse–moisturize–SPF.",
          ],
          avoidItems: [
            "Every night from week one, a ‘thick layer to go faster’.",
            "Stacking AHA / BHA / strong vitamin C the same night.",
            "Using it around eyes, lips, or nose wings if you already sting — those areas are thin.",
            "Pushing through splits because you ‘already started’.",
          ],
        },
      },
      {
        heading: "Flakes, ‘purge’, and irritation",
        paragraphs: [
          "Light flaking can happen. All-day sting, a rash, swelling, a crop of painful spots — that is not the moment to push. Stop. DaDiary cannot tell purge from irritation from a blog or one photo.",
          "Calling it a purge and raising the amount is a common way to break the barrier. Same-window photos help you (and a later suggestion) read better than a 2 a.m. feeling.",
        ],
      },
      {
        heading: "When to see a doctor",
        paragraphs: [
          "Prescription retinoids, cysts, scars that are forming — clinic work. Don’t raise a shelf percentage to ‘match a drug’.",
        ],
        checklist: [
          "Pregnant, breastfeeding, or already on a prescription — ask first.",
          "Swelling, pus, pain, fever, scars forming.",
          "A spreading rash, swollen eyes, or trouble breathing after a product — stop, get care.",
          "Cracks that do not settle after a few days of cleanse–moisturize–SPF.",
        ],
      },
      {
        heading: "Photograph a calm base, then ask for a routine",
        paragraphs: [
          "One same-angle photo on the base — you do not need the first retinol night first. The suggestion may tell you to wait. See the routine, then sign up. Retinol is not the ticket into DaDiary.",
        ],
      },
    ],
    faqs: [
      {
        question: "Will retinol clear all my acne?",
        answer:
          "There is no promise like that here. Some people see fewer spots over time; some do not get along with it. Cysts, pain, scars — see a clinician, don’t raise a shelf bottle on your own.",
      },
      {
        question: "Can I wear retinol in the morning?",
        answer:
          "For beginners: keep it at night so morning SPF is easier to remember. Retinol is not a sunscreen. Humid Vietnamese sun is not when you drop SPF.",
      },
      {
        question: "Which strength should I pick?",
        answer:
          "This page does not prescribe a percentage. Lower-harm: low, few nights, patch-tested. ‘Stronger’ is not faster if you are already stinging.",
      },
      {
        question: "I already use niacinamide — can I add retinol?",
        answer:
          "Some people layer both when skin is calm; it is not required. Beginners: stay with one active first. If you add: one change, a few weeks, SPF still every morning.",
      },
    ],
  };
}

export const retinolChoNguoiMoi: Record<GuideLocale, GuideArticleCopy> = {
  vi: copy("vi"),
  en: copy("en"),
};
