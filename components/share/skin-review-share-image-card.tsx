"use client";

import { forwardRef } from "react";

import {
  SHARE_IMAGE_HEIGHT,
  SHARE_IMAGE_WIDTH,
} from "@/lib/skin-review-share-image";

/**
 * Off-screen DOM card captured to PNG (1080×1350 / 4:5).
 * Uses inline hex colors so html-to-image does not depend on oklch theme tokens.
 */
export type SkinReviewShareImageCardProps = {
  title: string;
  overview: string;
  /** Pre-localized lines, e.g. "Má · Mụn" — max ~3 from parent. */
  attentionLines: string[];
  /** Blurred public photo as https URL or data: URL (prefer data: for CORS-safe export). */
  photoSrc: string | null;
  photoAlt: string;
  disclaimer: string;
  domain: string;
  attentionHeading: string;
  brandMark: string;
};

export const SkinReviewShareImageCard = forwardRef<
  HTMLDivElement,
  SkinReviewShareImageCardProps
>(function SkinReviewShareImageCard(
  {
    title,
    overview,
    attentionLines,
    photoSrc,
    photoAlt,
    disclaimer,
    domain,
    attentionHeading,
    brandMark,
  },
  ref,
) {
  return (
    <div
      ref={ref}
      data-skin-review-share-image
      style={{
        width: SHARE_IMAGE_WIDTH,
        height: SHARE_IMAGE_HEIGHT,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        padding: 48,
        background:
          "linear-gradient(165deg, #F3FAF9 0%, #FFF7FB 52%, #F7FAF9 100%)",
        color: "#1C2E32",
        fontFamily:
          '"Nunito Sans", "Segoe UI", system-ui, -apple-system, sans-serif',
        overflow: "hidden",
      }}
    >
      {/* Brand row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 28,
        }}
      >
        <BrandGlyph />
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
          >
            Da<span style={{ color: "#2F8F8C" }}>Diary</span>
          </span>
          <span
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "#5A7176",
              letterSpacing: "0.01em",
            }}
          >
            {brandMark}
          </span>
        </div>
      </div>

      {/* Photo */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: 520,
          borderRadius: 36,
          overflow: "hidden",
          background: "#D9E8E6",
          flexShrink: 0,
          boxShadow: "0 18px 40px -24px rgba(47, 143, 140, 0.45)",
        }}
      >
        {photoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoSrc}
            alt={photoAlt}
            crossOrigin="anonymous"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
              filter: "blur(2.5px)",
              transform: "scale(1.06)",
            }}
          />
        ) : null}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at center, transparent 48%, rgba(28,46,50,0.22) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 18,
            right: 18,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.82)",
            boxShadow: "0 1px 0 rgba(28,46,50,0.06)",
          }}
        >
          <BrandGlyph size={22} />
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              color: "#1C2E32",
            }}
          >
            Da<span style={{ color: "#2F8F8C" }}>Diary</span>
          </span>
        </div>
      </div>

      {/* Title + overview */}
      <div style={{ marginTop: 32, flex: 1, minHeight: 0 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: "-0.025em",
            lineHeight: 1.2,
          }}
        >
          {title}
        </h2>
        <p
          style={{
            margin: "16px 0 0",
            fontSize: 28,
            fontWeight: 500,
            lineHeight: 1.45,
            color: "#24383C",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {overview}
        </p>

        {attentionLines.length > 0 ? (
          <div style={{ marginTop: 22 }}>
            <p
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#2F8F8C",
              }}
            >
              {attentionHeading}
            </p>
            <ul
              style={{
                margin: "12px 0 0",
                padding: 0,
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {attentionLines.map((line) => (
                <li
                  key={line}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    fontSize: 24,
                    fontWeight: 600,
                    lineHeight: 1.35,
                    color: "#31474C",
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 10,
                      height: 10,
                      marginTop: 10,
                      borderRadius: 999,
                      background: "#E8A0B8",
                      flexShrink: 0,
                    }}
                  />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: 24,
          paddingTop: 22,
          borderTop: "1px solid rgba(47, 143, 140, 0.22)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 600,
            color: "#5A7176",
            lineHeight: 1.35,
          }}
        >
          {disclaimer}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            color: "#2F8F8C",
          }}
        >
          {domain}
        </p>
      </div>
    </div>
  );
});

function BrandGlyph({ size = 40 }: { size?: number }) {
  const id = "dd-share-img-grad";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden
      style={{ flexShrink: 0, display: "block" }}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#5BB8B4" />
          <stop offset="100%" stopColor="#E8A0B8" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="9" fill={`url(#${id})`} />
      <path
        d="M11 21V13a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1.5M21 17.5V19a3 3 0 0 1-3 3h-4"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="22" cy="14" r="1.4" fill="white" />
    </svg>
  );
}
