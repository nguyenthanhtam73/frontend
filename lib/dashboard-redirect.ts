import type { NextConfig } from "next";

type Redirect = Awaited<ReturnType<NonNullable<NextConfig["redirects"]>>>[number];

/**
 * There is no dashboard screen. After login the app home is check-in
 * (`postLoginDestination` sends a finished user to `/check-in`).
 * `permanent: true` is a 308, so `/dashboard` and `/en/dashboard` never 404.
 */
export function dashboardToCheckInRedirects(): Redirect[] {
  return [
    {
      source: "/dashboard",
      destination: "/check-in",
      permanent: true,
    },
    {
      source: "/en/dashboard",
      destination: "/en/check-in",
      permanent: true,
    },
  ];
}
