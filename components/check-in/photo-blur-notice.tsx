"use client";

import { Button } from "@/components/ui/button";

/** Soft warning shown after a check-in photo looks blurry. Does not block sending. */
export function PhotoBlurNotice({
  slot,
  message,
  retakeLabel,
  sendAnywayLabel,
  onRetake,
  onSendAnyway,
}: {
  slot: 0 | 1;
  message: string;
  retakeLabel: string;
  sendAnywayLabel: string;
  onRetake: () => void;
  onSendAnyway: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="checkin-photo-blur-warning"
      data-slot={slot}
      className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5"
    >
      <p className="text-sm leading-relaxed text-foreground">{message}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button
          type="button"
          data-testid="checkin-photo-blur-retake"
          className="min-h-11 whitespace-normal text-center text-xs"
          onClick={onRetake}
        >
          {retakeLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          data-testid="checkin-photo-blur-send"
          className="min-h-11 whitespace-normal text-center text-xs"
          onClick={onSendAnyway}
        >
          {sendAnywayLabel}
        </Button>
      </div>
    </div>
  );
}
