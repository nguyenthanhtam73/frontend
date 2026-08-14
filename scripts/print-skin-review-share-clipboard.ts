/**
 * Print sample clipboard payloads for skin-review share copy.
 *
 *   npm run print:share-clipboard
 */

import {
  buildSkinReviewShareClipboard,
  DEFAULT_SHARE_VARIANT,
  SHORT_BODY_MAX,
  truncateOverview,
} from "../lib/skin-review-share-clipboard";
import type { AdminSkinReviewAnalysis } from "../lib/types/admin-skin-review";

const LINK = "https://dadiary.vn/share/skin-review/demo-slug-abc";

/** Case A — forehead-only crop with spots; nose/cheeks/chin not_visible */
const FOREHEAD_ONLY: AdminSkinReviewAnalysis = {
  overview:
    "Ảnh này chỉ thấy trán thôi — phần mặt còn lại không có. Trán đang nổi dày, đừng bảo không sao. Nốt đỏ và hạt nhỏ rải từ giữa lên gần chân tóc.",
  skin_type: "unclear",
  skin_type_severity: "mild",
  skin_type_note: "Chỉ nhìn được trán nên chưa chốt loại da cả mặt.",
  attention_areas: [
    {
      region: "forehead",
      concern: "papules",
      severity: "moderate",
      note: "Trán đang dày nốt — mật độ khá cao, vừa rải vừa có chỗ cụm ở giữa. Màu đỏ hồng nhẹ, vài hạt sưng; có chỗ nghi đầu trắng. Giữa trán bóng một mảng.",
    },
    {
      region: "nose",
      concern: "not_visible",
      severity: "mild",
      note: "Không thấy mũi trên ảnh — chụp đủ mặt mới nhận xét được.",
    },
    {
      region: "cheeks",
      concern: "not_visible",
      severity: "mild",
      note: "Không thấy má trên ảnh — chụp đủ mặt mới nhận xét được.",
    },
    {
      region: "chin",
      concern: "not_visible",
      severity: "mild",
      note: "Không thấy cằm trên ảnh — chụp đủ mặt mới nhận xét được.",
    },
  ],
  additional_observations: "Chỉ xét được trán.",
  photo_notes: "Ảnh crop chỉ một dải trán.",
  possible_causes: [
    "Do dầu bít tắc ở trán.",
    "Do kích ứng hoặc nặn/cọ mạnh tại chỗ.",
  ],
  soothing_tips: [
    "Đừng nặn ổ đang sưng.",
    "Rửa mặt dịu, tạm nghỉ sản phẩm trị mụn mạnh đang dùng.",
  ],
  non_diagnostic: "Chỉ nói từ ảnh, không phải chẩn đoán.",
};

/** Case B — full face with cheek + chin spots */
const FULL_FACE: AdminSkinReviewAnalysis = {
  overview:
    "Má đang nổi khá rõ, đừng bảo không sao. Gần sống mũi có cụm nốt đỏ. Cằm cũng có nốt — không phải chỉ má đâu.",
  skin_type: "combination",
  skin_type_severity: "mild",
  skin_type_note: "Trán–mũi–cằm bóng hơn má một chút.",
  attention_areas: [
    {
      region: "forehead",
      concern: "oiliness",
      severity: "mild",
      note: "Giữa trán bóng một mảng dưới ánh sáng. Không thấy nốt đỏ nổi.",
    },
    {
      region: "nose",
      concern: "none",
      severity: "mild",
      note: "Mũi nhìn ổn hơn hai bên. Không thấy nốt sưng.",
    },
    {
      region: "cheeks",
      concern: "papules",
      severity: "moderate",
      note: "Hai má gần sống mũi có khoảng 5–6 nốt đỏ nhỏ, hơi sưng, nằm thành cụm. Màu đỏ tươi.",
    },
    {
      region: "chin",
      concern: "papules",
      severity: "mild",
      note: "Cằm cũng có vài nốt đỏ nhỏ rải.",
    },
  ],
  additional_observations: "Chủ yếu nốt má–cằm và bóng trán.",
  photo_notes: "Góc thẳng, đủ sáng.",
  possible_causes: [
    "Do dầu bít tắc quanh má–cằm.",
    "Do nóng ẩm hoặc tóc/cọ xát.",
  ],
  soothing_tips: [
    "Không nặn cụm đang sưng.",
    "Rửa dịu, tạm nghỉ sản phẩm mạnh đang dùng; nhớ chống nắng.",
    "Ổ to, đau hoặc kéo dài thì nên khám da liễu.",
  ],
  non_diagnostic: "Nói từ ảnh thôi, không phải chẩn đoán.",
};

function section(title: string, body: string) {
  console.log(`=== ${title} ===`);
  console.log(body);
  console.log("");
}

function hasShareUrl(text: string): boolean {
  return (
    /https?:\/\//i.test(text) ||
    /dadiary\.vn\/share/i.test(text) ||
    text.includes("Xem đủ hơn tại:") ||
    text.includes("See more here:")
  );
}

