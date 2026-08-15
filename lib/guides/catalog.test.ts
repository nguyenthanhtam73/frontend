import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  GUIDE_SLUGS,
  getGuideArticle,
  guidePublicPaths,
  isGuideSlug,
  listGuideArticles,
} from "./catalog";

describe("guide catalog", () => {
  it("exposes four slugs and matching public paths", () => {
    assert.deepEqual(GUIDE_SLUGS, [
      "da-dau",
      "mun",
      "kem-chong-nang",
      "routine-cham-da",
    ]);
    assert.deepEqual(guidePublicPaths(), [
      "/guides",
      "/guides/da-dau",
      "/guides/mun",
      "/guides/kem-chong-nang",
      "/guides/routine-cham-da",
    ]);
  });

  it("has vi and en copy, FAQs, and a photo CTA path for every article", () => {
    for (const slug of GUIDE_SLUGS) {
      assert.equal(isGuideSlug(slug), true);
      for (const locale of ["vi", "en"] as const) {
        const article = getGuideArticle(slug, locale);
        assert.ok(article.title.length > 10);
        assert.ok(article.description.length > 40);
        assert.ok(article.sections.length >= 3);
        assert.ok(article.faqs.length >= 2);
        assert.equal(article.path, `/guides/${slug}`);
        assert.ok(article.related.every((r) => r !== slug && isGuideSlug(r)));
      }
    }
    assert.equal(listGuideArticles("vi").length, 4);
  });
});
