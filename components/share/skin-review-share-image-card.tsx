"use client";

import { forwardRef, type CSSProperties, type ReactNode } from "react";

import {
  SHARE_IMAGE_MIN_HEIGHT,
  SHARE_IMAGE_WIDTH,
} from "@/lib/skin-review-share-image";

/**
 * Off-screen DOM card → PNG (1080 wide, height grows with full analysis).
 *
 * Typography is sized for a 1080px asset viewed on phone (~full-bleed feed):
 * body ~28–30px so it stays readable after downscale. Layout mirrors the
 * public web share analysis (5 numbered sections + chips).
 * Inline hex only — html-to-image + oklch theme tokens are unreliable.
 */
export type ShareImageAttentionItem = {
  region: string;
  concern: string;
  severity: string;
  note?: string;
};

export type SkinReviewShareImageCardProps = {
  brandMark: string;
  title: string;
  analysisLabel: string;
  photoSrc: string | null;
  photoAlt: string;
  userQuestionHeading: string;
  userQuestion: string;
  answerHeading: string;
  answer: string;
  overviewHeading: string;
  overview: string;
  skinTypeHeading: string;
  skinTypeLabel: string;
  skinTypeSeverity: string;
  skinTypeNote: string;
  attentionHeading: string;
  attentionItems: ShareImageAttentionItem[];
  additionalHeading: string;
  additional: string;
  photoNotesHeading: string;
  photoNotes: string;
  possibleCausesHeading: string;
  possibleCauses: string[];
  soothingTipsHeading: string;
  soothingTips: string[];
  disclaimer: string;
  domain: string;
};

export const SkinReviewShareImageCard = forwardRef<
  HTMLDivElement,
  SkinReviewShareImageCardProps
