import { isUserUploadUrl, uploadObjectKey } from "@/lib/media/upload-url";

export type SignedPhotoOwner = "progress" | "skin-check" | "profile";

export type UploadPhotoRecovery = "refetch" | "placeholder";

/** One refetch of the owning resource, then the existing "—" placeholder. */
export function planUploadPhotoRecovery(
  url: string,
  alreadyRefetched: boolean,
): UploadPhotoRecovery {
  if (!isUserUploadUrl(url) || alreadyRefetched) return "placeholder";
  return "refetch";
}

/**
 * Pick a replacement for a failed upload. Same object key, different URL
 * (new signature). Identical URL means the file is actually missing.
 */
export function matchRefreshedUploadUrl(
  failedUrl: string,
  candidates: readonly string[] | undefined,
): string | null {
  const key = uploadObjectKey(failedUrl);
  if (!key) return null;
  for (const candidate of candidates ?? []) {
    if (typeof candidate !== "string") continue;
    if (uploadObjectKey(candidate) !== key) continue;
    if (candidate === failedUrl) return null;
    return candidate;
  }
  return null;
}

export type SignedPhotoLoaders = {
  progress: () => Promise<readonly string[]>;
  skinCheck: (id: string) => Promise<readonly string[]>;
  profile: () => Promise<readonly string[]>;
};

/** Refetch exactly one owner, then match a fresh signature for the same file. */
export async function resolveRefreshedUploadUrl(
  failedUrl: string,
  owner: SignedPhotoOwner,
  loaders: SignedPhotoLoaders,
  checkId?: string,
): Promise<string | null> {
  if (!isUserUploadUrl(failedUrl)) return null;
  if (owner === "profile") {
    return matchRefreshedUploadUrl(failedUrl, await loaders.profile());
  }
  if (owner === "skin-check") {
    if (!checkId) return null;
    return matchRefreshedUploadUrl(failedUrl, await loaders.skinCheck(checkId));
  }
  return matchRefreshedUploadUrl(failedUrl, await loaders.progress());
}
