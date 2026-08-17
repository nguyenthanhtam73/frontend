"use client";

import { useId } from "react";

import { ChevronDown, GraduationCap, Sparkle, Zap } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { SkillMode } from "@/lib/stores/onboarding-store";
import { cn } from "@/lib/utils";

const OPTIONS: Array<{
  id: SkillMode;
  icon: typeof Sparkle;
}> = [
  { id: "beginner", icon: Sparkle },
  { id: "intermediate", icon: GraduationCap },
  { id: "advanced", icon: Zap },
];

export function SkillModeBar({
  value,
  onChange,
  labels,
  hint,
  ariaLabel,
  compact = false,
}: {
  value: SkillMode | null;
  onChange: (m: SkillMode) => void;
  labels: { beginner: string; intermediate: string; advanced: string };
  hint: string;
  ariaLabel: string;
  /** Returning users: collapsed by default so AM/PM stays on fold. */
  compact?: boolean;
}) {
  const panelId = useId();
  const active = value ?? "beginner";
  const activeLabel = labels[active];

  const radioGroup = (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden"
    >
      {OPTIONS.map((o) => {
        const Icon = o.icon;
        const isActive = value === o.id;
        return (
          <button
            key={o.id}
            role="radio"
            aria-checked={isActive}
            type="button"
            onClick={() => onChange(o.id)}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all active:scale-[0.98] sm:min-h-9 sm:px-3 sm:py-1.5 sm:text-xs",
              isActive
                ? "border-primary bg-primary/12 text-primary shadow-sm shadow-primary/10"
                : "border-border text-muted-foreground hover:border-primary/30 hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            <span>{labels[o.id]}</span>
          </button>
        );
      })}
    </div>
  );

  if (!compact) {
    return (
      <Card>
        <CardContent className="p-2.5 sm:p-3">
          {radioGroup}
          <p className="mt-1.5 text-xs leading-snug text-muted-foreground">{hint}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <details className="group rounded-xl border border-border/80 bg-card">
      <summary
        className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 sm:px-3.5 [&::-webkit-details-marker]:hidden"
        aria-controls={panelId}
      >
        <span className="text-xs text-muted-foreground">
          {ariaLabel}:{" "}
          <span className="font-semibold text-foreground">{activeLabel}</span>
        </span>
        <ChevronDown
          className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div id={panelId} className="space-y-1.5 border-t border-border/60 px-3 pb-2.5 pt-2 sm:px-3.5">
        {radioGroup}
        <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p>
      </div>
    </details>
  );
}
