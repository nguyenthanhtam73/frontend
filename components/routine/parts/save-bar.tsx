"use client";

import { Check, CloudUpload, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Sticky save bar.
 *
 * - On mobile (`< lg`): pinned to the bottom edge with safe-area inset so it
 *   never sits under the iOS gesture bar.
 * - On desktop: relaxes into a regular bordered card, so it doesn't compete
 *   visually with the rest of the page.
 *
 * Carries soft validation:
 *   - `canSave === false` disables the button (e.g. no steps at all).
 *   - `warningHint` (if set) shows a small inline note above the buttons —
 *     this is an "FYI" (e.g. AM is missing SPF), not a blocker.
 */
export function SaveBar({
  saving,
  autoSaving,
  canSave,
  hasUnsaved,
  warningHint,
  onReset,
  onSave,
  labels,
}: {
  saving: boolean;
  autoSaving: boolean;
  canSave: boolean;
  hasUnsaved: boolean;
  warningHint: string | null;
  onReset: () => void;
  onSave: () => void;
  labels: {
    save: string;
    saving: string;
    reset: string;
    autosaving: string;
    unsavedHint: string;
    cleanHint: string;
  };
}) {
  const hint = warningHint ?? (hasUnsaved ? labels.unsavedHint : labels.cleanHint);

  return (
    <div className="sticky bottom-0 z-20 -mx-4 flex flex-col gap-3 border-t bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:static lg:z-0 lg:mx-0 lg:flex-row lg:items-center lg:justify-between lg:rounded-xl lg:border lg:bg-card lg:px-4 lg:py-4 lg:pb-4">
      <p
        className={cn(
          "text-xs sm:text-sm",
          warningHint ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground",
        )}
      >
        {autoSaving ? (
          <span className="inline-flex items-center gap-1.5">
            <CloudUpload className="size-3.5 animate-pulse" aria-hidden />
            {labels.autosaving}
          </span>
        ) : (
          hint
        )}
      </p>
      <div className="flex w-full gap-2 sm:w-auto">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-11 flex-1 sm:min-h-9 sm:flex-none"
          onClick={onReset}
          disabled={saving}
        >
          <RefreshCw className="size-4" aria-hidden />
          <span>{labels.reset}</span>
        </Button>
        <Button
          type="button"
          size="default"
          className="min-h-12 flex-2 sm:min-h-9 sm:flex-initial"
          onClick={onSave}
          disabled={saving || !canSave}
          aria-disabled={!canSave}
        >
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              <span>{labels.saving}</span>
            </>
          ) : (
            <>
              <Check className="size-4" aria-hidden />
              <span>{labels.save}</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
