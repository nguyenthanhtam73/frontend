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
 * Mobile: fixed bottom save bar (safe-area inset) so it cannot overlay AM/PM
 * steps or empty-state CTAs. Desktop: in-flow card.
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
      data-testid="routine-save-bar"
      className={cn(
        "z-20 flex min-w-0 flex-col gap-2 border-t bg-background px-4 py-2.5",
        "max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:bg-background/95 max-lg:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-lg:backdrop-blur-md",
        "sm:px-6 lg:static lg:z-0 lg:flex-row lg:items-center lg:justify-between lg:rounded-xl lg:border lg:bg-card lg:px-4 lg:py-4 lg:pb-4 lg:shadow-none",
        status === "unsaved"
          ? "border-primary/30 max-lg:shadow-[0_-6px_28px_-6px_rgba(0,0,0,0.12)]"
          : "border-border/80 max-lg:shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.12)]",
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
        <p className="hidden text-pretty text-xs leading-relaxed text-muted-foreground lg:order-first lg:block lg:flex-1 lg:text-[11px] lg:leading-snug">
          {labels.quotaHint}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-auto min-h-11 whitespace-normal px-2 text-sm leading-tight sm:min-h-9 sm:whitespace-nowrap"
          onClick={onReset}
          disabled={saving || autoSaving}
        >
          <RefreshCw className="size-4 shrink-0" aria-hidden />
          <span className="text-pretty text-center">{labels.reset}</span>
        </Button>
        <Button
          type="button"
          size="default"
          data-testid="routine-save"
          className={cn(
            "h-auto min-h-11 whitespace-normal px-2 text-sm leading-tight transition-all duration-300 sm:min-h-9 sm:whitespace-nowrap",
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
              <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
              <span>{labels.saving}</span>
            </>
          ) : savedFlash ? (
            <>
              <Check className="size-4 shrink-0" aria-hidden />
              <span>{labels.saved}</span>
            </>
          ) : (
            <>
              <Check className="size-4 shrink-0" aria-hidden />
              <span className="text-pretty text-center">{labels.save}</span>
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
      data-testid="routine-save-hint"
      className={cn(
        "flex min-h-[1.25rem] items-start text-pretty text-xs leading-snug break-words [overflow-wrap:anywhere] transition-colors duration-200 sm:items-center sm:text-sm sm:leading-snug",
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
