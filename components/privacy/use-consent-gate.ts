"use client";

import { useCallback, useRef, useState } from "react";

import { usePrivacyStore } from "@/lib/stores/privacy-store";

/**
 * Drives the FacePrivacyConsentDialog from the photo-action buttons (camera /
 * library). Returns:
 *
 * - `requestCapture(action)` — the function to call from "take photo" / "from
 *   library" handlers. If the user has already acknowledged the privacy
 *   notice we run `action` immediately. Otherwise we queue it and open the
 *   dialog; the dialog's accept handler runs the queued action.
 * - `dialogProps` — props you can spread onto `<FacePrivacyConsentDialog />`.
 *
 * Decoupling the gate from the dialog markup keeps the consumer flexible: a
 * page may render a single dialog at the top level and feed it from many
 * action handlers (camera, rear camera, library) — only one queue is in
 * flight at a time.
 */
export function useConsentGate() {
  const consentAcknowledged = usePrivacyStore((s) => s.consentAcknowledged);
  const acknowledgeConsent = usePrivacyStore((s) => s.acknowledgeConsent);
  const setSkipFaceCapture = usePrivacyStore((s) => s.setSkipFaceCapture);

  const [open, setOpen] = useState(false);
  const pendingAction = useRef<(() => void) | null>(null);

  const requestCapture = useCallback(
    (action: () => void) => {
      if (consentAcknowledged) {
        action();
        return;
      }
      pendingAction.current = action;
      setOpen(true);
    },
    [consentAcknowledged],
  );

  const onAccept = useCallback(() => {
    acknowledgeConsent();
    setOpen(false);
    const action = pendingAction.current;
    pendingAction.current = null;
    // Defer to next tick so the dialog actually unmounts before the file
    // picker / camera intent fires (Safari needs a clear gesture chain).
    if (action) window.setTimeout(action, 0);
  }, [acknowledgeConsent]);

  /** Explicit opt-out via the "I don't want to take a face photo" button —
   *  flips the persistent privacy preference into tag+notes only mode. */
  const onDecline = useCallback(() => {
    pendingAction.current = null;
    setOpen(false);
    setSkipFaceCapture(true);
  }, [setSkipFaceCapture]);

  /** Soft cancel via X / backdrop / Escape — does NOT change preferences. */
  const onCancel = useCallback(() => {
    pendingAction.current = null;
    setOpen(false);
  }, []);

  // Lets a page open the notice manually (e.g. from a "Re-read privacy" link)
  // without queueing any follow-up action.
  const openManually = useCallback(() => {
    pendingAction.current = null;
    setOpen(true);
  }, []);

  return {
    requestCapture,
    openManually,
    dialogProps: { open, onAccept, onDecline, onCancel },
  } as const;
}
