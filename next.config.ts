import path from "node:path";
import { fileURLToPath } from "node:url";

import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

import { wwwToApexRedirects } from "./lib/www-redirect";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const apiOrigin =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "https://api.dadiary.vn";

const nextConfig: NextConfig = {
  // Avoid picking up an unrelated lockfile higher in ~/Documents when building.
  outputFileTracingRoot: path.join(__dirname),
  experimental: {
    viewTransition: true,
  },
  // Same-origin /uploads/* → API. Lets canvas/html-to-image read photos without
  // depending on cross-origin CORS (api.dadiary.vn ↔ dadiary.vn).
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: `${apiOrigin}/uploads/:path*`,
      },
    ];
  },
  // 308 only when the Host is www.dadiary.vn. Preview *.vercel.app hosts miss
  // the condition, and the destination is the apex so the rule cannot loop.
  // Next.js forwards the query string when the destination does not set one.
  async redirects() {
    return wwwToApexRedirects();
  },
};

export default withNextIntl(nextConfig);
