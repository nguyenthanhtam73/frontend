import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { concernsFromProfile, tagsFromTimeline } from "./insight-signals";
import type { ProgressTimelineDTO } from "../types/progress";
import type { SkinProfileResponse } from "../types/profile";

describe("cabinet insight signals", () => {
  it("merges profile concerns with onboarding body concerns", () => {
    const profile = {
      concerns: ["redness"],
      onboarding_snapshot: { body_concerns: ["acne", "  "] },
    } as unknown as SkinProfileResponse;
    assert.deepEqual(concernsFromProfile(profile), ["redness", "acne"]);
    assert.deepEqual(concernsFromProfile(null), []);
  });

  it("parses a string snapshot and keeps the latest five check-ins", () => {
    const profile = {
      concerns: [],
      onboarding_snapshot: JSON.stringify({ body_concerns: ["dryness"] }),
    } as unknown as SkinProfileResponse;
    assert.deepEqual(concernsFromProfile(profile), ["dryness"]);

    const entries = Array.from({ length: 6 }, (_, i) => ({
      id: String(i),
      check_date: "2026-09-01",
      created_at: "2026-09-01T00:00:00Z",
      image_urls: [],
      status: "completed" as const,
      tags: [`tag-${i}`],
      symptoms: i === 0 ? ["stinging"] : [],
    }));
    const tags = tagsFromTimeline({ entries } as unknown as ProgressTimelineDTO);
    assert.deepEqual(tags, ["tag-0", "stinging", "tag-1", "tag-2", "tag-3", "tag-4"]);
  });
});