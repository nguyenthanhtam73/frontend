import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { routineStepHint } from "./routine-step-hint";

describe("routineStepHint", () => {
  it("lists the actual morning steps instead of a fixed three", () => {
    assert.equal(
      routineStepHint(["Sữa rửa mặt dịu — nước ấm"], "vi"),
      "Sữa rửa mặt dịu",
    );
    assert.equal(
      routineStepHint(
        [
          "Sữa rửa mặt dịu — nước ấm",
          "Kem dưỡng ẩm nhẹ — thoa khi da còn ẩm",
          "Kem chống nắng mỗi sáng — bôi mỗi sáng",
        ],
        "vi",
      ),
      "Sữa rửa mặt dịu, kem dưỡng ẩm nhẹ, rồi kem chống nắng mỗi sáng",
    );
  });

  it("uses then in English", () => {
    assert.equal(
      routineStepHint(["Gentle cleanser — lukewarm", "Morning sunscreen — daily"], "en"),
      "Gentle cleanser, then morning sunscreen",
    );
  });
});
