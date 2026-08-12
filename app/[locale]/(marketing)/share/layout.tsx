import type { ReactNode } from "react";

import { MergedMessagesLayout } from "@/components/i18n/merged-messages-layout";
import { SHARE_MESSAGE_NAMESPACES } from "@/lib/i18n/client-messages";

export default function ShareMessagesLayout({ children }: { children: ReactNode }) {
  return (
    <MergedMessagesLayout namespaces={SHARE_MESSAGE_NAMESPACES}>{children}</MergedMessagesLayout>
  );
}
