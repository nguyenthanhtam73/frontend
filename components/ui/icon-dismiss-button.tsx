import { forwardRef } from "react";

import { cn } from "@/lib/utils";

/** Icon-only dismiss/close control with a 44×44px touch target (WCAG mobile). */
export const IconDismissButton = forwardRef<
  HTMLButtonElement,
  {
    onClick: () => void;
    ariaLabel: string;
    className?: string;
    children: React.ReactNode;
    "data-testid"?: string;
  }
>(function IconDismissButton(
  { onClick, ariaLabel, className, children, "data-testid": testId },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      data-testid={testId}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {children}
    </button>
  );
});
