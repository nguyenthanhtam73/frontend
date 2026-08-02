/**
 * Client-side PNG export for /share/skin-review/[slug].
 *
 * Canvas size: 1080×1350 (4:5) — Facebook story/feed friendly, mobile-first.
 * Rendered from an off-screen DOM card via html-to-image (no backend render).
 */

import { toBlob } from "html-to-image";

/** Facebook-friendly portrait — 4:5 story / feed. */
export const SHARE_IMAGE_WIDTH = 1080;
export const SHARE_IMAGE_HEIGHT = 1350;

/** Overview length on the share image (keeps card readable). */
export const SHARE_IMAGE_OVERVIEW_MAX = 160;

/** Max attention bullets printed on the image. */
export const SHARE_IMAGE_ATTENTION_MAX = 3;

export async function fetchImageAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url, { mode: "cors", credentials: "omit" });
  if (!res.ok) {
    throw new Error(`image_fetch_${res.status}`);
  }
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") resolve(result);
      else reject(new Error("image_read_failed"));
    };
    reader.onerror = () => reject(new Error("image_read_failed"));
    reader.readAsDataURL(blob);
  });
}

/** Wait until the card photo (if any) has decoded for capture. */
export async function waitForShareCardImages(node: HTMLElement): Promise<void> {
  const imgs = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve, reject) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          const onLoad = () => {
            cleanup();
            resolve();
          };
          const onError = () => {
            cleanup();
            reject(new Error("image_decode_failed"));
          };
          const cleanup = () => {
            img.removeEventListener("load", onLoad);
            img.removeEventListener("error", onError);
          };
          img.addEventListener("load", onLoad);
          img.addEventListener("error", onError);
        }),
    ),
  );
  await document.fonts?.ready?.catch?.(() => undefined);
  await new Promise<void>((r) => requestAnimationFrame(() => r()));
}

export async function renderShareImageBlob(
  node: HTMLElement,
): Promise<Blob> {
  await waitForShareCardImages(node);

  const blob = await toBlob(node, {
    width: SHARE_IMAGE_WIDTH,
    height: SHARE_IMAGE_HEIGHT,
    pixelRatio: 1,
    // Do NOT cacheBust: it appends ?t=… and breaks data: URLs / rewrite paths.
    cacheBust: false,
    // Card uses inline hex — avoid inheriting oklch theme tokens that
    // some html-to-image paths serialize poorly.
    style: {
      opacity: "1",
      transform: "none",
    },
  });
  if (!blob) throw new Error("image_render_empty");
  return blob;
}

export function downloadBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 1500);
}

export function shareImageFilename(slug: string) {
  const safe = slug.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 48) || "review";
  return `dadiary-skin-review-${safe}.png`;
}

export function canNativeShareFiles(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return false;
  }
  if (typeof navigator.canShare !== "function") {
    // Older iOS: try share with files and let caller catch.
    return true;
  }
  try {
    const probe = new File([new Uint8Array([0])], "probe.png", {
      type: "image/png",
    });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

export async function nativeShareImageFile(
  blob: Blob,
  filename: string,
  title: string,
): Promise<"shared" | "aborted" | "unsupported"> {
  if (typeof navigator.share !== "function") return "unsupported";
  const file = new File([blob], filename, { type: "image/png" });
  if (
    typeof navigator.canShare === "function" &&
    !navigator.canShare({ files: [file] })
  ) {
    return "unsupported";
  }
  try {
    await navigator.share({ files: [file], title, text: title });
    return "shared";
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return "aborted";
    }
    throw err;
  }
}
