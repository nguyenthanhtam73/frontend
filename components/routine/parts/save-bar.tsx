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
  | "warning";

/**
 * Sticky save bar — shown only while today’s routine is not yet saved (or during save feedback).
 */
export function SaveBar({
  saving,
  autoSaving,
  canSave,
  hasUnsaved,
  warningHint,
  savedFlash,
  autosaveDirty = false,
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
  /** When true, autosave hint explains only ticks were persisted. */
  autosaveDirty?: boolean;
  onReset: () => void;
  onSave: () => void;
  labels: {
    save: string;
    saving: string;
    reset: string;
    autosaving: string;
    autosavingDirty?: string;
    saved: string;
    unsavedHint: string;
    quotaHint?: string | null;
  };
}) {
  const status = resolveStatus({ saving, autoSaving, hasUnsaved, warningHint, savedFlash });
  const hint = statusHint(status, labels, warningHint);

  return (
    <div
      className={cn(
        "sticky bottom-0 z-20 -mx-4 flex flex-col gap-3 border-t px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:-mx-6 sm:px-6 lg:static lg:z-0 lg:mx-0 lg:flex-row lg:items-center lg:justify-between lg:rounded-xl lg:border lg:bg-card lg:px-4 lg:py-4 lg:pb-4 lg:shadow-none",
        status === "unsaved"
          ? "border-primary/30 bg-background shadow-[0_-6px_28px_-6px_rgba(0,0,0,0.12)]"
          : "border-border/80 bg-background shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.12)]",
        status === "saved" && "border-emerald-500/30 bg-emerald-500/5",
      )}
    >
      <StatusHint
        status={status}
        hint={hint}
        autosaveDirty={autosaveDirty}
        labels={labels}
      />
      {labels.quotaHint ? (
        <p className="text-[11px] leading-snug text-muted-foreground lg:order-first lg:flex-1">
          {labels.quotaHint}
        </p>
      ) : null}

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
          data-testid="routine-save"
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
  autosaveDirty,
  labels,
}: {
  status: SaveBarStatus;
  hint: string;
  autosaveDirty?: boolean;
  labels: { autosaving: string; autosavingDirty?: string; saved: string };
}) {
  if (!hint && status !== "autosaving" && status !== "saved") return null;

  return (
    <p
      className={cn(
        "flex min-h-[1.25rem] items-center text-sm leading-snug transition-colors duration-200",
        status === "autosaving" && "font-medium text-primary",
        status === "manual-saving" && "font-medium text-primary",
        status === "saved" && "font-medium text-emerald-700 dark:text-emerald-300",
        status === "unsaved" && "font-medium text-primary",
        status === "warning" && "text-amber-700 dark:text-amber-300",
      )}
      aria-live="polite"
    >
      {status === "autosaving" ? (
        <span className="inline-flex items-center gap-2">
          <CloudUpload className="size-4 animate-pulse" aria-hidden />
          {autosaveDirty && labels.autosavingDirty
            ? labels.autosavingDirty
            : labels.autosaving}
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
  return "unsaved";
}

function statusHint(
  status: SaveBarStatus,
  labels: { unsavedHint: string },
  warningHint: string | null,
): string {
  if (status === "warning") return warningHint ?? "";
  if (status === "unsaved") return labels.unsavedHint;
  return "";
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
