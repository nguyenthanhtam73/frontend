"use client";

import { cva } from "class-variance-authority";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import type { ComponentType } from "react";

import { IconDismissButton } from "@/components/ui/icon-dismiss-button";
import type { ToastPosition, ToastRecord, ToastVariant } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/** Card styling per variant. Kept as literal class strings so Tailwind can see them. */
const toastVariants = cva(
  "pointer-events-auto flex w-full items-start gap-2.5 rounded-xl border bg-background/95 p-3 text-foreground shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80",
  {
    variants: {
      variant: {
        default: "border-border",
        success: "border-emerald-500/40",
        error: "border-destructive/40",
        warning: "border-amber-500/40",
        info: "border-sky-500/40",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

/** Leading icon + its colour per variant (literal classes for Tailwind). */
const ICON: Record<ToastVariant, { Icon: ComponentType<{ className?: string }>; className: string }> = {
  default: { Icon: Info, className: "text-muted-foreground" },
  success: { Icon: CheckCircle2, className: "text-emerald-600 dark:text-emerald-400" },
  error: { Icon: XCircle, className: "text-destructive" },
  warning: { Icon: AlertTriangle, className: "text-amber-600 dark:text-amber-400" },
  info: { Icon: Info, className: "text-sky-600 dark:text-sky-400" },
};

// Full literal animation strings (Tailwind purges anything it can't statically see,
// so we can't build these by interpolation).
const ANIM = {
  topEnter: "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2",
  topExit: "motion-safe:animate-out motion-safe:fade-out motion-safe:slide-out-to-top-2",
  bottomEnter: "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2",
  bottomExit: "motion-safe:animate-out motion-safe:fade-out motion-safe:slide-out-to-bottom-2",
} as const;

export function Toast({
  toast,
  position,
  onClose,
  onPause,
  onResume,
  closeLabel = "Dismiss",
}: {
  toast: ToastRecord;
  position: ToastPosition;
  onClose: () => void;
  onPause?: () => void;
  onResume?: () => void;
  closeLabel?: string;
}) {
  const isTop = position.startsWith("top");
  const anim = toast.exiting
    ? isTop
      ? ANIM.topExit
      : ANIM.bottomExit
    : isTop
      ? ANIM.topEnter
      : ANIM.bottomEnter;
  const { Icon, className: iconClass } = ICON[toast.variant];

  return (
    <div
      role={toast.variant === "error" ? "alert" : "status"}
      aria-live={toast.variant === "error" ? "assertive" : "polite"}
      onMouseEnter={onPause}
      onMouseLeave={onResume}
      onFocus={onPause}
      onBlur={onResume}
      className={cn(toastVariants({ variant: toast.variant }), "motion-safe:duration-200", anim)}
    >
      <Icon className={cn("mt-0.5 size-5 shrink-0", iconClass)} aria-hidden />

      <div className="min-w-0 flex-1 space-y-1.5 py-0.5">
        <div className="space-y-0.5">
          {toast.title ? (
            <p className="text-sm font-semibold leading-snug">{toast.title}</p>
          ) : null}
          {toast.description ? (
            <p className="text-xs leading-relaxed text-muted-foreground">{toast.description}</p>
          ) : null}
        </div>
        {toast.actionLabel && toast.onAction ? (
          <button
            type="button"
            className="text-xs font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => {
              toast.onAction?.();
              onClose();
            }}
          >
            {toast.actionLabel}
          </button>
        ) : null}
      </div>

      <IconDismissButton
        ariaLabel={closeLabel}
        onClick={onClose}
        className="-my-1 -mr-1 size-8 text-muted-foreground hover:text-foreground"
      >
        <X className="size-4" aria-hidden />
      </IconDismissButton>
    </div>
  );
}
