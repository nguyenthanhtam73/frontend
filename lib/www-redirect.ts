import type { NextConfig } from "next";

export const WWW_HOST = "www.dadiary.vn";
export const APEX_ORIGIN = "https://dadiary.vn";

type Redirect = Awaited<ReturnType<NonNullable<NextConfig["redirects"]>>>[number];

/**
 * Permanent redirect from www.dadiary.vn to the apex host.
 * `permanent: true` is Next.js status 308. The host condition is exact, so
 * preview hosts on *.vercel.app are left alone. The destination host is the
 * apex, so a request that already landed there cannot match again.
 * Path params are copied; Next.js appends the original query string.
 */
export function wwwToApexRedirects(): Redirect[] {
  return [
    {
      source: "/:path*",
      has: [{ type: "host", value: WWW_HOST }],
      destination: `${APEX_ORIGIN}/:path*`,
      permanent: true,
    },
  ];
}
