import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["vi", "en"],
  defaultLocale: "vi",
  localePrefix: "as-needed",
  /**
   * When `true`, middleware uses `NEXT_LOCALE` + `Accept-Language` when the URL has no locale
   * prefix. Browsers often send `en-*` first → after reload Vi users on unprefixed URLs (`/routine`)
   * were resolved to English despite having chosen Vietnamese.
   *
   * With this off: unprefixed paths use `defaultLocale` (vi). English only via `/en/...`.
   */
  localeDetection: false,
});
