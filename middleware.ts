import createMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // `landing` is a self-contained Vietnamese marketing page that lives outside
  // the [locale] tree, so it must bypass the i18n middleware rewrite.
  matcher: ["/((?!api|_next|_vercel|landing|.*\\..*).*)"],
};
