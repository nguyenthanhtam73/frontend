"use client";

import { useId, type ReactNode } from "react";

import { ChevronDown } from "lucide-react";

/**
 * Collapsible extras (check-in + AI) so the AM/PM tick editor stays above the fold.
 */
export function RoutineToolsFold({
  title,
  hint,
  defaultOpen,
  children,
}: {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const panelId = useId();

  return (
    <details
      className="group rounded-xl border border-border/80 bg-card"
      open={defaultOpen ? true : undefined}
    >
      <summary
        className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-2.5 sm:px-4 [&::-webkit-details-marker]:hidden"
        aria-controls={panelId}
        aria-expanded={defaultOpen ? true : undefined}
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold leading-tight">{title}</span>
          {hint ? (
            <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
              {hint}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div
        id={panelId}
        role="region"
        aria-label={title}
        className="space-y-3 border-t border-border/60 px-3 py-3 sm:px-4 sm:py-4"
      >
        {children}
      </div>
    </details>
  );
}
