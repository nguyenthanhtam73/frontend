import { getMessages } from "next-intl/server";
import type { ReactNode } from "react";

import { MergeMessagesProvider } from "@/components/i18n/merge-messages-provider";
import {
  SHELL_MESSAGE_NAMESPACES,
  omitMessages,
} from "@/lib/i18n/client-messages";

/**
 * Authenticated / heavy client trees. Merges non-shell namespaces onto the
 * locale shell so HTML does not re-embed common/auth/pwa/….
 */
export default async function AppMessagesLayout({
  children,
}: {
  children: ReactNode;
}) {
  const extras = omitMessages(await getMessages(), SHELL_MESSAGE_NAMESPACES);
  return <MergeMessagesProvider messages={extras}>{children}</MergeMessagesProvider>;
}
