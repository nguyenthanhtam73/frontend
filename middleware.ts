import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";

const handleI18n = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  // Screenshot routes stay on `next dev` only. A production server answers 404.
  if (process.env.NODE_ENV === "production" && /^\/(?:en\/)?dev(?:\/|$)/.test(request.nextUrl.pathname)) {
    return new NextResponse("Not found", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8", "x-robots-tag": "noindex" },
    });
  }
  return handleI18n(request);
}

export const config = {
  // `landing` lives outside the [locale] tree. `.well-known` (assetlinks.json)
  // must stay a static 200: no locale rewrite and no redirect.
  matcher: ["/((?!api|_next|_vercel|landing|\\.well-known|.*\\..*).*)"],
};
