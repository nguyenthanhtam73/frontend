"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import type { BillingInterval } from "@/lib/premium/pricing";
import { YEARLY_SAVE_PERCENT } from "@/lib/premium/pricing";
import { cn } from "@/lib/utils";

type BillingToggleProps = {
  value: BillingInterval;
  onChange: (next: BillingInterval) => void;
  className?: string;
  /** Stretch to full width on narrow screens (sticky bar). */
  fullWidth?: boolean;
};

/** Segmented Monthly / Yearly control with yearly savings callout. */
export function BillingToggle({
  value,
  onChange,
  className,
  fullWidth = false,
}: BillingToggleProps) {
  const t = useTranslations("pricing.toggle");

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/90 p-1 shadow-sm backdrop-blur-md",
        fullWidth && "flex w-full max-w-md sm:inline-flex sm:w-auto",
        className,
      )}
      role="group"
      aria-label={t("aria")}
    >
      <ToggleButton
        active={value === "monthly"}
        onClick={() => onChange("monthly")}
        label={t("monthly")}
        fullWidth={fullWidth}
        testId="billing-toggle-monthly"
      />
      <ToggleButton
        active={value === "yearly"}
        onClick={() => onChange("yearly")}
        fullWidth={fullWidth}
        testId="billing-toggle-yearly"
        label={
          <span className="inline-flex items-center justify-center gap-1.5">
            {t("yearly")}
            {/* Solid chip: white/dark on active teal, primary ink when idle — avoids washed accent text */}
            <Badge
              variant="outline"
              className={cn(
                "border-transparent px-1.5 py-0 text-[10px] font-bold leading-none",
                value === "yearly"
                  ? "bg-primary-foreground text-primary"
                  : "bg-primary/15 text-primary",
              )}
            >
              {t("saveBadge", { percent: YEARLY_SAVE_PERCENT })}
            </Badge>
          </span>
        }
      />
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  label,
  fullWidth,
  testId,
}: {
  active: boolean;
  onClick: () => void;
  label: ReactNode;
  fullWidth?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-testid={testId}
      className={cn(
        "min-h-11 touch-manipulation rounded-full px-4 text-sm font-semibold transition-[background-color,color,box-shadow,transform] duration-200 ease-out active:scale-[0.98] sm:min-h-10 sm:px-5",
        fullWidth && "flex-1",
        active
          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
