"use client";

import { CheckCircle2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconDismissButton } from "@/components/ui/icon-dismiss-button";
import { cn } from "@/lib/utils";

/** Lightweight success/error banner (no toast library dependency). */
export function ToastBanner({
  kind,
  message,
  onDismiss,
  dismissLabel = "Dismiss",
  actionLabel,
  onAction,
  className,
}: {
  kind: "ok" | "err";
  message: string;
  onDismiss?: () => void;
  dismissLabel?: string;
  /** Optional inline action (e.g. Retry on error toasts). */
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <p
      role="status"
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
        kind === "ok"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
          : "border-destructive/30 bg-destructive/10 text-destructive",
        className,
      )}
    >
      {kind === "ok" ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
      ) : (
        <X className="mt-0.5 size-4 shrink-0" aria-hidden />
      )}
      <span className="min-w-0 flex-1 leading-snug">{message}</span>
      {actionLabel && onAction ? (
        <Button
          type="button"
          size="sm"
          variant={kind === "err" ? "outline" : "secondary"}
          onClick={onAction}
          className="shrink-0"
        >
          {actionLabel}
        </Button>
      ) : null}
      {onDismiss ? (
        <IconDismissButton
          ariaLabel={dismissLabel}
          onClick={onDismiss}
          className="shrink-0"
        >
          <X className="size-4" aria-hidden />
        </IconDismissButton>
      ) : null}
    </p>
  );
}
