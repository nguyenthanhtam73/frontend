"use client";

import { useEffect, useRef, useState } from "react";

import { blurFaceFromImageUrl } from "@/lib/privacy/face-blur";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
};

/**
 * Renders a face-blurred skin-check photo. Blur runs only when the element
 * enters the viewport to avoid blocking the progress grid on mount.
 */
export function PrivacyBlurredImage({ src, alt, className, loading = "lazy" }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(loading === "eager");
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (inView || loading === "eager") return;
    const node = rootRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [inView, loading]);

  useEffect(() => {
    if (!inView) return;
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
  }, [src, inView]);

  if (failed) {
    return (
      <div ref={rootRef} className={cn("overflow-hidden", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="size-full object-cover" loading={loading} />
      </div>
    );
  }

  if (!displaySrc) {
    return (
      <div
        ref={rootRef}
        className={cn("animate-pulse bg-muted", className)}
        role="status"
        aria-label={alt}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={displaySrc} alt={alt} className={className} loading={loading} />
  );
}
