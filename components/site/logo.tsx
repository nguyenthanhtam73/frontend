import { useId } from "react";

import { cn } from "@/lib/utils";

/**
 * DaDiary wordmark + glyph. The glyph is an SVG so it scales crisply and matches
 * the brand palette without raster assets.
 *
 * Why `useId()` for the gradient id:
 *   The header and footer both render a Logo, which means the gradient
 *   `<linearGradient id="dd-glyph">` would be duplicated in the document and
 *   browsers only honour the first instance. `useId()` produces a stable but
 *   unique id per Logo instance so each instance references its own gradient.
 */
export function Logo({
  className,
  showWord = true,
}: {
  className?: string;
  showWord?: boolean;
}) {
  const reactId = useId();
  // `useId()` may include `:` characters which are valid in HTML id but not in
  // CSS selectors — strip them so the `url(#...)` reference always resolves.
  const gradientId = `dd-glyph-${reactId.replace(/:/g, "")}`;
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        viewBox="0 0 32 32"
        className="size-8"
        aria-hidden
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient
            id={gradientId}
            x1="0"
            y1="0"
            x2="32"
            y2="32"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="oklch(0.72 0.09 195)" />
            <stop offset="100%" stopColor="oklch(0.82 0.08 330)" />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="30" height="30" rx="9" fill={`url(#${gradientId})`} />
        <path
          d="M11 21V13a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1.5M21 17.5V19a3 3 0 0 1-3 3h-4"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="22" cy="14" r="1.4" fill="white" />
      </svg>
      {showWord ? (
        <span className="text-sm font-medium tracking-tight sm:text-base sm:font-semibold">
          Da<span className="text-primary">Diary</span>
        </span>
      ) : null}
    </span>
  );
}
