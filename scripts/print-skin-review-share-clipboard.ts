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
    "Thường gặp khi dầu + bít tắc ở trán.",
    "Đôi khi liên quan kích ứng — không chắc 100% chỉ từ một ảnh.",
  ],
  soothing_tips: [
    "Đừng nặn ổ đang sưng.",
    "Rửa mặt dịu, tạm tránh active mạnh.",
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
    "Thường gặp khi dầu + bít tắc quanh má–cằm.",
    "Đôi khi liên quan nóng ẩm — không chắc 100% chỉ từ một ảnh.",
  ],
  soothing_tips: [
    "Không nặn cụm đang sưng.",
    "Rửa dịu, tạm tránh active mạnh; nhớ chống nắng.",
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
  const aShortLow = aDefault.toLowerCase();
  if (!aShortLow.includes("trán") || !aShortLow.includes("nốt đỏ sưng")) {
    throw new Error(
      `forehead-only short_no_link should mention trán + nốt đỏ sưng:\n${aDefault}`,
    );
  }
  if (aDefault.includes("papules") || aDefault.includes("not_visible")) {
    throw new Error("short_no_link must not leak jargon/enum keys");
  }
  if (hasShareUrl(aDefault)) {
    throw new Error(
      `default short_no_link must not include http / share URL:\n${aDefault}`,
    );
  }
  const viOpener =
    "Mình xem giúp từ ảnh nha — chỉ quan sát, không phải chẩn đoán.";
  const viCta =
    "Đây mới chỉ là một ảnh. Muốn có lộ trình chăm sóc da theo ngày thì dùng DaDiary nhé.";
  if (!aDefault.startsWith(viOpener)) {
    throw new Error(`VI short_no_link opener mismatch:\n${aDefault}`);
  }
  if (!aDefault.endsWith(viCta) || !aDefault.includes(viCta)) {
    throw new Error(`VI short_no_link should end with new CTA:\n${aDefault}`);
  }
  if (/https?:\/\//i.test(viCta)) {
    throw new Error("CTA must not contain a URL");
  }
  // Old CTAs must be gone.
  if (
    aDefault.includes("Mình dùng DaDiary để check-in ảnh") ||
    aDefault.includes("không thay bác sĩ") ||
    aDefault.includes("muốn biết da có cải thiện không thì cần theo dõi thêm vài ngày") ||
    aDefault.includes("Dùng DaDiary check-in vài ngày")
  ) {
    throw new Error(`VI short_no_link still has old CTA:\n${aDefault}`);
  }
  if (
    aDefault.includes("Trông nghi") ||
    aDefault.includes("Trên ảnh chưa rõ loại da")
  ) {
    throw new Error("short_no_link must not include skin type hint");
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
  const bShortLow = bDefault.toLowerCase();
  if (!bShortLow.includes("má") || !bShortLow.includes("nốt")) {
    throw new Error(`full-face short_no_link should mention má/nốt:\n${bDefault}`);
  }
  if (bDefault.includes("không thấy trên ảnh này")) {
    throw new Error("full-face short_no_link should not claim missing regions");
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
  if (!enDefault.startsWith("Took a look")) {
    throw new Error("EN short_no_link frame should be English");
  }
  if (hasShareUrl(enDefault)) {
    throw new Error(`EN default must not include URL:\n${enDefault}`);
  }
  const enOpener =
    "Took a look from the photos for you — observations only, not a diagnosis.";
  const enCta =
    "This is just one photo. Use DaDiary if you want a day-by-day skin-care plan.";
  if (!enDefault.startsWith(enOpener)) {
    throw new Error(`EN short_no_link opener mismatch:\n${enDefault}`);
  }
  if (!enDefault.endsWith(enCta) || !enDefault.includes(enCta)) {
    throw new Error(`EN short_no_link should end with new CTA:\n${enDefault}`);
  }
  if (
    enDefault.includes("I use DaDiary to check in") ||
    enDefault.includes("not a substitute for a doctor") ||
    enDefault.includes("few more days of tracking")
  ) {
    throw new Error(`EN short_no_link still has old CTA:\n${enDefault}`);
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

  const truncated = truncateOverview("a".repeat(300), 40);
  if (truncated.length > 40 || !truncated.endsWith("…")) {
    throw new Error("truncateOverview should cap and ellipsize");
  }

  console.log("--- soft asserts: PASS ---");
}

main();
