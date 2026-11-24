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
      "Sữa rửa mặt dịu, Kem dưỡng ẩm nhẹ, rồi Kem chống nắng mỗi sáng",
    );
  });

  it("keeps capitals in SPF, BHA, and brand names", () => {
    assert.equal(routineStepHint(["Rửa mặt", "SPF 50"], "vi"), "Rửa mặt, rồi SPF 50");
    assert.equal(routineStepHint(["Rửa mặt", "BHA 2%"], "vi"), "Rửa mặt, rồi BHA 2%");
    assert.equal(
      routineStepHint(["Rửa mặt", "La Roche-Posay"], "vi"),
      "Rửa mặt, rồi La Roche-Posay",
    );
  });

  it("uses then in English", () => {
    assert.equal(
      routineStepHint(["Gentle cleanser — lukewarm", "Morning sunscreen — daily"], "en"),
      "Gentle cleanser, then Morning sunscreen",
    );
  });
});
