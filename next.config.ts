import path from "node:path";
import { fileURLToPath } from "node:url";

import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

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
};

export default withNextIntl(nextConfig);
