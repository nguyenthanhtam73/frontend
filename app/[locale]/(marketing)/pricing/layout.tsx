import type { ReactNode } from "react";

import { MergedMessagesLayout } from "@/components/i18n/merged-messages-layout";
import { PRICING_MESSAGE_NAMESPACES } from "@/lib/i18n/client-messages";

export default function PricingMessagesLayout({ children }: { children: ReactNode }) {
  return (
    <MergedMessagesLayout namespaces={PRICING_MESSAGE_NAMESPACES}>{children}</MergedMessagesLayout>
  );
}
