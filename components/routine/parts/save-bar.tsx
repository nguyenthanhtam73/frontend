"use client";

import { Check, CloudUpload, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SaveBarStatus =
  | "autosaving"
  | "manual-saving"
  | "saved"
  | "unsaved"
  | "warning"
  | "clean";

/**
 * Sticky save bar with clear autosave / unsaved / saved feedback.
 */
export function SaveBar({
  saving,
  autoSaving,
  canSave,
  hasUnsaved,
  warningHint,
  savedFlash,
  onReset,
  onSave,
  labels,
}: {
  saving: boolean;
  autoSaving: boolean;
  canSave: boolean;
  hasUnsaved: boolean;
  warningHint: string | null;
  savedFlash?: boolean;
  onReset: () => void;
  onSave: () => void;
  labels: {
    save: string;
    saving: string;
    reset: string;
    autosaving: string;
    saved: string;
    unsavedHint: string;
    cleanHint: string;
  };
}) {
  const status = resolveStatus({ saving, autoSaving, hasUnsaved, warningHint, savedFlash });
  const hint = statusHint(status, labels, warningHint);

  return (
    <div
      className={cn(
        "sticky bottom-0 z-20 -mx-3 flex flex-col gap-3 border-t px-3 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md transition-colors duration-300 sm:-mx-4 sm:px-4 lg:static lg:z-0 lg:mx-0 lg:flex-row lg:items-center lg:justify-between lg:rounded-xl lg:border lg:bg-card lg:px-4 lg:py-4 lg:pb-4 lg:shadow-none",
        status === "unsaved"
          ? "border-primary/30 bg-background/98 shadow-[0_-6px_28px_-6px_rgba(0,0,0,0.12)]"
          : "border-border/80 bg-background/95 shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.12)]",
        status === "saved" && "border-emerald-500/30 bg-emerald-500/5",
      )}
    >
      <StatusHint status={status} hint={hint} labels={labels} />

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)] gap-2 sm:flex sm:w-auto">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-12 text-sm sm:min-h-9"
          onClick={onReset}
          disabled={saving || autoSaving}
        >
          <RefreshCw className="size-4" aria-hidden />
          <span className="truncate">{labels.reset}</span>
        </Button>
        <Button
          type="button"
          size="default"
          className={cn(
            "min-h-12 text-sm transition-all duration-300 sm:min-h-9",
            hasUnsaved &&
              canSave &&
              !saving &&
              !autoSaving &&
              "shadow-md shadow-primary/20 ring-2 ring-primary/30",
            savedFlash && "bg-emerald-600 hover:bg-emerald-600/90",
          )}
          onClick={onSave}
          disabled={saving || autoSaving || !canSave}
          aria-disabled={!canSave}
        >
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              <span>{labels.saving}</span>
            </>
          ) : savedFlash ? (
            <>
              <Check className="size-4" aria-hidden />
              <span>{labels.saved}</span>
            </>
          ) : (
            <>
              <Check className="size-4" aria-hidden />
              <span className="truncate">{labels.save}</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function StatusHint({
  status,
  hint,
  labels,
}: {
  status: SaveBarStatus;
  hint: string;
  labels: { autosaving: string; saved: string };
}) {
  return (
    <p
      className={cn(
        "flex min-h-[1.25rem] items-center text-sm leading-snug transition-colors duration-200",
        status === "autosaving" && "font-medium text-primary",
        status === "manual-saving" && "font-medium text-primary",
        status === "saved" && "font-medium text-emerald-700 dark:text-emerald-300",
        status === "unsaved" && "font-medium text-primary",
        status === "warning" && "text-amber-700 dark:text-amber-300",
        status === "clean" && "text-muted-foreground",
      )}
      aria-live="polite"
    >
      {status === "autosaving" ? (
        <span className="inline-flex items-center gap-2">
          <CloudUpload className="size-4 animate-pulse" aria-hidden />
          {labels.autosaving}
        </span>
      ) : status === "saved" ? (
        <span className="inline-flex items-center gap-2 in-animate animate-in fade-in duration-200">
          <Check className="size-4" aria-hidden />
          {labels.saved}
        </span>
      ) : (
        hint
      )}
    </p>
  );
}

function resolveStatus(opts: {
  saving: boolean;
  autoSaving: boolean;
  hasUnsaved: boolean;
  warningHint: string | null;
  savedFlash?: boolean;
}): SaveBarStatus {
  if (opts.autoSaving) return "autosaving";
  if (opts.saving) return "manual-saving";
  if (opts.savedFlash) return "saved";
  if (opts.hasUnsaved) return "unsaved";
  if (opts.warningHint) return "warning";
  return "clean";
}

function statusHint(
  status: SaveBarStatus,
  labels: { unsavedHint: string; cleanHint: string },
  warningHint: string | null,
): string {
  if (status === "warning") return warningHint ?? labels.cleanHint;
  if (status === "unsaved") return labels.unsavedHint;
  return labels.cleanHint;
}

/** Flash "saved" briefly after each successful save (trigger increments). */
export function useSaveFlash(trigger: number, ms = 2000) {
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (trigger <= 0) return;
    setFlash(true);
    const t = window.setTimeout(() => setFlash(false), ms);
    return () => window.clearTimeout(t);
  }, [trigger, ms]);

  return flash;
}
