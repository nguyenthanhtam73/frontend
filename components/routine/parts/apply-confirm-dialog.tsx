"use client";

import { useRef } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { cn } from "@/lib/utils";

/** Lightweight confirm dialog — used before overwriting routine editor content. */
export function ApplyConfirmDialog({
  open,
  title,
  body,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  body: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  // Start on Cancel: confirming overwrites the editor, so Enter must not do it by accident.
  const cancelRef = useRef<HTMLButtonElement>(null);
  useFocusTrap(dialogRef, open, { initialFocus: cancelRef, onEscape: onCancel });

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center">
      <button
        type="button"
        tabIndex={-1}
        aria-label={cancelLabel}
        className="absolute inset-0 bg-black/50 in-animate animate-in fade-in duration-200"
        onClick={onCancel}
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="apply-confirm-title"
        aria-describedby="apply-confirm-body"
        className="relative w-full max-w-md space-y-4 rounded-2xl border bg-background p-4 shadow-2xl outline-none in-animate animate-in slide-in-from-bottom-4 fade-in duration-200 sm:rounded-2xl"
      >
        <div className="space-y-2">
          <p id="apply-confirm-title" className="text-base font-semibold leading-snug">
            {title}
          </p>
          <p id="apply-confirm-body" className="text-sm leading-relaxed text-muted-foreground">
            {body}
          </p>
        </div>
        <div className={cn("grid grid-cols-1 gap-2 sm:grid-cols-2")}>
          <Button ref={cancelRef} type="button" variant="outline" className="min-h-11" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button type="button" className="min-h-11" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
