"use client";

import { Card, CardContent } from "@/components/ui/card";

/**
 * Free-form notes for the day — used in Normal / Intermediate / Advanced
 * modes. Beginner mode hides this entirely; the AI suggest's "encouragement"
 * + "week notes" usually carry that role.
 */
export function NotesCard({
  value,
  onChange,
  labels,
}: {
  value: string;
  onChange: (next: string) => void;
  labels: { title: string; placeholder: string };
}) {
  return (
    <Card>
      <CardContent className="space-y-2 p-4 sm:p-6">
        <label
          htmlFor="routine-notes"
          className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
        >
          {labels.title}
        </label>
        <textarea
          id="routine-notes"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={labels.placeholder}
          rows={3}
          className="min-h-22 w-full resize-none rounded-xl border bg-background px-3 py-2.5 text-base outline-none ring-ring/40 transition focus:border-primary focus:ring-2 sm:text-sm"
        />
      </CardContent>
    </Card>
  );
}
