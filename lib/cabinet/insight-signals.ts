import type { SkinProfileResponse } from "../types/profile";
import type { ProgressTimelineDTO } from "../types/progress";

export function concernsFromProfile(profile: SkinProfileResponse | null | undefined): string[] {
  if (!profile) return [];
  const out = [...(profile.concerns ?? [])];
  let snap: unknown = profile.onboarding_snapshot;
  if (typeof snap === "string") {
    try {
      snap = JSON.parse(snap) as unknown;
    } catch {
      snap = null;
    }
  }
  if (snap && typeof snap === "object" && !Array.isArray(snap)) {
    const body = (snap as { body_concerns?: unknown }).body_concerns;
    if (Array.isArray(body)) {
      for (const item of body) {
        if (typeof item === "string" && item.trim()) out.push(item);
      }
    }
  }
  return out;
}

export function tagsFromTimeline(data: ProgressTimelineDTO | undefined): string[] {
  const tags: string[] = [];
  for (const entry of (data?.entries ?? []).slice(0, 5)) {
    for (const tag of entry.tags ?? []) tags.push(tag);
    for (const symptom of entry.symptoms ?? []) tags.push(symptom);
  }
  return tags;
}
