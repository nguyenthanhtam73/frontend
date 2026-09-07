import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ApiError } from "@/lib/api-client";
import type { ProgressEntryDTO } from "@/lib/types/progress";
import type { CreateSkinCheckResponseDTO } from "@/lib/types/skin-check";

import {
  applySkinCheckToProgressEntry,
  canShowReanalyzeCta,
  classifyReanalyzeError,
  clipProgressSnippet,
  pollUntilSkinCheckSettled,
  REANALYZE_POLL,
  ReanalyzePollTimeoutError,
  reanalyzePollDelayMs,
} from "./reanalyze";

function entry(partial: Partial<ProgressEntryDTO> = {}): ProgressEntryDTO {
  return {
    id: "chk-1",
    check_date: "2026-09-07",
    created_at: "2026-09-07T00:00:00+07:00",
    image_urls: ["/uploads/a.jpg"],
    status: "completed",
    snippet: "Da hôm nay ổn.",
    gauges: { overall: 0.7 },
    ...partial,
  };
}

function payload(
  status: string,
  extra: Partial<CreateSkinCheckResponseDTO> = {},
): CreateSkinCheckResponseDTO {
  return {
    check: {
      id: "chk-1",
      user_id: "u1",
      visibility: "private",
      check_date: "2026-09-07",
      created_at: "2026-09-07T00:00:00+07:00",
    },
    analysis: {
      id: "an-1",
      skin_check_id: "chk-1",
      status,
    },
    image_urls: ["/uploads/a.jpg"],
    ...extra,
  };
}

describe("canShowReanalyzeCta", () => {
  it("shows only when photos exist and status is completed or failed", () => {
    assert.equal(canShowReanalyzeCta(entry({ status: "completed" })), true);
    assert.equal(canShowReanalyzeCta(entry({ status: "failed" })), true);
    assert.equal(canShowReanalyzeCta(entry({ status: "processing" })), false);
    assert.equal(canShowReanalyzeCta(entry({ status: "pending" })), false);
    assert.equal(
      canShowReanalyzeCta(entry({ status: "completed", image_urls: [] })),
      false,
    );
    assert.equal(
      canShowReanalyzeCta(entry({ status: "completed", image_urls: ["  "] })),
      false,
    );
    assert.equal(
      canShowReanalyzeCta(entry({ status: "failed", image_urls: undefined })),
      false,
    );
  });
});

describe("classifyReanalyzeError", () => {
  it("maps 422 / photos_required to validation", () => {
    assert.equal(
      classifyReanalyzeError(new ApiError("api", { status: 422, code: "photos_required" })),
      "validation",
    );
    assert.equal(
      classifyReanalyzeError(new ApiError("api", { status: 422, code: "invalid_input" })),
      "validation",
    );
  });

  it("maps daily cap vs generic 429", () => {
    assert.equal(
      classifyReanalyzeError(
        new ApiError("rate_limited", { status: 429, code: "reanalyze_limit" }),
      ),
      "daily_limit",
    );
    assert.equal(
      classifyReanalyzeError(
        new ApiError("rate_limited", { status: 429, code: "rate_limited" }),
      ),
      "rate_limit",
    );
  });

  it("maps timeout / abort / network", () => {
    assert.equal(classifyReanalyzeError(new ReanalyzePollTimeoutError()), "timeout");
    const abort = new Error("aborted");
    abort.name = "AbortError";
    assert.equal(classifyReanalyzeError(abort), "aborted");
    assert.equal(
      classifyReanalyzeError(new ApiError("network", { status: null })),
      "network",
    );
  });
});

describe("applySkinCheckToProgressEntry", () => {
  it("clears snippet while processing so the card shows the waiting copy", () => {
    const next = applySkinCheckToProgressEntry(entry(), payload("processing"));
    assert.equal(next.status, "processing");
    assert.equal(next.snippet, undefined);
    assert.equal(next.gauges?.overall, 0.7);
  });

  it("replaces snippet and gauges when completed", () => {
    const next = applySkinCheckToProgressEntry(
      entry(),
      payload("completed", {
        analysis: {
          id: "an-2",
          skin_check_id: "chk-1",
          status: "completed",
          coach: {
            summary_notes: "Da dịu hơn hôm qua.",
            skin_score_gauges: { overall: 0.82 },
          },
        },
      }),
    );
    assert.equal(next.status, "completed");
    assert.equal(next.snippet, "Da dịu hơn hôm qua.");
    assert.equal(next.gauges?.overall, 0.82);
  });

  it("clears snippet on failed so retry copy can show", () => {
    const next = applySkinCheckToProgressEntry(entry(), payload("failed"));
    assert.equal(next.status, "failed");
    assert.equal(next.snippet, undefined);
  });
});

describe("clipProgressSnippet", () => {
  it("keeps short notes and ellipsizes long ones", () => {
    assert.equal(clipProgressSnippet("  ok  "), "ok");
    const long = "a".repeat(200);
    const clipped = clipProgressSnippet(long);
    assert.ok(clipped.endsWith("…"));
    assert.ok(clipped.length <= 160);
  });
});

describe("reanalyzePollDelayMs", () => {
  it("matches the check-in fast-then-slow cadence", () => {
    assert.equal(reanalyzePollDelayMs(0), REANALYZE_POLL.fastMs);
    assert.equal(reanalyzePollDelayMs(19_999), REANALYZE_POLL.fastMs);
    assert.equal(reanalyzePollDelayMs(20_000), REANALYZE_POLL.slowMs);
  });
});

describe("pollUntilSkinCheckSettled", () => {
  it("returns when GET analysis is completed", async () => {
    const sleeps: number[] = [];
    const ticks: string[] = [];
    const settled = payload("completed");
    const out = await pollUntilSkinCheckSettled("chk-1", {
      fetchResult: async () => ({ ok: true, data: settled }),
      onTick: (data) => ticks.push(data.analysis.status),
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      now: () => 0,
    });
    assert.equal(out.analysis.status, "completed");
    assert.deepEqual(ticks, ["completed"]);
    assert.deepEqual(sleeps, [REANALYZE_POLL.fastMs]);
  });

  it("retries a network blip then settles", async () => {
    let calls = 0;
    const out = await pollUntilSkinCheckSettled("chk-1", {
      fetchResult: async () => {
        calls += 1;
        if (calls === 1) return { ok: false, kind: "network" };
        return { ok: true, data: payload("failed") };
      },
      sleep: async () => {},
      now: () => 0,
    });
    assert.equal(out.analysis.status, "failed");
    assert.equal(calls, 2);
  });

  it("times out after the shared 160s cap", async () => {
    let t = 0;
    await assert.rejects(
      () =>
        pollUntilSkinCheckSettled("chk-1", {
          fetchResult: async () => ({ ok: true, data: payload("processing") }),
          sleep: async () => {},
          now: () => {
            const cur = t;
            t = REANALYZE_POLL.timeoutMs;
            return cur;
          },
        }),
      ReanalyzePollTimeoutError,
    );
  });
});
