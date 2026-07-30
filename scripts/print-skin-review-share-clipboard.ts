/**
 * Print sample clipboard payloads for skin-review share copy.
 *
 *   npm run print:share-clipboard
 */

import {
  buildSkinReviewShareClipboard,
  DEFAULT_SHARE_VARIANT,
  SHORT_OVERVIEW_MAX,
  truncateOverview,
} from "../lib/skin-review-share-clipboard";

const LINK = "https://dadiary.vn/share/skin-review/demo-slug-abc";

/** Demo overview stays Vietnamese (as AI usually returns) even for EN frames. */
const OVERVIEW_LONG =
  "Hôm nay da hơi 'party' nhẹ nha. Trên trán thấy vài nốt đỏ nhỏ, chắc khoảng 3–4 nốt, nằm rải rác. Mũi thì không có gì quá nổi bật, nhìn khá êm. Má bên trái lại có một cụm nốt đỏ, khoảng 5–6 nốt, nhìn hơi nổi bật. Cằm thì có vài nốt nhỏ nữa. Nói chung, má và cằm đang 'ồn ào' nhất, còn mũi thì yên bình hơn.";

const OVERVIEW_SHORT = "Má hơi drama nhẹ, còn lại nhìn ổn.";

function section(title: string, body: string) {
  console.log(`=== ${title} ===`);
  console.log(body);
  console.log("");
}

function main() {
  const shortSnippet = truncateOverview(OVERVIEW_LONG, SHORT_OVERVIEW_MAX);
  console.log("--- truncate check (short max 100) ---");
  console.log(`overview long chars: ${OVERVIEW_LONG.length}`);
  console.log(`snippet chars: ${shortSnippet.length}`);
  console.log(`snippet: ${shortSnippet}`);
  console.log(`default variant: ${DEFAULT_SHARE_VARIANT}`);
  console.log("");

  // Default omit variant → short
  section(
    "VI short (default)",
    buildSkinReviewShareClipboard({
      overview: OVERVIEW_LONG,
      link: LINK,
      skinType: "combination",
      skinTypeSeverity: "mild",
      locale: "vi",
    }),
  );

  section(
    "VI short",
    buildSkinReviewShareClipboard({
      overview: OVERVIEW_LONG,
      link: LINK,
      skinType: "combination",
      skinTypeSeverity: "mild",
      locale: "vi",
      variant: "short",
    }),
  );

  section(
    "VI full",
    buildSkinReviewShareClipboard({
      overview: OVERVIEW_LONG,
      link: LINK,
      skinType: "combination",
      skinTypeSeverity: "mild",
      locale: "vi",
      variant: "full",
    }),
  );

  section(
    "VI full (overview ngắn, không skinType)",
    buildSkinReviewShareClipboard({
      overview: OVERVIEW_SHORT,
      link: LINK,
      locale: "vi",
      variant: "full",
    }),
  );

  section(
    "VI link only",
    buildSkinReviewShareClipboard({
      overview: OVERVIEW_LONG,
      link: LINK,
      locale: "vi",
      variant: "link",
    }),
  );

  section(
    "EN short",
    buildSkinReviewShareClipboard({
      overview: OVERVIEW_LONG,
      link: LINK,
      skinType: "combination",
      skinTypeSeverity: "mild",
      locale: "en",
      variant: "short",
    }),
  );

  section(
    "EN full",
    buildSkinReviewShareClipboard({
      overview: OVERVIEW_LONG,
      link: LINK,
      skinType: "combination",
      skinTypeSeverity: "mild",
      locale: "en",
      variant: "full",
    }),
  );

  // Soft asserts (still print above for human review).
  if (DEFAULT_SHARE_VARIANT !== "short") {
    throw new Error("default variant must be short");
  }
  if (shortSnippet.length > SHORT_OVERVIEW_MAX) {
    throw new Error(
      `short overview snippet > ${SHORT_OVERVIEW_MAX}: ${shortSnippet.length}`,
    );
  }
  if (!shortSnippet.endsWith("…")) {
    throw new Error("long overview short-snippet should end with …");
  }

  const defaultOut = buildSkinReviewShareClipboard({
    overview: OVERVIEW_LONG,
    link: LINK,
    locale: "vi",
  });
  const shortOut = buildSkinReviewShareClipboard({
    overview: OVERVIEW_LONG,
    link: LINK,
    locale: "vi",
    variant: "short",
  });
  if (defaultOut !== shortOut) {
    throw new Error("omitting variant must equal variant: short");
  }
  if (defaultOut.includes("Trên ảnh nghi") || defaultOut.includes("Da hỗn hợp")) {
    throw new Error("short must not include skin type line");
  }

  const viFull = buildSkinReviewShareClipboard({
    overview: OVERVIEW_LONG,
    link: LINK,
    skinType: "combination",
    skinTypeSeverity: "mild",
    locale: "vi",
    variant: "full",
  });
  if (!viFull.includes("Trên ảnh nghi da hỗn hợp nhẹ.")) {
    throw new Error(`VI full soft skin hint missing:\n${viFull}`);
  }
  if (viFull.includes("Gợi ý loại da")) {
    throw new Error("VI full must not use hard skin-type wording");
  }

  const enShort = buildSkinReviewShareClipboard({
    overview: OVERVIEW_LONG,
    link: LINK,
    locale: "en",
    variant: "short",
  });
  if (!enShort.startsWith("Quick look")) {
    throw new Error("EN short frame should be English");
  }
  if (!enShort.includes("Hôm nay da hơi")) {
    throw new Error("EN short should keep VI overview verbatim");
  }
  if (!enShort.includes("Details:")) {
    throw new Error("EN short should use Details: link label");
  }

  console.log("--- soft asserts: PASS ---");
}

main();
