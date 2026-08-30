import type { Metadata } from "next";
import type { ReactNode } from "react";

import { MergedMessagesLayout } from "@/components/i18n/merged-messages-layout";
import { SHARE_MESSAGE_NAMESPACES } from "@/lib/i18n/client-messages";

/** UGC share pages stay crawlable (follow) but must not be advertised to the index. */
export function generateMetadata(): Metadata {
  return {
    robots: {
      index: false,
      follow: true,
      googleBot: { index: false, follow: true },
    },
  };
}

export default function ShareMessagesLayout({ children }: { children: ReactNode }) {
  return (
    <MergedMessagesLayout namespaces={SHARE_MESSAGE_NAMESPACES}>{children}</MergedMessagesLayout>
  );
}