>(function SkinReviewShareImageCard(
  {
    brandMark,
    title,
    analysisLabel,
    photoSrc,
    photoAlt,
    userQuestionHeading,
    userQuestion,
    answerHeading,
    answer,
    overviewHeading,
    overview,
    skinTypeHeading,
    skinTypeLabel,
    skinTypeSeverity,
    skinTypeNote,
    attentionHeading,
    attentionItems,
    additionalHeading,
    additional,
    photoNotesHeading,
    photoNotes,
    possibleCausesHeading,
    possibleCauses,
    soothingTipsHeading,
    soothingTips,
    disclaimer,
    domain,
  },
  ref,
) {
  const causes = possibleCauses.map((s) => s.trim()).filter(Boolean).slice(0, 2);
  const tips = soothingTips.map((s) => s.trim()).filter(Boolean).slice(0, 3);
  // Soft caps so a 4k answer does not blow the 1080px feed card.
  // Orphan question (no answer) is incomplete for public PNG — hide it.
  const a = clampShareImageText(answer, 520);
  const q = a ? clampShareImageText(userQuestion, 280) : "";
  const hasQa = Boolean(q || a);
  return (
    <div
      ref={ref}
      data-skin-review-share-image
      style={{
        width: SHARE_IMAGE_WIDTH,
        minHeight: SHARE_IMAGE_MIN_HEIGHT,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        padding: "48px 48px 44px",
        background:
          "linear-gradient(165deg, #EEF7F6 0%, #FFF6FA 48%, #F5F9F8 100%)",
        color: "#1C2E32",
        fontFamily:
          '"Nunito Sans", "Segoe UI", system-ui, -apple-system, sans-serif',
      }}
    >
      {/* 1. Brand — top, not competing with title */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 28,
        }}
      >
        <BrandGlyph size={48} />
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span
            style={{
              fontSize: 30,
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
              lineHeight: 1.2,
            }}
          >
            {brandMark}
          </span>
        </div>
      </header>

      {/* 2. Photo — full frame, sharp (user must recognize their own shot) */}
      <div
        style={{
          position: "relative",
          width: "100%",
          borderRadius: 32,
          overflow: "hidden",
          background: "#D5E6E4",
          flexShrink: 0,
          boxShadow: "0 20px 44px -26px rgba(47, 143, 140, 0.5)",
          minHeight: photoSrc ? undefined : 420,
        }}
      >
        {photoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoSrc}
            alt={photoAlt}
            crossOrigin="anonymous"
            style={{
              display: "block",
              width: "100%",
              height: "auto",
              maxHeight: 1080,
              objectFit: "contain",
              objectPosition: "center",
            }}
          />
        ) : null}
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.88)",
            boxShadow: "0 2px 8px rgba(28,46,50,0.08)",
          }}
        >
          <BrandGlyph size={20} />
          <span style={{ fontSize: 15, fontWeight: 700, color: "#1C2E32" }}>
            Da<span style={{ color: "#2F8F8C" }}>Diary</span>
          </span>
        </div>
      </div>

      {/* 3. White report panel — clear separation from photo */}
      <div
        style={{
          marginTop: 28,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 28,
          padding: "36px 32px 32px",
          borderRadius: 32,
          background: "rgba(255,255,255,0.94)",
          border: "1px solid rgba(47, 143, 140, 0.12)",
          boxShadow: "0 12px 32px -24px rgba(47, 143, 140, 0.35)",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#2F8F8C",
            }}
          >
            {analysisLabel}
          </p>
          <h2
            style={{
              margin: "10px 0 0",
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
            }}
          >
            {title}
          </h2>
        </div>

        {hasQa ? (
          <div
            style={{
              padding: "22px 24px",
              borderRadius: 24,
              background: "rgba(47, 143, 140, 0.07)",
              border: "1px solid rgba(47, 143, 140, 0.2)",
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            {q ? (
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "#5A7176",
                    lineHeight: 1.2,
                  }}
                >
                  {userQuestionHeading}
                </p>
                <p
                  style={{
                    margin: "10px 0 0",
                    fontSize: 26,
                    fontWeight: 500,
                    lineHeight: 1.45,
                    color: "#4A6166",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {q}
                </p>
              </div>
            ) : null}
            {a ? (
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "#2F8F8C",
                    lineHeight: 1.2,
                  }}
                >
                  {answerHeading}
                </p>
                <p
                  style={{
                    margin: "10px 0 0",
                    /* One step above body (28) — bold, high contrast for mobile feed */
                    fontSize: 34,
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.35,
                    color: "#142428",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {a}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {(() => {
          let n = 0;
          const idx = () => {
            n += 1;
            return n;
          };
          return (
            <>
              <Section index={idx()} heading={overviewHeading}>
                <p style={bodyStyle}>{overview || "—"}</p>
              </Section>

              {skinTypeLabel || skinTypeNote ? (
                <Section index={idx()} heading={skinTypeHeading}>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 10,
                    }}
                  >
                    {skinTypeLabel ? <Chip tone="teal">{skinTypeLabel}</Chip> : null}
                    {skinTypeSeverity ? (
                      <Chip tone="blush">{skinTypeSeverity}</Chip>
                    ) : null}
                  </div>
                  {skinTypeNote ? (
                    <p style={{ ...mutedBodyStyle, marginTop: 12 }}>
                      {skinTypeNote}
                    </p>
                  ) : null}
                </Section>
              ) : null}

              {attentionItems.length > 0 ? (
                <Section index={idx()} heading={attentionHeading}>
                  <ul
                    style={{
                      margin: 0,
                      padding: 0,
                      listStyle: "none",
                      display: "flex",
                      flexDirection: "column",
                      gap: 14,
                    }}
                  >
                    {attentionItems.map((item, i) => (
                      <li
                        key={`${item.region}-${item.concern}-${i}`}
                        style={{
                          padding: "16px 18px",
                          borderRadius: 20,
                          background: "rgba(47, 143, 140, 0.05)",
                          border: "1px solid rgba(47, 143, 140, 0.14)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 24,
                              fontWeight: 700,
                              letterSpacing: "-0.015em",
                              color: "#1C2E32",
                              lineHeight: 1.25,
                            }}
                          >
                            {item.region}
                          </span>
                          {item.concern ? (
                            <Chip tone="teal">{item.concern}</Chip>
                          ) : null}
                          {item.severity ? (
                            <Chip tone="muted">{item.severity}</Chip>
                          ) : null}
                        </div>
                        {item.note ? (
                          <p style={{ ...mutedBodyStyle, marginTop: 10 }}>
                            {item.note}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : null}

              {additional ? (
                <Section index={idx()} heading={additionalHeading}>
                  <p style={bodyStyle}>{additional}</p>
                </Section>
              ) : null}

              {photoNotes ? (
                <Section index={idx()} heading={photoNotesHeading}>
                  <p style={bodyStyle}>{photoNotes}</p>
                </Section>
              ) : null}

              {causes.length > 0 ? (
                <Section index={idx()} heading={possibleCausesHeading}>
                  <CompactBullets items={causes} />
                </Section>
              ) : null}

              {tips.length > 0 ? (
                <Section index={idx()} heading={soothingTipsHeading}>
                  <CompactBullets items={tips} />
                </Section>
              ) : null}
            </>
          );
        })()}
      </div>

      {/* 4. Footer — disclaimer then domain CTA */}
      <footer
        style={{
          marginTop: 28,
          paddingTop: 22,
          borderTop: "1px solid rgba(47, 143, 140, 0.2)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 600,
            color: "#5A7176",
            lineHeight: 1.4,
          }}
        >
          {disclaimer}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            color: "#2F8F8C",
          }}
        >
          {domain}
        </p>
      </footer>
    </div>
  );
});

/** Truncate for PNG export only (web share page still shows full text). */
function clampShareImageText(raw: string, maxChars: number): string {
  const text = raw.trim().replace(/\s+/g, " ");
  if (!text) return "";
  const chars = [...text];
  if (chars.length <= maxChars) return text;
  const budget = Math.max(1, maxChars - 1);
  const slice = chars.slice(0, budget).join("");
  const breakAt = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? "),
    slice.lastIndexOf(" "),
  );
  const cut = breakAt > 40 ? slice.slice(0, breakAt) : slice;
  return `${cut.trimEnd()}…`;
}

const bodyStyle: CSSProperties = {
  margin: 0,
  fontSize: 28,
  fontWeight: 500,
  lineHeight: 1.5,
  color: "#24383C",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

const mutedBodyStyle: CSSProperties = {
  ...bodyStyle,
  fontSize: 26,
  color: "#4A6166",
  lineHeight: 1.45,
};

function Section({
  index,
  heading,
  children,
}: {
  index: number;
  heading: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: 999,
            background: "#2F8F8C",
            color: "#fff",
            fontSize: 17,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {index}
        </span>
        <p
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#2F8F8C",
            lineHeight: 1.2,
          }}
        >
          {heading}
        </p>
      </div>
      {children}
    </section>
  );
}

function CompactBullets({ items }: { items: string[] }) {
  return (
    <ul
      style={{
        margin: 0,
        padding: "0 0 0 28px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {items.map((item, i) => (
        <li
          key={`${i}-${item.slice(0, 20)}`}
          style={{
            fontSize: 26,
            fontWeight: 500,
            lineHeight: 1.4,
            color: "#24383C",
            wordBreak: "break-word",
          }}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function Chip({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "teal" | "blush" | "muted";
}) {
  const styles =
    tone === "teal"
      ? { bg: "rgba(47, 143, 140, 0.14)", color: "#1F6F6C" }
      : tone === "blush"
        ? { bg: "rgba(232, 160, 184, 0.3)", color: "#8A4A62" }
        : { bg: "rgba(90, 113, 118, 0.12)", color: "#3D5257" };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "7px 14px",
        borderRadius: 999,
        background: styles.bg,
        color: styles.color,
        fontSize: 20,
        fontWeight: 700,
        lineHeight: 1.2,
      }}
    >
      {children}
    </span>
  );
}

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
