"use client";

import { displayPhotoSrc } from "@/lib/media/display-photo-src";
import { useRecoveredUploadSrc } from "@/lib/media/use-recovered-upload-src";
import type { SignedPhotoOwner } from "@/lib/media/refresh-signed-photo";
import { cn } from "@/lib/utils";

/** Small face photo that refreshes an expired `/uploads` signature once. */
export function UploadFaceThumb({
  url,
  alt,
  className,
  source = "profile",
}: {
  url: string;
  alt: string;
  className?: string;
  source?: SignedPhotoOwner;
}) {
  const { src, failed, onError } = useRecoveredUploadSrc(url, source);

  if (failed) {
    return (
      <span
        className={cn(
          "flex items-center justify-center bg-muted text-xs text-muted-foreground",
          className,
        )}
      >
        —
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={displayPhotoSrc(src)}
      alt={alt}
      className={className}
      onError={onError}
    />
  );
}
