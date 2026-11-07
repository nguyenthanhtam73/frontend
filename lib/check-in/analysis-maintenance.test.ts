import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CreateSkinCheckResponseDTO } from "@/lib/types/skin-check";

import {
  analysisPollOutcome,
  showsAnalysisMaintenance,
} from "./analysis-maintenance";

function payload(
  status: string,
  extra: Partial<CreateSkinCheckResponseDTO> = {},
): CreateSkinCheckResponseDTO {
  return {
    check: {
      id: "chk-1",
      user_id: "u1",
      visibility: "private",
      check_date: "2026-11-07",
      created_at: "2026-11-07T13:00:00Z",
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

describe("showsAnalysisMaintenance", () => {
  it("is true when analysis_pending is true, including a still-pending job", () => {
    assert.equal(
      showsAnalysisMaintenance({ analysisPending: true, status: "pending" }),
      true,
    );
    assert.equal(
      showsAnalysisMaintenance({ analysisPending: true, status: "processing" }),
      true,
    );
    assert.equal(
      showsAnalysisMaintenance({ analysisPending: true, status: "failed" }),
      true,
    );
  });

  it("is true for a failed analysis even when the flag is missing", () => {
    assert.equal(showsAnalysisMaintenance({ status: "failed" }), true);
    assert.equal(
      showsAnalysisMaintenance({ analysisPending: false, status: "failed" }),
      true,
    );
    assert.equal(
      showsAnalysisMaintenance({ analysisPending: undefined, status: "failed" }),
      true,
    );
  });

  it("stays false for a healthy in-flight job and for a completed result", () => {
    assert.equal(showsAnalysisMaintenance({ status: "pending" }), false);
    assert.equal(
      showsAnalysisMaintenance({ analysisPending: false, status: "processing" }),
      false,
    );
    assert.equal(
      showsAnalysisMaintenance({ analysisPending: true, status: "completed" }),
      false,
    );
    assert.equal(showsAnalysisMaintenance({}), false);
  });
});

describe("analysisPollOutcome", () => {
  it("keeps polling while pending even if analysis_pending is set", () => {
    assert.equal(
      analysisPollOutcome(payload("pending", { analysis_pending: true })),
      "continue",
    );
    assert.equal(analysisPollOutcome(payload("processing")), "continue");
  });

  it("stops on failed or completed", () => {
    assert.equal(analysisPollOutcome(payload("failed")), "failed");
    assert.equal(
      analysisPollOutcome(
        payload("completed", {
          analysis: {
            id: "an-1",
            skin_check_id: "chk-1",
            status: "completed",
            coach: { situation_summary: "Da ổn." },
          },
        }),
      ),
      "completed",
    );
  });

  it("treats a settled check with no coach as failed so the UI does not spin", () => {
    assert.equal(analysisPollOutcome(payload("completed")), "failed");
  });
});
