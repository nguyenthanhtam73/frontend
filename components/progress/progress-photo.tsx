"use client";

import { useEffect, useState } from "react";

import { displayPhotoSrc } from "@/lib/media/display-photo-src";
import { useRecoveredUploadSrc } from "@/lib/media/use-recovered-upload-src";
import type { SignedPhotoOwner } from "@/lib/media/refresh-signed-photo";
import { cn } from "@/lib/utils";

/** ProgressPhoto — resilient thumbnail for timeline / before-after cards.
 *
 *  User photos are `/uploads/...` (optionally `?exp&sig`). Same-origin rewrite
 *  serves them. When a signed link 404s, we refetch the owning progress list,
 *  skin check, or profile once, then fall back to the "—" placeholder. */
export function ProgressPhoto({
  url,
  alt,
  className,
  source,
  checkId,
}: {
  url: string;
  alt: string;
  className?: string;
  /** Owning API to re-query once after an `/uploads/` image fails. */
  source?: SignedPhotoOwner;
  /** Required when `source` is `skin-check`. */
  checkId?: string;
}) {
  const owner: SignedPhotoOwner = source ?? (checkId ? "skin-check" : "progress");
  const { src, failed, onError } = useRecoveredUploadSrc(url, owner, checkId);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

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
        src={displayPhotoSrc(src)}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={onError}
        className={cn(
          "size-full object-cover transition-opacity duration-200",
          loaded ? "opacity-100" : "opacity-0",
          className,
        )}
      />
    </>
  );
}
