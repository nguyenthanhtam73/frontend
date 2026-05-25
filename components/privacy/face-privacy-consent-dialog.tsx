"use client";

import { useTranslations } from "next-intl";
import { Eye, ImageOff, ShieldCheck, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef } from "react";

import { Button } from "@/components/ui/button";

/**
 * Transparency notice shown before the user takes/uploads a face photo.
 *
 * Renders only when `open` is true and is fully self-contained — the parent
 * controls visibility via the `open`/`onAccept`/`onDecline`/`onCancel` props.
 *
 * Three distinct outcomes (worth calling out so consumers wire them up
 * correctly):
 *
 * - `onAccept`: user agreed — proceed with the queued capture action and
 *   remember the acknowledgement.
 * - `onDecline`: user EXPLICITLY tapped "I don't want to take a face
 *   photo". This is treated as a deliberate opt-out of face capture and
 *   should switch the flow into tag+notes only mode.
 * - `onCancel`: user dismissed the dialog without committing either way
 *   (close button, backdrop click, Escape). We do NOT treat this as a
 *   privacy opt-out — it just cancels the queued capture. The dialog will
 *   re-appear next time the user attempts to take a photo.
 *
 * Other UX choices: each bullet has an icon so the message scans on a 4"
 * screen; the two CTAs sit at equal visual weight (we never bury the
 * opt-out as a tiny link); focus is trapped inside the dialog and
 * restored on close.
 */
export function FacePrivacyConsentDialog({
  open,
  onAccept,
  onDecline,
  onCancel,
}: {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("privacy");
  const titleId = useId();
  const descId = useId();
  const acceptRef = useRef<HTMLButtonElement>(null);
  const declineRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const handle = window.requestAnimationFrame(() => {
      acceptRef.current?.focus();
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Escape = "I changed my mind" not "I want tag-only mode" — only
        // the explicit decline button represents an opt-out decision.
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key === "Tab") {
        const targets = [acceptRef.current, declineRef.current].filter(Boolean) as HTMLElement[];
        if (!targets.length) return;
        const active = document.activeElement as HTMLElement | null;
        const idx = active ? targets.indexOf(active) : -1;
        e.preventDefault();
        if (e.shiftKey) {
          targets[(idx <= 0 ? targets.length : idx) - 1].focus();
        } else {
          targets[(idx + 1) % targets.length].focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.cancelAnimationFrame(handle);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previouslyFocused.current?.focus?.();
    };
  }, [open, onCancel]);

  const handleBackdrop = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Backdrop click is a soft cancel, not an opt-out — same reasoning
      // as the Escape key handler above.
      if (e.target === e.currentTarget) onCancel();
    },
    [onCancel],
  );

  if (!open) return null;

  return (
    <div
      role="presentation"
      onClick={handleBackdrop}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 px-4 py-4 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200 sm:items-center"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-popover/95 shadow-2xl backdrop-blur supports-backdrop-filter:bg-popover/85 motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:slide-in-from-bottom-4 motion-safe:duration-200"
      >
        <button
          type="button"
          onClick={onCancel}
          aria-label={t("dialogCloseAria")}
          className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" aria-hidden />
        </button>

        <div className="space-y-4 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20"
            >
              <ShieldCheck className="size-5" />
            </span>
            <div className="min-w-0 space-y-1">
              <h2 id={titleId} className="text-base font-semibold tracking-tight">
                {t("dialogTitle")}
              </h2>
              <p id={descId} className="text-xs leading-relaxed text-muted-foreground">
                {t("dialogIntro")}
              </p>
            </div>
          </div>

          <ul className="space-y-2 text-sm leading-relaxed">
            <PromiseRow icon={<Eye className="size-4" aria-hidden />} text={t("dialogBullet1")} />
            <PromiseRow
              icon={<ShieldCheck className="size-4" aria-hidden />}
              text={t("dialogBullet2")}
            />
            <PromiseRow
              icon={<ImageOff className="size-4" aria-hidden />}
              text={t("dialogBullet3")}
            />
            <PromiseRow
              icon={<Trash2 className="size-4" aria-hidden />}
              text={t("dialogBullet4")}
            />
          </ul>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/30 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button
            ref={declineRef}
            type="button"
            variant="outline"
            size="lg"
            onClick={onDecline}
            className="min-h-11 w-full justify-center sm:w-auto"
          >
            {t("dialogDecline")}
          </Button>
          <Button
            ref={acceptRef}
            type="button"
            size="lg"
            onClick={onAccept}
            className="min-h-11 w-full justify-center sm:w-auto"
          >
            {t("dialogAccept")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PromiseRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="leading-relaxed text-foreground">{text}</span>
    </li>
  );
}
