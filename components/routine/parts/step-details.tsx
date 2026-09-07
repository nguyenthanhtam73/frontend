"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import type { ResolvedStepDetails } from "@/lib/routine/step-details";
import { cn } from "@/lib/utils";

export type StepDetailLabels = {
  howTo: string;
  dose: string;
  why: string;
  cabinet: string;
  show: string;
  hide: string;
};

/**
 * why + how_to + dose under a routine step. Tick stays on the parent row.
 * Beginner/intermediate: expanded. Advanced: collapsed until opened.
 */
export function StepDetails({
  details,
  labels,
  defaultExpanded,
  testId,
}: {
  details: ResolvedStepDetails;
  labels: StepDetailLabels;
  defaultExpanded: boolean;
  testId?: string;
}) {
  const [open, setOpen] = useState(defaultExpanded);

  return (
    <div className="space-y-1.5" data-testid={testId}>
      {!defaultExpanded ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex min-h-11 items-center gap-1 rounded-lg px-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground sm:min-h-0 sm:py-0.5"
        >
          <ChevronDown
            className={cn("size-3.5 transition-transform", open && "rotate-180")}
            aria-hidden
          />
          {open ? labels.hide : labels.show}
        </button>
      ) : null}

      {open ? (
        <div className="space-y-1.5 rounded-xl bg-muted/40 px-2.5 py-2 sm:rounded-lg">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              data-testid={testId ? `${testId}-dose` : undefined}
              className="inline-flex max-w-full items-center rounded-full border border-border/80 bg-background px-2 py-0.5 text-[11px] font-medium leading-snug text-foreground"
            >
              <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {labels.dose}
              </span>
              {details.dose}
            </span>
            {details.productLabel ? (
              <span
                data-testid={testId ? `${testId}-product` : undefined}
              className="inline-flex min-w-0 max-w-full items-center rounded-full bg-violet-500/10 px-2 py-0.5 text-[11px] leading-snug text-violet-900 dark:text-violet-100"
              >
                <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-violet-700/80 dark:text-violet-200/80">
                  {labels.cabinet}
                </span>
                <span className="truncate">{details.productLabel}</span>
              </span>
            ) : null}
          </div>
          <p
            data-testid={testId ? `${testId}-why` : undefined}
            className="w-full text-pretty text-sm leading-relaxed text-foreground/90 break-words [overflow-wrap:anywhere] sm:text-xs"
          >
            <span className="font-semibold text-foreground/80">{labels.why}: </span>
            {details.why}
          </p>
          <p
            data-testid={testId ? `${testId}-howto` : undefined}
            className="w-full text-pretty text-sm leading-relaxed text-muted-foreground break-words [overflow-wrap:anywhere] sm:text-xs"
          >
            <span className="sr-only">{labels.howTo}: </span>
            {details.how_to}
          </p>
        </div>
      ) : null}
    </div>
  );
}
