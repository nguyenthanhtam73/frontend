"use client";

import { Crown, Sparkles, X } from "lucide-react";

import { ButtonLink } from "@/components/ui/button-link";
import { cn } from "@/lib/utils";

/** Friendly free-plan nudge — playful, not blocking. */
export function PremiumUpsellBanner({
  title,
  body,
  cta,
  ctaHref = "/pricing",
  className,
  compact,
  primaryCta = true,
  onDismiss,
  dismissLabel = "Dismiss",
}: {
  title: string;
  body: string;
  cta?: string;
  ctaHref?: string;
  className?: string;
  compact?: boolean;
  /** Large primary button (default for quota upsell). */
  primaryCta?: boolean;
  onDismiss?: () => void;
  dismissLabel?: string;
}) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50/90 via-background to-primary/5 p-4 in-animate animate-in fade-in slide-in-from-top-1 duration-200 dark:border-amber-500/25 dark:from-amber-950/40",
        compact ? "p-3" : "p-4 sm:p-5",
        className,
      )}
    >
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="absolute right-2 top-2 inline-flex size-10 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
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
            <ButtonLink
              href={ctaHref}
              size={primaryCta ? "lg" : "sm"}
              variant={primaryCta ? "default" : "outline"}
              className={primaryCta ? "mt-3 min-h-12 w-full font-semibold sm:w-auto" : "mt-2 min-h-9"}
            >
              {cta}
            </ButtonLink>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Inline quota chip, e.g. "Chỉnh tay: 2/5 tháng này". */
export function UsageQuotaChip({
  label,
  variant = "default",
  onClick,
}: {
  label: string;
  variant?: "default" | "warning";
  onClick?: () => void;
}) {
  const className = cn(
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
    variant === "warning"
      ? "bg-amber-500/10 text-amber-900 dark:text-amber-200"
      : "bg-muted/60 text-muted-foreground",
    onClick && "cursor-pointer hover:bg-amber-500/15 active:scale-[0.98]",
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {label}
      </button>
    );
  }

  return <p className={className}>{label}</p>;
}
