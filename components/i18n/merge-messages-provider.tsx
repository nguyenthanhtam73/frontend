"use client";

import {
  NextIntlClientProvider,
  useLocale,
  useMessages,
  type AbstractIntlMessages,
} from "next-intl";
import { useMemo, type ReactNode } from "react";

/**
 * Nested provider that shallow-merges `messages` onto the parent catalog.
 * next-intl treats `messages` as atomic (replace); this avoids re-shipping
 * shell namespaces already provided by `[locale]/layout`.
 */
export function MergeMessagesProvider({
  messages: extra,
  children,
}: {
  messages: AbstractIntlMessages;
  children: ReactNode;
}) {
  const locale = useLocale();
  const parent = useMessages();
  const messages = useMemo(
    () => ({ ...parent, ...extra }),
    [parent, extra],
  );

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
