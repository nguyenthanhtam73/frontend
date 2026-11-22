"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";

import { commitIntroReset } from "@/lib/api/mascot";

const COPY = {
  vi: {
    button: "Cho chọn lại Bé Da",
    confirm: "Bạn sẽ thấy lại bước chọn Bé Da Nữ/Nam lần tới bấm Bắt đầu.",
    confirmAction: "Đặt lại",
    cancel: "Không",
    success: "Đã đặt lại, bấm Bắt đầu để chọn lại",
    missing: "Chưa đặt lại được lúc này.",
  },
  en: {
    button: "Choose Bé Da again",
    confirm: "You'll see the Female or Male Bé Da step again the next time you tap Start.",
    confirmAction: "Reset",
    cancel: "Not now",
    success: "Reset. Tap Start to choose again.",
    missing: "That couldn't be reset just now.",
  },
} as const;

/**
 * Admin-only control on the Bé Da room. The parent mounts this only when
 * GET /me says is_admin, including inside the Android WebView.
 */
export function BeDaIntroReset() {
  const locale = useLocale();
  const copy = locale.toLowerCase().startsWith("en") ? COPY.en : COPY.vi;
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(id);
  }, [notice]);

  async function confirm() {
    if (busy) return;
    setBusy(true);
    const result = await commitIntroReset(queryClient);
    setBusy(false);
    setOpen(false);
    setNotice({
      text: result === "ok" ? copy.success : copy.missing,
      error: result !== "ok",
    });
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
                onClick={() => setOpen(false)}
              >
                {copy.cancel}
              </button>
              <button
                type="button"
                data-testid="beda-intro-reset-confirm"
                disabled={busy}
                onClick={() => void confirm()}
              >
                {copy.confirmAction}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {notice ? (
        <div
          className={notice.error ? "beda-intro-reset-toast is-error" : "beda-intro-reset-toast"}
          role="status"
          data-testid="beda-intro-reset-toast"
        >
          {notice.text}
        </div>
      ) : null}
    </>
  );
}
