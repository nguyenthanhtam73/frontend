"use client";

import { useState } from "react";

import { apiBaseUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

/** ProgressPhoto — resilient thumbnail for timeline / before-after cards.
 *
 *  Skin-check uploads are served as backend-relative paths ("/uploads/..."), so
 *  we prefix `apiBaseUrl` for cross-origin dev (frontend :3000 → backend :8080).
 *
 *  Why the loading/error states matter here: historical photos can 404 when the
 *  underlying file is missing on disk (e.g. storage wiped on a redeploy). Without
 *  an `onError` fallback the browser paints its native broken-image icon, which
 *  is exactly the "ảnh ngày cũ bị lỗi" symptom. We degrade gracefully to the same
 *  "—" placeholder used when an entry has no photo at all. */
export function ProgressPhoto({
  url,
  alt,
  className,
}: {
  url: string;
  alt: string;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
        —
      </div>
    );
  }

  return (
    <>
      {!loaded ? (
        <span className="absolute inset-0 animate-pulse bg-muted-foreground/10" aria-hidden />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={absURL(url)}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={cn(
          "size-full object-cover transition-opacity duration-200",
          loaded ? "opacity-100" : "opacity-0",
          className,
        )}
      />
    </>
  );
}

function absURL(u: string): string {
  if (u.startsWith("http")) return u;
  return `${apiBaseUrl}${u}`;
}
