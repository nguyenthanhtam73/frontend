"use client";

import { GraduationCap, Sparkle, Zap } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { SkillMode } from "@/lib/stores/onboarding-store";
import { cn } from "@/lib/utils";

export function SkillModeBar({
  value,
  onChange,
  labels,
  hint,
  ariaLabel,
}: {
  value: SkillMode | null;
  onChange: (m: SkillMode) => void;
  labels: { beginner: string; intermediate: string; advanced: string };
  hint: string;
  ariaLabel: string;
}) {
  const options: Array<{ id: SkillMode; label: string; icon: React.ReactNode }> = [
    { id: "beginner", label: labels.beginner, icon: <Sparkle className="size-3.5" aria-hidden /> },
    {
      id: "intermediate",
      label: labels.intermediate,
      icon: <GraduationCap className="size-3.5" aria-hidden />,
    },
    { id: "advanced", label: labels.advanced, icon: <Zap className="size-3.5" aria-hidden /> },
  ];

  return (
    <Card>
      <CardContent className="space-y-3 p-3.5 sm:space-y-0 sm:p-5">
        <div
          role="radiogroup"
          aria-label={ariaLabel}
          className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:pb-0 [&::-webkit-scrollbar]:hidden"
        >
          {options.map((o) => {
            const active = value === o.id;
            return (
              <button
                key={o.id}
                role="radio"
                aria-checked={active}
                type="button"
                onClick={() => onChange(o.id)}
                className={cn(
                  "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all active:scale-[0.98] sm:min-h-9 sm:px-3 sm:py-1.5 sm:text-xs",
                  active
                    ? "border-primary bg-primary/12 text-primary shadow-sm shadow-primary/10"
                    : "border-border text-muted-foreground hover:border-primary/30 hover:bg-muted hover:text-foreground",
                )}
              >
                {o.icon}
                <span>{o.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-xs sm:leading-snug">
          {hint}
        </p>
      </CardContent>
    </Card>
  );
}
