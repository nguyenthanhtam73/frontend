import type { ReactNode } from "react";

import { MergedMessagesLayout } from "@/components/i18n/merged-messages-layout";
import { HOME_MESSAGE_NAMESPACES } from "@/lib/i18n/client-messages";

/** Home-only client island: beta signup form. */
export default function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <MergedMessagesLayout namespaces={HOME_MESSAGE_NAMESPACES}>{children}</MergedMessagesLayout>
  );
}
