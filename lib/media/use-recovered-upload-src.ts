"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { refetchSignedUploadUrl } from "@/lib/media/refetch-signed-photo";
import {
  planUploadPhotoRecovery,
  type SignedPhotoOwner,
} from "@/lib/media/refresh-signed-photo";

/**
 * When an `/uploads/` image 404s (expired `exp`/`sig`, or a page left open),
 * refetch the owning progress entry, skin check, or profile once and swap in
 * the new URL. A second failure falls through to the "—" placeholder.
 */
export function useRecoveredUploadSrc(
  url: string,
  source: SignedPhotoOwner,
  checkId?: string,
) {
  const [src, setSrc] = useState(url);
  const [failed, setFailed] = useState(false);
  const triedRef = useRef(false);
  const genRef = useRef(0);

  useEffect(() => {
    genRef.current += 1;
    triedRef.current = false;
    setSrc(url);
    setFailed(false);
  }, [url]);

  const onError = useCallback(() => {
    const decision = planUploadPhotoRecovery(src, triedRef.current);
    if (decision === "placeholder") {
      setFailed(true);
      return;
    }
    triedRef.current = true;
    const ticket = genRef.current;
    const failedUrl = src;
    void refetchSignedUploadUrl(failedUrl, source, checkId)
      .then((fresh) => {
        if (ticket !== genRef.current) return;
        if (fresh) {
          setSrc(fresh);
          setFailed(false);
          return;
        }
        setFailed(true);
      })
      .catch(() => {
        if (ticket !== genRef.current) return;
        setFailed(true);
      });
  }, [checkId, source, src]);

  return { src, failed, onError };
}
