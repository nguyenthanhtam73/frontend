import path from "node:path";
import { fileURLToPath } from "node:url";

import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Avoid picking up an unrelated lockfile higher in ~/Documents when building.
  outputFileTracingRoot: path.join(__dirname),
  experimental: {
    viewTransition: true,
  },
};

export default withNextIntl(nextConfig);
