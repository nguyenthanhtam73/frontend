import type { ReactNode } from "react";

import { MergedMessagesLayout } from "@/components/i18n/merged-messages-layout";
import { PAYMENT_MESSAGE_NAMESPACES } from "@/lib/i18n/client-messages";

export default function PaymentMessagesLayout({ children }: { children: ReactNode }) {
  return (
    <MergedMessagesLayout namespaces={PAYMENT_MESSAGE_NAMESPACES}>{children}</MergedMessagesLayout>
  );
}
