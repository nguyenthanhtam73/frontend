"use client";

import { Moon, Sun } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { StarterRoutineDTO } from "@/lib/types/starter-routine";

function numberedList(lines: string[]) {
  return (
    <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-foreground">
      {lines.map((line, i) => (
        <li key={i}>{line}</li>
      ))}
    </ol>
  );
}

type StarterRoutineCardsProps = {
  starter: StarterRoutineDTO;
  morningLabel: string;
  eveningLabel: string;
  noStepsLabel: string;
};

export function StarterRoutineCards({
  starter,
  morningLabel,
  eveningLabel,
  noStepsLabel,
}: StarterRoutineCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card className="overflow-hidden border-amber-500/25 bg-gradient-to-b from-amber-500/5 to-transparent">
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-center gap-2 font-semibold">
            <Sun className="size-5 text-amber-500" aria-hidden />
            {morningLabel}
          </div>
          {starter.morning.length > 0 ? (
            numberedList(starter.morning)
          ) : (
            <p className="text-sm text-muted-foreground">{noStepsLabel}</p>
          )}
        </CardContent>
      </Card>
      <Card className="overflow-hidden border-indigo-500/25 bg-gradient-to-b from-indigo-500/5 to-transparent">
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-center gap-2 font-semibold">
            <Moon className="size-5 text-indigo-500" aria-hidden />
            {eveningLabel}
          </div>
          {starter.evening.length > 0 ? (
            numberedList(starter.evening)
          ) : (
            <p className="text-sm text-muted-foreground">{noStepsLabel}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
