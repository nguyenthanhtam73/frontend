"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";

import { commitIntroReset } from "@/lib/api/mascot";

export const INTRO_RESET_CONFIRM_VI = "Bạn sẽ chọn lại Bé Da Nữ/Nam ngay bây giờ.";
export const INTRO_RESET_ERROR_VI = "Chưa đặt lại được, thử lại nhé.";

const COPY = {
  vi: {
    button: "Cho chọn lại Bé Da",
    confirm: INTRO_RESET_CONFIRM_VI,
    confirmAction: "Đặt lại",
    cancel: "Không",
    missing: INTRO_RESET_ERROR_VI,
  },
  en: {
    button: "Choose Bé Da again",
    confirm: "You'll choose Female or Male Bé Da right now.",
    confirmAction: "Reset",
    cancel: "Not now",
    missing: "Couldn't reset. Try again.",
  },
} as const;

/**
 * Admin-only control on the Bé Da room. The parent mounts this only when
 * GET /me says is_admin, including inside the Android WebView.
 */
export function BeDaIntroReset({ onDone }: { onDone?: () => void }) {
  const locale = useLocale();
  const copy = locale.toLowerCase().startsWith("en") ? COPY.en : COPY.vi;
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  async function confirm() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    const result = await commitIntroReset(queryClient);
    if (result === "ok") {
      onDone?.();
      return;
    }
    busyRef.current = false;
    setBusy(false);
    setError(copy.missing);
  }

  return (
    <>
      <button
        type="button"
        className="beda-intro-reset"
        data-testid="beda-intro-reset"
        onClick={() => setOpen(true)}
      >
        {copy.button}
      </button>
      {open ? (
        <div
          className="beda-intro-reset-shade"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="beda-intro-reset-title"
          aria-describedby="beda-intro-reset-body"
          data-testid="beda-intro-reset-dialog"
        >
          <div className="beda-intro-reset-card">
            <h2 id="beda-intro-reset-title">{copy.button}</h2>
            <p id="beda-intro-reset-body">{copy.confirm}</p>
            <div className="beda-intro-reset-actions">
              <button
                type="button"
                data-testid="beda-intro-reset-cancel"
        disabled={busy}
        onClick={() => {
          if (busy) return;
          setOpen(false);
          setError(null);
        }}
      >
        {copy.cancel}
      </button>
      <button
        type="button"
        data-testid="beda-intro-reset-confirm"
        disabled={busy}
        aria-busy={busy}
        onClick={() => void confirm()}
      >
        {copy.confirmAction}
      </button>
    </div>
    {error ? (
      <p className="beda-intro-reset-error" role="alert" data-testid="beda-intro-reset-toast">
        {error}
      </p>
    ) : null}
  </div>
</div>
      ) : null}
    </>
  );
}
