import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { SITEMAP_PUBLIC_PATHS } from "@/lib/seo";

import {
  GUIDE_SLUGS,
  formatGuideDate,
  getGuideArticle,
  guideChrome,
  guideOgPath,
  guidePublicPaths,
  isGuideSlug,
  listGuideArticles,
} from "./catalog";
import {
  guideArticleJsonLd,
  guideBreadcrumbJsonLd,
  guideFaqJsonLd,
  guidesIndexBreadcrumbJsonLd,
} from "./schema";
import { countGuideWords } from "./word-count";

const NEW_SLUGS = ["tham-mun", "da-dau-van-phong"] as const;
const OG_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../public/og/guides");

describe("guide catalog", () => {
  it("exposes six slugs and matching public paths", () => {
    assert.deepEqual([...GUIDE_SLUGS], [
      "da-dau",
      "mun",
      "kem-chong-nang",
      "routine-cham-da",
      "tham-mun",
      "da-dau-van-phong",
    ]);
    assert.deepEqual(guidePublicPaths(), [
      "/guides",
      "/guides/da-dau",
      "/guides/mun",
      "/guides/kem-chong-nang",
      "/guides/routine-cham-da",
      "/guides/tham-mun",
      "/guides/da-dau-van-phong",
    ]);
    for (const path of guidePublicPaths()) {
      assert.ok(
        (SITEMAP_PUBLIC_PATHS as readonly string[]).includes(path),
        `sitemap missing ${path}`,
      );
    }
  });

  it("has vi and en copy, H3s, FAQs, dates, and unique og paths", () => {
    for (const slug of GUIDE_SLUGS) {
      assert.equal(isGuideSlug(slug), true);
      for (const locale of ["vi", "en"] as const) {
        const article = getGuideArticle(slug, locale);
        assert.ok(article.title.length > 10);
        assert.ok(article.description.length > 40);
        assert.ok(article.sections.length >= 5);
        assert.ok(article.faqs.length >= 3);
        assert.equal(article.path, `/guides/${slug}`);
        assert.ok(article.related.every((r) => r !== slug && isGuideSlug(r)));
        assert.match(article.datePublished, /^\d{4}-\d{2}-\d{2}$/);
        assert.match(article.dateModified, /^\d{4}-\d{2}-\d{2}$/);
        assert.equal(article.ogImage.url, guideOgPath(slug));
        assert.ok(article.ogImage.alt.includes(article.title));
        assert.equal(existsSync(path.join(OG_DIR, `${slug}.png`)), true);
        assert.equal(existsSync(path.join(OG_DIR, `${slug}.svg`)), true);

        const subsectionCount = article.sections.reduce(
          (n, section) => n + (section.subsections?.length ?? 0),
          0,
        );
        const checklistCount = article.sections.filter((s) => s.checklist?.length).length;
        assert.ok(subsectionCount >= 3, `${slug}/${locale} needs H3 subsections`);
        assert.ok(checklistCount >= 1, `${slug}/${locale} needs a checklist`);
        assert.ok(
          article.sections.some((s) => /bác sĩ|doctor|clinician/i.test(s.heading)),
          `${slug}/${locale} needs a when-to-see-a-doctor section`,
        );
      }
    }
    assert.equal(listGuideArticles("vi").length, 6);
    assert.equal(listGuideArticles("en").length, 6);
  });

  it("keeps Vietnamese pillar and new guides in the useful-length band", () => {
    for (const slug of GUIDE_SLUGS) {
      const vi = getGuideArticle(slug, "vi");
      const en = getGuideArticle(slug, "en");
      const viWords = countGuideWords(vi);
      const enWords = countGuideWords(en);
      assert.ok(
        viWords >= 980 && viWords <= 1600,
        `${slug} vi word count ${viWords} should be ~1000–1400`,
      );
      assert.ok(
        enWords >= 880 && enWords <= 1600,
        `${slug} en word count ${enWords} should stay near the vi article`,
      );
    }
  });

  it("publishes the two new high-intent URLs in both locales", () => {
    for (const slug of NEW_SLUGS) {
      const vi = getGuideArticle(slug, "vi");
      const en = getGuideArticle(slug, "en");
      assert.equal(vi.path, `/guides/${slug}`);
      assert.notEqual(vi.title, en.title);
      assert.ok(vi.datePublished <= vi.dateModified);
    }
  });

  it("formats dates for vi and en without shifting the calendar day", () => {
    assert.match(formatGuideDate("2026-09-05", "vi"), /2026/);
    assert.match(formatGuideDate("2026-09-05", "en"), /2026/);
    assert.match(formatGuideDate("2026-09-05", "en"), /Sep|Sept/);
  });

  it("emits Article dates, FAQ, and BreadcrumbList schema", () => {
    const article = getGuideArticle("tham-mun", "vi");
    const chrome = guideChrome("vi");
    const articleLd = guideArticleJsonLd(article, "vi");
    const faqLd = guideFaqJsonLd(article);
    const crumbs = guideBreadcrumbJsonLd(article, "vi", chrome);
    const indexCrumbs = guidesIndexBreadcrumbJsonLd("vi", chrome);

    assert.equal(articleLd.datePublished, article.datePublished);
    assert.equal(articleLd.dateModified, article.dateModified);
    assert.ok(Array.isArray(articleLd.image) && articleLd.image[0]?.includes("/og/guides/"));
    assert.equal(faqLd.mainEntity.length, article.faqs.length);
    assert.equal(crumbs.itemListElement.length, 3);
    assert.equal(indexCrumbs.itemListElement.length, 2);
    assert.ok(
      String(crumbs.itemListElement[2]?.item).endsWith("/guides/tham-mun") ||
        String(crumbs.itemListElement[2]?.item).includes("/guides/tham-mun"),
    );
  });
});
