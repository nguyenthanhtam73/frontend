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
  non_diagnostic: "Nói từ ảnh thôi, không phải chẩn đoán.",
};

function section(title: string, body: string) {
  console.log(`=== ${title} ===`);
  console.log(body);
  console.log("");
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
      `VI ${label} · short (default)`,
      buildSkinReviewShareClipboard({
        analysis,
        link: LINK,
        locale: "vi",
      }),
    );
    section(
      `VI ${label} · short`,
      buildSkinReviewShareClipboard({
        analysis,
        link: LINK,
        locale: "vi",
        variant: "short",
      }),
    );
    section(
      `VI ${label} · full`,
      buildSkinReviewShareClipboard({
        analysis,
        link: LINK,
        locale: "vi",
        variant: "full",
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
      `EN ${label} · short`,
      buildSkinReviewShareClipboard({
        analysis,
        link: LINK,
        locale: "en",
        variant: "short",
      }),
    );
    section(
      `EN ${label} · full`,
      buildSkinReviewShareClipboard({
        analysis,
        link: LINK,
        locale: "en",
        variant: "full",
      }),
    );
  }

  // Soft asserts
  if (DEFAULT_SHARE_VARIANT !== "short") {
    throw new Error("default variant must be short");
  }

  const aShort = buildSkinReviewShareClipboard({
    analysis: FOREHEAD_ONLY,
    link: LINK,
    locale: "vi",
  });
  const aShortExplicit = buildSkinReviewShareClipboard({
    analysis: FOREHEAD_ONLY,
    link: LINK,
    locale: "vi",
    variant: "short",
  });
  if (aShort !== aShortExplicit) {
    throw new Error("omitting variant must equal variant: short");
  }
  const aShortLow = aShort.toLowerCase();
  if (!aShortLow.includes("trán") || !aShortLow.includes("nốt đỏ sưng")) {
    throw new Error(`forehead-only short should mention trán + nốt đỏ sưng:\n${aShort}`);
  }
  if (aShort.includes("papules") || aShort.includes("not_visible")) {
    throw new Error("short must not leak jargon/enum keys");
  }
  if (!aShort.includes("Xem đủ hơn tại:")) {
    throw new Error("VI short must include link label");
  }
  if (!aShort.includes("Check-in") && !aShort.includes("DaDiary")) {
    throw new Error("VI short should include soft DaDiary CTA");
  }
  // short must not include soft skin-type line
  if (
    aShort.includes("Trông nghi") ||
    aShort.includes("Trên ảnh chưa rõ loại da")
  ) {
    throw new Error("short must not include skin type hint");
  }

  const aFull = buildSkinReviewShareClipboard({
    analysis: FOREHEAD_ONLY,
    link: LINK,
    locale: "vi",
    variant: "full",
  });
  if (!aFull.includes("Trên ảnh chưa rõ loại da.")) {
    throw new Error(`full (unclear) should use photo-unclear line:\n${aFull}`);
  }
  if (
    aFull.includes("Trông nghi") ||
    aFull.includes("chưa rõ loại nhẹ") ||
    aFull.toLowerCase().includes("unclear skin type")
  ) {
    throw new Error(`full (unclear) must not compose soft type+severity:\n${aFull}`);
  }

  const bShort = buildSkinReviewShareClipboard({
    analysis: FULL_FACE,
    link: LINK,
    locale: "vi",
    variant: "short",
  });
  const bShortLow = bShort.toLowerCase();
  if (!bShortLow.includes("má") || !bShortLow.includes("nốt")) {
    throw new Error(`full-face short should mention má/nốt:\n${bShort}`);
  }
  // not_visible hint should NOT invent missing regions on full face
  if (bShort.includes("không thấy trên ảnh này")) {
    throw new Error("full-face short should not claim missing regions");
  }
  if (
    bShort.includes("Trông nghi") ||
    bShort.includes("Trên ảnh chưa rõ loại da")
  ) {
    throw new Error("full-face short must not include skin type hint");
  }

  const bFull = buildSkinReviewShareClipboard({
    analysis: FULL_FACE,
    link: LINK,
    locale: "vi",
    variant: "full",
  });
  if (!bFull.includes("Trông nghi da hỗn hợp nhẹ.")) {
    throw new Error(`full (combination) should keep soft type line:\n${bFull}`);
  }

  const enFullUnclear = buildSkinReviewShareClipboard({
    analysis: FOREHEAD_ONLY,
    link: LINK,
    locale: "en",
    variant: "full",
  });
  if (
    !enFullUnclear.includes("Skin type isn’t clear from these photos.") &&
    !enFullUnclear.includes("Skin type isn't clear from these photos.")
  ) {
    throw new Error(`EN full (unclear) line missing:\n${enFullUnclear}`);
  }
  if (enFullUnclear.toLowerCase().includes("unclear skin type")) {
    throw new Error(`EN full must not say unclear skin type:\n${enFullUnclear}`);
  }

  const enShort = buildSkinReviewShareClipboard({
    analysis: FOREHEAD_ONLY,
    link: LINK,
    locale: "en",
    variant: "short",
  });
  if (!enShort.startsWith("Took a look")) {
    throw new Error("EN short frame should be English");
  }
  if (!enShort.includes("See more here:")) {
    throw new Error("EN short should use See more here: label");
  }

  const truncated = truncateOverview("a".repeat(300), 40);
  if (truncated.length > 40 || !truncated.endsWith("…")) {
    throw new Error("truncateOverview should cap and ellipsize");
  }

  console.log("--- soft asserts: PASS ---");
}

main();
