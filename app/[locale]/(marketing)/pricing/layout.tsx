import { getMessages } from "next-intl/server";
import type { ReactNode } from "react";

import { MergeMessagesProvider } from "@/components/i18n/merge-messages-provider";
import {
  PRICING_MESSAGE_NAMESPACES,
  pickMessages,
} from "@/lib/i18n/client-messages";

export default async function PricingMessagesLayout({
  children,
}: {
  children: ReactNode;
}) {
  const extras = pickMessages(await getMessages(), PRICING_MESSAGE_NAMESPACES);
  return <MergeMessagesProvider messages={extras}>{children}</MergeMessagesProvider>;
}
