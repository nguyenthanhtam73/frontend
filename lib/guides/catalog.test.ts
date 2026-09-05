import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { SITEMAP_PUBLIC_PATHS } from "@/lib/seo";

import {
  GUIDE_CLIMATE_HUB_PATH,
  GUIDE_CLUSTERS,
  GUIDE_SLUGS,
  formatGuideDate,
  getGuideArticle,
  guideChrome,
  guideOgPath,
  guidePublicPaths,
  isGuideSlug,
  listGuideArticles,
} from "./catalog";
import { listGuideFigures } from "./figures";
import {
  clusteredSlugSet,
  climateHubOgPath,
  getClimateHub,
} from "./hub";
import {
  climateHubBreadcrumbJsonLd,
  climateHubFaqJsonLd,
  climateHubJsonLd,
  guideArticleJsonLd,
  guideBreadcrumbJsonLd,
  guideFaqJsonLd,
  guidesIndexBreadcrumbJsonLd,
  guidesIndexCollectionJsonLd,
} from "./schema";
import { countGuideWords } from "./word-count";

const NEW_SLUGS = ["da-kho", "da-nhay-cam", "retinol-cho-nguoi-moi"] as const;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OG_DIR = path.join(ROOT, "public/og/guides");

describe("guide catalog", () => {
  it("exposes nine slugs and matching public paths", () => {
    assert.deepEqual([...GUIDE_SLUGS], [
      "da-dau",
      "mun",
      "kem-chong-nang",
      "routine-cham-da",
      "tham-mun",
      "da-dau-van-phong",
      "da-kho",
      "da-nhay-cam",
      "retinol-cho-nguoi-moi",
    ]);
    assert.deepEqual(guidePublicPaths(), [
      "/guides",
      GUIDE_CLIMATE_HUB_PATH,
      "/guides/da-dau",
      "/guides/mun",
      "/guides/kem-chong-nang",
      "/guides/routine-cham-da",
      "/guides/tham-mun",
      "/guides/da-dau-van-phong",
      "/guides/da-kho",
      "/guides/da-nhay-cam",
      "/guides/retinol-cho-nguoi-moi",
    ]);
    assert.equal(isGuideSlug("da-nong-am"), false);
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
        assert.match(article.description, /Beta/i);
        assert.match(article.lede, /Beta/i);
        assert.match(JSON.stringify(article), /\]\(\/guides\/[a-z0-9-]+\)/);
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
        const doAvoidCount = article.sections.filter((s) => s.doAvoid).length;
        const figures = listGuideFigures(article);
        assert.ok(subsectionCount >= 2, `${slug}/${locale} needs H3 subsections`);
        assert.ok(checklistCount >= 1, `${slug}/${locale} needs a checklist`);
        assert.ok(doAvoidCount >= 1, `${slug}/${locale} needs a do/avoid box`);
        assert.ok(figures.length >= 2, `${slug}/${locale} needs at least 2 figures`);
        assert.ok(
          article.sections.some((s) => /bác sĩ|doctor|clinician/i.test(s.heading)),
          `${slug}/${locale} needs a when-to-see-a-doctor section`,
        );
        for (const figure of figures) {
          assert.ok(figure.alt.length > 20, `${slug}/${locale} figure needs meaningful alt`);
          assert.match(figure.src, /\.(svg|png)$/);
          assert.equal(existsSync(path.join(ROOT, "public", figure.src.replace(/^\//, ""))), true);
        }
      }
    }
    assert.equal(listGuideArticles("vi").length, 9);
    assert.equal(listGuideArticles("en").length, 9);
  });

  it("keeps Vietnamese pillar and new guides in the useful-length band", () => {
    for (const slug of GUIDE_SLUGS) {
      const vi = getGuideArticle(slug, "vi");
      const en = getGuideArticle(slug, "en");
      const viWords = countGuideWords(vi);
      const enWords = countGuideWords(en);
      assert.ok(
        viWords >= 750 && viWords <= 1600,
        `${slug} vi word count ${viWords} should stay useful without stuffing`,
      );
      assert.ok(
        enWords >= 680 && enWords <= 1600,
        `${slug} en word count ${enWords} should stay near the vi article`,
      );
    }
  });

  it("publishes the three new high-intent URLs in both locales", () => {
    for (const slug of NEW_SLUGS) {
      const vi = getGuideArticle(slug, "vi");
      const en = getGuideArticle(slug, "en");
      assert.equal(vi.path, `/guides/${slug}`);
      assert.notEqual(vi.title, en.title);
      assert.ok(vi.datePublished <= vi.dateModified);
      assert.match(vi.lede, /Beta/i);
      assert.match(en.lede, /Beta/i);
    }
  });

  it("formats dates for vi and en without shifting the calendar day", () => {
    assert.match(formatGuideDate("2026-09-05", "vi"), /2026/);
    assert.match(formatGuideDate("2026-09-05", "en"), /2026/);
    assert.match(formatGuideDate("2026-09-05", "en"), /Sep|Sept/);
  });

  it("emits Article dates, FAQ, and BreadcrumbList schema", () => {
    const article = getGuideArticle("da-kho", "vi");
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
      String(crumbs.itemListElement[2]?.item).endsWith("/guides/da-kho") ||
        String(crumbs.itemListElement[2]?.item).includes("/guides/da-kho"),
    );

    const indexLd = guidesIndexCollectionJsonLd("vi", chrome, listGuideArticles("vi"));
    assert.equal(indexLd["@type"], "CollectionPage");
    assert.equal(indexLd.mainEntity.numberOfItems, 9);
  });

  it("clusters all nine guides once on the climate hub", () => {
    const clustered = clusteredSlugSet();
    assert.equal(clustered.size, GUIDE_SLUGS.length);
    for (const slug of GUIDE_SLUGS) {
      assert.equal(clustered.has(slug), true, `cluster missing ${slug}`);
    }
    assert.equal(
      GUIDE_CLUSTERS.reduce((n, cluster) => n + cluster.slugs.length, 0),
      9,
    );

    for (const locale of ["vi", "en"] as const) {
      const hub = getClimateHub(locale);
      assert.equal(hub.path, GUIDE_CLIMATE_HUB_PATH);
      assert.ok(hub.heading.length > 10);
      assert.match(hub.description, /Beta/i);
      assert.match(hub.lede, /Beta/i);
      assert.equal(hub.clusters.length, 4);
      assert.ok(hub.faqs.length >= 3);
      assert.equal(
        hub.clusters.reduce((n, cluster) => n + cluster.articles.length, 0),
        9,
      );
      assert.equal(hub.ogImage.url, climateHubOgPath());
      assert.equal(existsSync(path.join(OG_DIR, "da-nong-am.png")), true);
      assert.equal(existsSync(path.join(OG_DIR, "da-nong-am.svg")), true);

      const hubLd = climateHubJsonLd(hub, locale);
      const hubFaq = climateHubFaqJsonLd(hub);
      const hubCrumbs = climateHubBreadcrumbJsonLd(locale, guideChrome(locale));
      assert.equal(hubLd["@type"], "CollectionPage");
      assert.equal(hubLd.mainEntity.numberOfItems, 9);
      assert.equal(hubFaq.mainEntity.length, hub.faqs.length);
      assert.equal(hubCrumbs.itemListElement.length, 3);
      assert.ok(String(hubCrumbs.itemListElement[2]?.item).includes("/guides/da-nong-am"));
    }

    const chrome = guideChrome("vi");
    assert.ok(chrome.climateHubLabel.length > 4);
    assert.ok(chrome.breadcrumbHub.length > 2);
  });
});
