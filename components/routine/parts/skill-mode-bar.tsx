"use client";

import { GraduationCap, Sparkle, Zap } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { SkillMode } from "@/lib/stores/onboarding-store";
import { cn } from "@/lib/utils";

/**
 * Skill mode picker. Three opinionated buttons (Beginner / Intermediate /
 * Advanced) with a one-line context hint that switches based on which mode is
 * active. The icons reinforce the depth — beginners see a sparkle (lighter),
 * advanced sees lightning (more energy).
 */
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
  /** Translated aria-label for the radiogroup of skill modes. */
  ariaLabel: string;
}) {
  const options: Array<{ id: SkillMode; label: string; icon: React.ReactNode }> = [
    { id: "beginner", label: labels.beginner, icon: <Sparkle className="size-3" aria-hidden /> },
    {
      id: "intermediate",
      label: labels.intermediate,
      icon: <GraduationCap className="size-3" aria-hidden />,
    },
    { id: "advanced", label: labels.advanced, icon: <Zap className="size-3" aria-hidden /> },
  ];
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
        <div
          role="radiogroup"
          aria-label={ariaLabel}
          className="flex flex-wrap gap-1.5"
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
                  "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
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
        <p className="text-xs leading-snug text-muted-foreground sm:ml-2">{hint}</p>
      </CardContent>
    </Card>
  );
}
