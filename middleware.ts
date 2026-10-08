import createMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // `landing` lives outside the [locale] tree. `.well-known` (assetlinks.json)
  // must stay a static 200: no locale rewrite and no redirect.
  matcher: ["/((?!api|_next|_vercel|landing|\\.well-known|.*\\..*).*)"],
};
