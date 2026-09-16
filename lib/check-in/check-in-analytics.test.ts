import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ApiError } from "@/lib/api-client";

import {
  checkInSubmitFailReason,
  isCheckInSkipSource,
} from "./check-in-analytics";

describe("isCheckInSkipSource", () => {
  it("accepts toggle / sticky / panel only", () => {
    assert.equal(isCheckInSkipSource("toggle"), true);
    assert.equal(isCheckInSkipSource("sticky"), true);
    assert.equal(isCheckInSkipSource("panel"), true);
    assert.equal(isCheckInSkipSource("form"), false);
  });
});

describe("checkInSubmitFailReason", () => {
  it("maps ApiError branches used by the check-in form", () => {
    assert.equal(
      checkInSubmitFailReason(new ApiError("unauthorized", { status: 401 })),
      "unauthorized",
    );
    assert.equal(
      checkInSubmitFailReason(
        new ApiError("api", { status: 413, code: "file_too_large" }),
      ),
      "file_too_large",
    );
    assert.equal(
      checkInSubmitFailReason(new ApiError("api", { status: 400, code: "invalid_image" })),
      "invalid_image",
    );
    assert.equal(
      checkInSubmitFailReason(
        new ApiError("api", { status: 400, code: "moderation_failed" }),
      ),
      "moderation_failed",
    );
    assert.equal(
      checkInSubmitFailReason(
        new ApiError("api", { status: 400, code: "missing_images" }),
      ),
      "missing_images",
    );
    assert.equal(
      checkInSubmitFailReason(new ApiError("rate_limited", { status: 429 })),
      "rate_limited",
    );
    assert.equal(
      checkInSubmitFailReason(
        new ApiError("forbidden", { status: 403, code: "premium_required" }),
      ),
      "premium_required",
    );
    assert.equal(
      checkInSubmitFailReason(
        new ApiError("forbidden", { status: 403, code: "feature_denied" }),
      ),
      "feature_denied",
    );
    assert.equal(checkInSubmitFailReason(new ApiError("timeout")), "timeout");
    assert.equal(checkInSubmitFailReason(new ApiError("offline")), "offline");
    assert.equal(checkInSubmitFailReason(new ApiError("server", { status: 502 })), "server");
    assert.equal(checkInSubmitFailReason(new ApiError("network")), "network");
  });

  it("falls back for unknown errors and non-ApiError throws", () => {
    assert.equal(checkInSubmitFailReason(new Error("boom")), "network");
    assert.equal(
      checkInSubmitFailReason(new ApiError("api", { status: 400, code: "weird" })),
      "weird",
    );
    assert.equal(checkInSubmitFailReason(new ApiError("api", { status: 400 })), "api");
    assert.equal(checkInSubmitFailReason(new ApiError("parse")), "parse");
  });
});
