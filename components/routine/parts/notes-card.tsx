"use client";

import { Card, CardContent } from "@/components/ui/card";

import { AutoGrowTextarea } from "./auto-grow-textarea";

/**
 * Free-form notes for the day — used in Normal / Intermediate / Advanced
 * modes. Beginner mode hides this entirely; the AI suggest's "encouragement"
 * + "week notes" usually carry that role.
 */
export function NotesCard({
  value,
  onChange,
  labels,
  readOnly = false,
  onLockedAttempt,
}: {
  value: string;
  onChange: (next: string) => void;
  labels: { title: string; placeholder: string };
  readOnly?: boolean;
  onLockedAttempt?: () => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-2 p-3.5 sm:p-6">
        <label
          htmlFor="routine-notes"
          className="text-xs font-medium uppercase tracking-wider text-muted-foreground sm:text-xs"
        >
          {labels.title}
        </label>
        <AutoGrowTextarea
          id="routine-notes"
          value={value}
          onChange={onChange}
          placeholder={labels.placeholder}
          minRows={3}
          allowNewlines
          readOnly={readOnly}
          onLockedAttempt={onLockedAttempt}
          className="min-h-24 rounded-xl border bg-background px-3 py-3 text-base outline-none ring-ring/40 transition focus:border-primary focus:ring-2 sm:min-h-22 sm:py-2.5 sm:text-sm read-only:cursor-default read-only:bg-muted/30"
        />
      </CardContent>
    </Card>
  );
}
