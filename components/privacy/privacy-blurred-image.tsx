"use client";

import { useEffect, useState } from "react";

import { blurFaceFromImageUrl } from "@/lib/privacy/face-blur";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
};

/** Renders a face-blurred version of a remote skin-check photo for the UI. */
export function PrivacyBlurredImage({ src, alt, className, loading = "lazy" }: Props) {
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDisplaySrc(null);
    setFailed(false);

    void blurFaceFromImageUrl(src)
      .then((url) => {
        if (!cancelled) setDisplaySrc(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [src]);

  if (failed) {
    return (
      <div
        className={cn("flex items-center justify-center bg-muted text-[10px] text-muted-foreground", className)}
        aria-hidden
      >
        —
      </div>
    );
  }

  if (!displaySrc) {
    return <div className={cn("animate-pulse bg-muted", className)} aria-hidden />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={displaySrc} alt={alt} className={className} loading={loading} />
  );
}