function main() {
  console.log(`default variant: ${DEFAULT_SHARE_VARIANT}`);
  console.log(`short body max: ${SHORT_BODY_MAX}`);
  console.log("");

  for (const [label, analysis] of [
    ["A forehead-only", FOREHEAD_ONLY],
    ["B full-face", FULL_FACE],
  ] as const) {
    section(
      `VI ${label} · short_no_link (default)`,
      buildSkinReviewShareClipboard({
        analysis,
        link: LINK,
        locale: "vi",
      }),
    );
    section(
      `VI ${label} · short_with_link`,
      buildSkinReviewShareClipboard({
        analysis,
        link: LINK,
        locale: "vi",
        variant: "short_with_link",
      }),
    );
    section(
      `VI ${label} · full_no_link`,
      buildSkinReviewShareClipboard({
        analysis,
        link: LINK,
        locale: "vi",
        variant: "full_no_link",
      }),
    );
    section(
      `VI ${label} · full_with_link`,
      buildSkinReviewShareClipboard({
        analysis,
        link: LINK,
        locale: "vi",
        variant: "full_with_link",
      }),
    );
    section(
      `VI ${label} · link`,
      buildSkinReviewShareClipboard({
        analysis,
        link: LINK,
        locale: "vi",
        variant: "link",
      }),
    );
    section(
      `EN ${label} · short_no_link`,
      buildSkinReviewShareClipboard({
        analysis,
        link: LINK,
        locale: "en",
        variant: "short_no_link",
      }),
    );
    section(
      `EN ${label} · short_with_link`,
      buildSkinReviewShareClipboard({
        analysis,
        link: LINK,
        locale: "en",
        variant: "short_with_link",
      }),
    );
  }

  // Soft asserts
  if (DEFAULT_SHARE_VARIANT !== "short_no_link") {
    throw new Error("default variant must be short_no_link");
  }

  const aDefault = buildSkinReviewShareClipboard({
    analysis: FOREHEAD_ONLY,
    link: LINK,
    locale: "vi",
  });
  const aNoLink = buildSkinReviewShareClipboard({
    analysis: FOREHEAD_ONLY,
    link: LINK,
    locale: "vi",
    variant: "short_no_link",
  });
  if (aDefault !== aNoLink) {
    throw new Error("omitting variant must equal short_no_link");
  }
  if (hasShareUrl(aDefault)) {
    throw new Error(
      `default short_no_link must not include http / share URL:\n${aDefault}`,
    );
  }
  const viOpener = "Xem ảnh rồi nha.";
  const viCta = "Muốn theo dõi da theo ngày thì DaDiary có check-in.";
  if (!aDefault.includes(viCta)) {
    throw new Error(`VI short_no_link missing CTA:\n${aDefault}`);
  }
  if (!aDefault.includes("trán") && !aDefault.includes("Nhìn ảnh thì")) {
    throw new Error(`VI short_no_link should describe the photo:\n${aDefault}`);
  }
  if (/https?:\/\//i.test(viCta)) {
    throw new Error("CTA must not contain a URL");
  }
  if (
    aDefault.includes("chỉ quan sát, không phải chẩn đoán") ||
    aDefault.includes("Đây mới chỉ là một ảnh") ||
    aDefault.includes("lộ trình chăm sóc da") ||
    aDefault.includes("không thay bác sĩ") ||
    aDefault.includes("Câu hỏi") ||
    aDefault.includes("Trả lời")
  ) {
    throw new Error(`VI short_no_link still has brochure copy:\n${aDefault}`);
  }

  const withAnswer =
    "Má của mày đang có nhiều nốt nhỏ màu da nổi cao, trông giống mụn ẩn. Đừng nặn.";
  const aAnswer = buildSkinReviewShareClipboard({
    analysis: FOREHEAD_ONLY,
    answer: withAnswer,
    link: LINK,
    locale: "vi",
  });
  if (!aAnswer.includes(withAnswer) || !aAnswer.includes(viCta)) {
    throw new Error(`saved answer should be the comment:\n${aAnswer}`);
  }
  if (aAnswer.includes(viOpener) || aAnswer.includes("Nhìn ảnh thì")) {
    throw new Error(`saved answer should not get a template wrapper:\n${aAnswer}`);
  }
  if (hasShareUrl(aAnswer)) {
    throw new Error(`answer short_no_link must not include URL:\n${aAnswer}`);
  }

  const aWithLink = buildSkinReviewShareClipboard({
    analysis: FOREHEAD_ONLY,
    link: LINK,
    locale: "vi",
    variant: "short_with_link",
  });
  if (!aWithLink.includes(LINK) || !aWithLink.includes("Xem đủ hơn tại:")) {
    throw new Error(`short_with_link must include URL:\n${aWithLink}`);
  }

  const aFullNoLink = buildSkinReviewShareClipboard({
    analysis: FOREHEAD_ONLY,
    link: LINK,
    locale: "vi",
    variant: "full_no_link",
  });
  if (!aFullNoLink.includes("Trên ảnh chưa rõ loại da.")) {
    throw new Error(
      `full_no_link (unclear) should use photo-unclear line:\n${aFullNoLink}`,
    );
  }
  if (hasShareUrl(aFullNoLink)) {
    throw new Error(`full_no_link must not include URL:\n${aFullNoLink}`);
  }

  const aFullWithLink = buildSkinReviewShareClipboard({
    analysis: FOREHEAD_ONLY,
    link: LINK,
    locale: "vi",
    variant: "full_with_link",
  });
  if (!aFullWithLink.includes(LINK)) {
    throw new Error(`full_with_link must include URL:\n${aFullWithLink}`);
  }
  if (
    aFullWithLink.includes("chưa rõ loại nhẹ") ||
    aFullWithLink.toLowerCase().includes("unclear skin type")
  ) {
    throw new Error(
      `full must not compose soft type+severity:\n${aFullWithLink}`,
    );
  }

  const bDefault = buildSkinReviewShareClipboard({
    analysis: FULL_FACE,
    link: LINK,
    locale: "vi",
  });
  if (!bDefault.includes(viCta) || !bDefault.includes("má")) {
    throw new Error(
      `full-face short_no_link should describe the photo:\n${bDefault}`,
    );
  }
  if (hasShareUrl(bDefault)) {
    throw new Error(`full-face default must not include URL:\n${bDefault}`);
  }

  const bFull = buildSkinReviewShareClipboard({
    analysis: FULL_FACE,
    link: LINK,
    locale: "vi",
    variant: "full_no_link",
  });
  if (!bFull.includes("Trông nghi da hỗn hợp nhẹ.")) {
    throw new Error(`full (combination) should keep soft type line:\n${bFull}`);
  }

  const enDefault = buildSkinReviewShareClipboard({
    analysis: FOREHEAD_ONLY,
    link: LINK,
    locale: "en",
  });
  if (hasShareUrl(enDefault)) {
    throw new Error(`EN default must not include URL:\n${enDefault}`);
  }
  const enOpener = "Took a look at the photos.";
  const enCta =
    "If you want to track skin day by day, DaDiary has a check-in.";
  if (!enDefault.includes(enCta)) {
    throw new Error(`EN short_no_link missing CTA:\n${enDefault}`);
  }
  if (!enDefault.toLowerCase().includes("forehead")) {
    throw new Error(`EN short_no_link should describe the photo:\n${enDefault}`);
  }
  if (
    enDefault.includes("observations only, not a diagnosis") ||
    enDefault.includes("This is just one photo") ||
    enDefault.includes("day-by-day skin-care plan") ||
    enDefault.includes("not a substitute for a doctor") ||
    enDefault.includes("Question") ||
    enDefault.includes("Answer")
  ) {
    throw new Error(`EN short_no_link still has brochure copy:\n${enDefault}`);
  }
  if (!aWithLink.includes(viCta)) {
    throw new Error(`VI short_with_link should use same CTA:\n${aWithLink}`);
  }
  // Link stays on its own line — not inside the closing CTA.
  const ctaBlock = aWithLink.slice(aWithLink.indexOf(viCta));
  if (ctaBlock.includes(LINK) || /https?:\/\//i.test(ctaBlock)) {
    throw new Error(`CTA block must not embed URL:\n${ctaBlock}`);
  }

  const enWithLink = buildSkinReviewShareClipboard({
    analysis: FOREHEAD_ONLY,
    link: LINK,
    locale: "en",
    variant: "short_with_link",
  });
  if (!enWithLink.includes("See more here:") || !enWithLink.includes(LINK)) {
    throw new Error(`EN short_with_link should include URL:\n${enWithLink}`);
  }

  const pigmentOnly = buildSkinReviewShareClipboard({
    analysis: {
      overview: "Chỉ thấy cằm.",
      attention_areas: [
        {
          region: "chin",
          concern: "pigmentation",
          severity: "mild",
          note: "Cằm có vài nốt thâm nông. Không thấy sưng đỏ hay đầu trắng rõ.",
        },
        { region: "cheeks", concern: "not_visible", severity: "mild", note: "" },
        { region: "forehead", concern: "not_visible", severity: "mild", note: "" },
      ],
    },
    link: LINK,
    locale: "vi",
  });
  if (pigmentOnly.includes("đầu trắng") || pigmentOnly.includes("nổi khá nhiều")) {
    throw new Error(
      `pigment fallback must not invent whiteheads or 'nổi':\n${pigmentOnly}`,
    );
  }
  if (!pigmentOnly.includes("thâm")) {
    throw new Error(`pigment fallback should mention thâm:\n${pigmentOnly}`);
  }

  const truncated = truncateOverview("a".repeat(300), 40);
  if (truncated.length > 40 || !truncated.endsWith("…")) {
    throw new Error("truncateOverview should cap and ellipsize");
  }

  console.log("--- soft asserts: PASS ---");
}

main();
