import type { MetadataRoute } from "next";

import { fetchPublicSkinReviewSitemapItems } from "@/lib/api/admin-skin-review";
import { buildShareSitemapEntries, buildSitemapEntries } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries = buildSitemapEntries();
  const shareItems = await fetchPublicSkinReviewSitemapItems();
  const shareEntries = buildShareSitemapEntries(shareItems);
  return [...staticEntries, ...shareEntries];
}
