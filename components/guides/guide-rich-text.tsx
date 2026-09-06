import type { ReactNode } from "react";

import { Link } from "@/i18n/navigation";

const GUIDE_LINK = /\[([^\]]+)\]\((\/(?:guides\/[a-z0-9-]+|check-in|onboarding))\)/g;

/** Renders catalog markdown links: `/guides/slug`, `/check-in`, `/onboarding`. */
export function GuideRichText({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of text.matchAll(GUIDE_LINK)) {
    const start = match.index ?? 0;
    if (start > last) nodes.push(text.slice(last, start));
    const href = match[2] as "/guides" | `/guides/${string}` | "/check-in" | "/onboarding";
    nodes.push(
      <Link
        key={`${href}-${key++}`}
        href={href}
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        {match[1]}
      </Link>,
    );
    last = start + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  if (nodes.length === 0) return text;
  return <>{nodes}</>;
}
