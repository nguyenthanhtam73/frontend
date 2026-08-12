import { getMessages } from "next-intl/server";
import type { ReactNode } from "react";

import { MergeMessagesProvider } from "@/components/i18n/merge-messages-provider";
import {
  HOME_MESSAGE_NAMESPACES,
  pickMessages,
} from "@/lib/i18n/client-messages";

/** Home-only client islands: beta form + skin preview cards. */
export default async function HomeLayout({ children }: { children: ReactNode }) {
  const extras = pickMessages(await getMessages(), HOME_MESSAGE_NAMESPACES);
  return <MergeMessagesProvider messages={extras}>{children}</MergeMessagesProvider>;
}
