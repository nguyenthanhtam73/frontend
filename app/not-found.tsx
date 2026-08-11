import Link from "next/link";

/** Root not-found must include its own html/body (root layout is a pass-through). */
export default function RootNotFound() {
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
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 8px" }}>
            Không tìm thấy trang
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, margin: "0 0 4px", color: "#4b5563" }}>
            Trang bạn tìm không tồn tại hoặc đã được chuyển đi.
          </p>
          <p style={{ fontSize: 13, lineHeight: 1.6, margin: "0 0 20px", color: "#6b7280" }}>
            Page not found.
          </p>
          <Link
            href="/"
            style={{
              display: "inline-block",
              borderRadius: 10,
              background: "#0f766e",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              padding: "10px 18px",
              textDecoration: "none",
            }}
          >
            Về trang chủ / Home
          </Link>
        </div>
      </body>
    </html>
  );
}
