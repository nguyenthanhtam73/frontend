"use client";

import { useLocale } from "next-intl";
import { useLayoutEffect } from "react";

/**
 * Sync `<html lang>` with the active next-intl locale.
 *
 * Root layout intentionally stays locale-agnostic so non-localised routes
 * (404, error boundaries) still produce valid HTML. We use `useLayoutEffect`
 * so the lang attribute updates *before* the browser paints — this means
 * screen readers, IME hints, and font shaping pick up the right language on
 * the very first frame after navigation.
 */
export function LocaleHtmlAttributes() {
  const locale = useLocale();

  useLayoutEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  return null;
}
