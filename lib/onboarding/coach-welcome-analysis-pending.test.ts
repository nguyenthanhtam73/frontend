import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import type { FetchSkinCheckResult } from "@/lib/api/skin-check";
import type { CreateSkinCheckResponseDTO } from "@/lib/types/skin-check";

import { fetchCoachWelcomeAnalysisPending } from "./coach-welcome-analysis-pending";

function check(analysisPending?: boolean): CreateSkinCheckResponseDTO {
  return {
    check: {
      id: "chk-1",
      user_id: "user-1",
      visibility: "private",
      check_date: "2026-11-07",
      created_at: "2026-11-07T13:00:00Z",
    },
    analysis: {
      id: "an-1",
      skin_check_id: "chk-1",
      status: "pending",
    },
    image_urls: ["/uploads/face.jpg"],
    ...(analysisPending === undefined ? {} : { analysis_pending: analysisPending }),
  };
}

function ok(analysisPending?: boolean): FetchSkinCheckResult {
  return { ok: true, data: check(analysisPending) };
}

describe("fetchCoachWelcomeAnalysisPending", () => {
  it("is true only when GET /skin-checks/:id sets analysis_pending", async () => {
    const value = await fetchCoachWelcomeAnalysisPending({
      latestCheckId: async () => "chk-1",
      fetchCheck: async () => ok(true),
    });
    assert.equal(value, true);
  });

  it("stays false when the field is omitted or false, or the check cannot be read", async () => {
    assert.equal(
      await fetchCoachWelcomeAnalysisPending({
        latestCheckId: async () => "chk-1",
        fetchCheck: async () => ok(undefined),
      }),
      false,
    );
    assert.equal(
      await fetchCoachWelcomeAnalysisPending({
        latestCheckId: async () => "chk-1",
        fetchCheck: async () => ok(false),
      }),
      false,
    );
    assert.equal(
      await fetchCoachWelcomeAnalysisPending({
        latestCheckId: async () => "chk-1",
        fetchCheck: async () => ({ ok: false, kind: "not_found" }),
      }),
      false,
    );
    assert.equal(
      await fetchCoachWelcomeAnalysisPending({
        latestCheckId: async () => null,
        fetchCheck: async () => ok(true),
      }),
      false,
    );
  });
});

describe("coach-welcome passes analysis_pending into the starter notice", () => {
  const src = fs.readFileSync(
    path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../components/onboarding/coach-welcome-client.tsx",
    ),
    "utf8",
  );

  it("reads the skin-check flag and passes analysisPending to the notice", () => {
    assert.match(src, /void fetchCoachWelcomeAnalysisPending\(\)/);
    assert.match(src, /analysisPending=\{analysisPending\}/);
  });
});
