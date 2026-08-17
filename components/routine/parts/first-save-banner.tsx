"use client";

import { Info } from "lucide-react";

/**
 * Shown when the editor has steps but today is not persisted yet — ticks won't
 * autosave until the user saves once.
 */
export function FirstSaveBanner({ message }: { message: string }) {
  return (
    <div
      role="status"
      data-testid="routine-first-save-banner"
      className="flex items-start gap-3 rounded-xl border border-primary/25 bg-primary/[0.06] px-4 py-3 text-sm text-foreground shadow-sm"
    >
      <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <p className="leading-relaxed">{message}</p>
    </div>
  );
}
