"use client";

import { useCallback, useLayoutEffect, useRef } from "react";

import { cn } from "@/lib/utils";

/**
 * Textarea that grows with content — long step titles and notes stay fully visible.
 */
export function AutoGrowTextarea({
  value,
  onChange,
  placeholder,
  className,
  minRows = 1,
  allowNewlines = false,
  readOnly = false,
  onLockedAttempt,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minRows?: number;
  allowNewlines?: boolean;
  readOnly?: boolean;
  onLockedAttempt?: () => void;
  id?: string;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const syncHeight = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    el.style.height = "0px";
    const styles = window.getComputedStyle(el);
    const lineHeight = Number.parseFloat(styles.lineHeight) || 20;
    const padding =
      Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom);
    const minHeight = lineHeight * minRows + padding;
    const next = Math.max(el.scrollHeight, minHeight);
    el.style.height = `${next}px`;
  }, [minRows]);

  useLayoutEffect(() => {
    syncHeight();
  }, [value, syncHeight]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => syncHeight());
    observer.observe(el);
    return () => observer.disconnect();
  }, [syncHeight]);

  return (
    <textarea
      ref={ref}
      id={id}
      value={value}
      onChange={(e) => {
        const next = allowNewlines ? e.target.value : e.target.value.replace(/\r?\n/g, " ");
        onChange(next);
        requestAnimationFrame(syncHeight);
      }}
      onKeyDown={(e) => {
        if (!allowNewlines && e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      placeholder={placeholder}
      rows={minRows}
      readOnly={readOnly}
      onFocus={() => {
        syncHeight();
        if (readOnly) onLockedAttempt?.();
      }}
      className={cn(
        "block w-full resize-none overflow-hidden break-words [overflow-wrap:anywhere]",
        allowNewlines && "whitespace-pre-wrap",
        className,
      )}
    />
  );
}
