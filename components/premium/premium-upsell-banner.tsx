"use client";

import { Crown, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Friendly free-plan nudge — playful, not blocking. */
export function PremiumUpsellBanner({
  title,
  body,
  cta,
  ctaHref = "/register",
  className,
  compact,
  primaryCta = true,
}: {
  title: string;
  body: string;
  cta?: string;
  ctaHref?: string;
  className?: string;
  compact?: boolean;
  /** Large primary button (default for quota upsell). */
  primaryCta?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50/90 via-background to-primary/5 p-4 dark:border-amber-500/25 dark:from-amber-950/40",
        compact ? "p-3" : "p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300",
            compact ? "size-9" : "size-10",
          )}
          aria-hidden
        >
          {compact ? <Sparkles className="size-4" /> : <Crown className="size-5" />}
        </span>
        <div className="min-w-0 space-y-1">
          <p className={cn("font-semibold leading-snug", compact ? "text-sm" : "text-base")}>
            {title}
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
          {cta ? (
            <Button
              asChild
              size={primaryCta ? "lg" : "sm"}
              variant={primaryCta ? "default" : "outline"}
              className={primaryCta ? "mt-3 min-h-12 w-full font-semibold sm:w-auto" : "mt-2 min-h-9"}
            >
              <Link href={ctaHref}>{cta}</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Inline quota chip, e.g. "Routine Suggest: 1/3 tháng này". */
export function UsageQuotaChip({ label }: { label: string }) {
  return (
    <p className="inline-flex items-center rounded-full bg-muted/60 px-2.5 py-1 text-xs font-medium text-muted-foreground">
      {label}
    </p>
  );
}
