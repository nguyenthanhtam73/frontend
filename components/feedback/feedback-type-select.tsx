"use client";

import {
  Bug,
  Check,
  ChevronDown,
  Lightbulb,
  MessageCircle,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import type { FeedbackType } from "@/lib/types/feedback";
import { FEEDBACK_TYPES } from "@/lib/types/feedback";

const TYPE_META: Record<
  FeedbackType,
  { icon: LucideIcon; iconClass: string; bgClass: string }
> = {
  ai_feedback: {
    icon: Sparkles,
    iconClass: "text-primary",
    bgClass: "bg-primary/10",
  },
  bug_report: {
    icon: Bug,
    iconClass: "text-destructive",
    bgClass: "bg-destructive/10",
  },
  feature_request: {
    icon: Lightbulb,
    iconClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-500/10",
  },
  general: {
    icon: MessageCircle,
    iconClass: "text-muted-foreground",
    bgClass: "bg-muted",
  },
};

type FeedbackTypeSelectProps = {
  id?: string;
  value: FeedbackType;
  onChange: (value: FeedbackType) => void;
  label: (key: FeedbackType) => string;
  ariaLabel: string;
  describedBy?: string;
  disabled?: boolean;
};

export function FeedbackTypeSelect({
  id,
  value,
  onChange,
  label,
  ariaLabel,
  describedBy,
  disabled = false,
}: FeedbackTypeSelectProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState<FeedbackType>(value);

  const selectedMeta = TYPE_META[value];
  const SelectedIcon = selectedMeta.icon;

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }

      if (!open) return;

      const index = FEEDBACK_TYPES.indexOf(highlighted);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = FEEDBACK_TYPES[(index + 1) % FEEDBACK_TYPES.length];
        setHighlighted(next);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const next = FEEDBACK_TYPES[(index - 1 + FEEDBACK_TYPES.length) % FEEDBACK_TYPES.length];
        setHighlighted(next);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onChange(highlighted);
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, highlighted, onChange]);

  useEffect(() => {
    if (open) setHighlighted(value);
  }, [open, value]);

  function selectType(next: FeedbackType) {
    onChange(next);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-describedby={describedBy}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex w-full min-h-11 items-center gap-3 rounded-xl border border-input bg-background px-3 py-2.5 text-left text-sm shadow-xs outline-none transition-all",
          "hover:border-primary/30 hover:bg-muted/30",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "disabled:pointer-events-none disabled:opacity-60",
          open && "border-primary/40 bg-muted/20 ring-[3px] ring-ring/30",
        )}
      >
        <span
          className={cn(
            "inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
            selectedMeta.bgClass,
          )}
        >
          <SelectedIcon className={cn("size-4", selectedMeta.iconClass)} aria-hidden />
        </span>
        <span className="min-w-0 flex-1 font-medium">{label(value)}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180 text-foreground",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className={cn(
            "absolute top-[calc(100%+0.375rem)] z-50 w-full overflow-hidden rounded-xl border border-border/80 bg-popover p-1.5 shadow-lg",
            "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-200",
          )}
        >
          {FEEDBACK_TYPES.map((key) => {
            const meta = TYPE_META[key];
            const Icon = meta.icon;
            const isSelected = value === key;
            const isHighlighted = highlighted === key;

            return (
              <li key={key} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlighted(key)}
                  onClick={() => selectType(key)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left text-sm transition-colors",
                    isHighlighted && "bg-muted/80",
                    isSelected && "bg-primary/5",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
                      meta.bgClass,
                    )}
                  >
                    <Icon className={cn("size-4", meta.iconClass)} aria-hidden />
                  </span>
                  <span className={cn("min-w-0 flex-1", isSelected && "font-medium")}>
                    {label(key)}
                  </span>
                  {isSelected ? (
                    <Check className="size-4 shrink-0 text-primary" aria-hidden />
                  ) : (
                    <span className="size-4 shrink-0" aria-hidden />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
