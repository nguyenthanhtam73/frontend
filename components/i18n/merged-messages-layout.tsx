import { getMessages } from "next-intl/server";
import type { ReactNode } from "react";

import { MergeMessagesProvider } from "@/components/i18n/merge-messages-provider";
import { pickMessages } from "@/lib/i18n/client-messages";

/** Server layout helper: merge the given namespaces onto the locale shell. */
export async function MergedMessagesLayout({
  namespaces,
  children,
}: {
  namespaces: readonly string[];
  children: ReactNode;
}) {
  const extras = pickMessages(await getMessages(), namespaces);
  return <MergeMessagesProvider messages={extras}>{children}</MergeMessagesProvider>;
}
