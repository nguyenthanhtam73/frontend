"use client";

import { AlertCircle, CheckCircle2, X } from "lucide-react";

import { IconDismissButton } from "@/components/ui/icon-dismiss-button";
import { cn } from "@/lib/utils";

/**
 * Inline notification banner used by the editor for "saved", "save failed",
 * and load errors. Lives in `parts/` so it can also wrap an AI suggest error
 * card without dragging the editor's stylesheet along.
 */
export function Banner({
  kind,
  message,
  onClose,
  closeLabel = "Close",
}: {
  kind: "ok" | "err";
  message: string;
  onClose: () => void;
  closeLabel?: string;
}) {
  const tone =
    kind === "ok"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
      : "border-destructive/30 bg-destructive/10 text-destructive";
  const Icon = kind === "ok" ? CheckCircle2 : AlertCircle;
  return (
    <div
      role={kind === "err" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm in-animate animate-in fade-in slide-in-from-top-1 duration-200",
        tone,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p className="flex-1 leading-relaxed">{message}</p>
      <IconDismissButton
        onClick={onClose}
        ariaLabel={closeLabel}
        className="text-current hover:opacity-70"
      >
        <X className="size-4" aria-hidden />
      </IconDismissButton>
    </div>
  );
}
