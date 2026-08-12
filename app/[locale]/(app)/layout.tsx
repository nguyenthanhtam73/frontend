import type { Metadata } from "next";
import type { ReactNode } from "react";

import { MergedMessagesLayout } from "@/components/i18n/merged-messages-layout";
import { APP_CLIENT_MESSAGE_NAMESPACES } from "@/lib/i18n/client-messages";
import { appShellRobots } from "@/lib/seo";

/** Private by default; public app routes (onboarding, feedback) opt back in via page metadata. */
export function generateMetadata(): Metadata {
  return appShellRobots();
}

/**
 * Authenticated / heavy client trees. Picks only app client namespaces so
 * marketing/server catalogs are not re-embedded in HTML.
 */
export default function AppMessagesLayout({ children }: { children: ReactNode }) {
  return (
    <MergedMessagesLayout namespaces={APP_CLIENT_MESSAGE_NAMESPACES}>
      {children}
    </MergedMessagesLayout>
  );
}
