import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Lightweight Avatar (no Radix) — accepts a name and renders deterministic
 * initials with a hue based on the string for visual variety.
 */
function hashHue(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 360;
}

export interface AvatarProps extends React.ComponentProps<"div"> {
  name: string;
  size?: "sm" | "md" | "lg";
}

export function Avatar({
  name,
  size = "md",
  className,
  ...props
}: AvatarProps) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const hue = hashHue(name);
  const sizes: Record<NonNullable<AvatarProps["size"]>, string> = {
    sm: "size-7 text-[11px]",
    md: "size-9 text-sm",
    lg: "size-12 text-base",
  };

  return (
    <div
      role="img"
      aria-label={name}
      className={cn(
        "relative inline-flex items-center justify-center overflow-hidden rounded-full font-medium text-white shadow-sm ring-1 ring-black/5",
        sizes[size],
        className,
      )}
      style={{
        background: `linear-gradient(135deg, oklch(0.62 0.16 ${hue}) 0%, oklch(0.45 0.18 ${(hue + 40) % 360}) 100%)`,
      }}
      {...props}
    >
      {initials || "?"}
    </div>
  );
}
