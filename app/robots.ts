import type { MetadataRoute } from "next";

import { robotsDisallowPaths, siteOrigin } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: robotsDisallowPaths(),
    },
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
