"use client";

import { useEffect } from "react";

/** Last-resort error boundary. This only fires when the ROOT layout itself
 *  throws, so it must render its own <html>/<body> and cannot rely on any
 *  provider (no i18n, no theme). We keep the copy bilingual (VI + EN) and inline
 *  the styles so it works even if the stylesheet failed to load. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error]", error);
  }, [error]);

  return (
    <html lang="vi">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          background: "#fafafa",
          color: "#1f2937",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "420px", textAlign: "center" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 600, margin: "0 0 8px" }}>
            Đã có lỗi xảy ra
          </h1>
          <p style={{ fontSize: "14px", lineHeight: 1.6, margin: "0 0 4px", color: "#4b5563" }}>
            Xin lỗi, có gì đó không ổn. Bạn thử lại nhé.
          </p>
          <p style={{ fontSize: "13px", lineHeight: 1.6, margin: "0 0 20px", color: "#6b7280" }}>
            Something went wrong. Please try again.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              cursor: "pointer",
              border: "none",
              borderRadius: "10px",
              background: "#0f766e",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 600,
              padding: "10px 18px",
            }}
          >
            Thử lại / Try again
          </button>
        </div>
      </body>
    </html>
  );
}
