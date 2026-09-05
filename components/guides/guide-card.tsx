import { ArrowRight } from "lucide-react";

import { Link } from "@/i18n/navigation";
import type { GuideArticle } from "@/lib/guides/catalog";

export function GuideCard({
  article,
  readLabel,
}: {
  article: GuideArticle;
  readLabel: string;
}) {
  return (
    <Link
      href={article.path}
      className="flex h-full flex-col rounded-2xl border border-border/70 bg-card p-5 transition-colors hover:border-primary/35"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
        {article.kicker}
      </p>
      <h3 className="mt-2 text-lg font-semibold leading-snug tracking-tight">{article.title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
        {article.description}
      </p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
        {readLabel}
        <ArrowRight className="size-4" aria-hidden />
      </span>
    </Link>
  );
}
