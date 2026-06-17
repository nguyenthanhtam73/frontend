import type { PhotoItem } from "@/lib/stores/onboarding-store";

/** URLs that survive sessionStorage reload and blob revocation. */
export function isPersistentPhotoUrl(url: string): boolean {
  const u = url.trim();
  return (
    u.startsWith("http://") ||
    u.startsWith("https://") ||
    u.startsWith("/") ||
    u.startsWith("data:")
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string" && result.startsWith("data:")) {
        resolve(result);
        return;
      }
      reject(new Error("invalid data url"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

/**
 * Prefer server `/uploads/...` paths when available; otherwise embed compressed
 * files as data URLs so review mode works after navigation or blob revoke.
 */
export async function resolveReviewPhotoUrls(
  photos: PhotoItem[],
  serverUrls?: string[],
): Promise<string[]> {
  const fromServer = (serverUrls ?? []).filter((u) => u.trim() !== "");
  if (fromServer.length > 0) {
    return fromServer;
  }

  const out: string[] = [];
  for (const p of photos) {
    if (isPersistentPhotoUrl(p.preview)) {
      out.push(p.preview);
      continue;
    }
    out.push(await fileToDataUrl(p.file));
  }
  return out;
}
