import { apiGet } from "@/lib/api-client";
import { fetchSkinProfile } from "@/lib/api/profile";
import { fetchSkinCheck } from "@/lib/api/skin-check";
import {
  resolveRefreshedUploadUrl,
  type SignedPhotoLoaders,
  type SignedPhotoOwner,
} from "@/lib/media/refresh-signed-photo";
import type { ProgressTimelineDTO } from "@/lib/types/progress";

const FRESH_MS = 10_000;

type CacheEntry = {
  at: number;
  promise: Promise<readonly string[]>;
};

const cache = new Map<string, CacheEntry>();

function loadCached(key: string, load: () => Promise<readonly string[]>): Promise<readonly string[]> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < FRESH_MS) return hit.promise;
  const promise = load().catch((err) => {
    cache.delete(key);
    throw err;
  });
  cache.set(key, { at: Date.now(), promise });
  return promise;
}

async function progressUrls(): Promise<readonly string[]> {
  const timeline = await apiGet<ProgressTimelineDTO>("/api/v1/progress?range=all", {
    toastOnError: false,
  });
  const urls: string[] = [];
  for (const entry of timeline?.entries ?? []) {
    for (const url of entry.image_urls ?? []) {
      if (typeof url === "string" && url.trim()) urls.push(url);
    }
  }
  return urls;
}

async function skinCheckUrls(id: string): Promise<readonly string[]> {
  const data = await fetchSkinCheck(id);
  return (data?.image_urls ?? []).filter((url) => typeof url === "string" && url.trim());
}

async function profileUrls(): Promise<readonly string[]> {
  const profile = await fetchSkinProfile();
  return (profile?.photo_urls ?? []).filter((url) => typeof url === "string" && url.trim());
}

function loaders(): SignedPhotoLoaders {
  return {
    progress: () => loadCached("progress", progressUrls),
    skinCheck: (id) => loadCached(`skin-check:${id}`, () => skinCheckUrls(id)),
    profile: () => loadCached("profile", profileUrls),
  };
}

/**
 * Re-query the owning resource once (callers track the per-image attempt)
 * and return a fresh signed URL for the same file, or null.
 */
export async function refetchSignedUploadUrl(
  failedUrl: string,
  owner: SignedPhotoOwner,
  checkId?: string,
): Promise<string | null> {
  try {
    return await resolveRefreshedUploadUrl(failedUrl, owner, loaders(), checkId);
  } catch {
    return null;
  }
}
