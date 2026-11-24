import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { SkinProfileResponse } from "@/lib/types/profile";

import {
  buildAffiliateMatchInput,
  isCurrentCheckSevere,
  isOnboardingSevere,
  ownedAffiliateSteps,
  textAdvisesDermatologist,
} from "./signals";

function profile(partial: Partial<SkinProfileResponse>): SkinProfileResponse {
  return {
    id: "profile-1",
    user_id: "user-1",
    skill_level: "beginner",
    version: 1,
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-20T00:00:00Z",
    ...partial,
  };
}

describe("affiliate skin signals", () => {
  it("reads an oily acne check and ignores a contradictory older skin type", () => {
    const input = buildAffiliateMatchInput({
      userId: "user-1",
      dayKey: "2026-11-24",
      cabinetKnown: false,
      products: [{ name: "Anessa", category: "spf" }],
      check: { conditions: ["oily", "breakout"], symptoms: ["new_breakouts"] },
      profile: profile({ skin_type: "dry", concerns: ["dryness"] }),
    });
    assert.deepEqual(input.skinTypes, ["oily"]);
    assert.ok(input.concerns.includes("acne"));
    assert.ok(input.concerns.includes("oil"));
    assert.equal(input.concerns.includes("dryness"), false);
    assert.deepEqual(input.ownedSteps, []);
    assert.equal(input.severe, false);
    assert.equal(input.cabinetKnown, false);
  });

  it("reads a dry check as dryness plus hydration", () => {
    const input = buildAffiliateMatchInput({
      dayKey: "2026-11-24",
      cabinetKnown: true,
      check: { conditions: ["dry", "dehydrated"] },
    });
    assert.deepEqual(input.skinTypes, ["dry"]);
    assert.ok(input.concerns.includes("dryness"));
    assert.ok(input.concerns.includes("hydration"));
  });

  it("treats sunscreen in the cabinet as an owned step", () => {
    assert.deepEqual(
      ownedAffiliateSteps([
        { name: "Anessa Mild Milk", category: "spf" },
        { name: "CeraVe Cleaner", category: "cleanser" },
        { name: "Kem chống nắng", category: "" },
      ]),
      ["sunscreen", "cleanser"],
    );
  });

  it("uses onboarding concerns when the check did not name any", () => {
    const input = buildAffiliateMatchInput({
      dayKey: "2026-11-24",
      cabinetKnown: true,
      check: { conditions: [] },
      profile: profile({
        skin_type: "dry",
        concerns: ["dryness", "redness"],
        onboarding_snapshot: {
          skin_analysis: {
            skin_type_guess: "dry",
            concerns: ["dryness"],
            severity_level: "mild",
          },
        },
      }),
    });
    assert.deepEqual(input.skinTypes, ["dry"]);
    assert.ok(input.concerns.includes("dryness"));
    assert.ok(input.concerns.includes("redness"));
    assert.equal(input.severe, false);
  });

  it("flags a dense onboarding read, and a doctor referral, as severe", () => {
    const dense = profile({
      onboarding_snapshot: {
        skin_analysis: { severity_level: "dense", concerns: ["acne"] },
      },
    });
    assert.equal(isOnboardingSevere(dense), true);
    const fromCabinet = buildAffiliateMatchInput({
      dayKey: "2026-11-24",
      cabinetKnown: true,
      profile: dense,
    });
    assert.equal(fromCabinet.severe, true);

    assert.equal(
      textAdvisesDermatologist("Chỉ là gợi ý chăm sóc da, không thay thế bác sĩ."),
      false,
    );
    assert.equal(
      textAdvisesDermatologist("Stop and see a dermatologist if burning or swelling."),
      false,
    );
    assert.equal(textAdvisesDermatologist("Nên gặp bác sĩ da liễu vì da đau và sưng."), true);
    assert.equal(
      isCurrentCheckSevere({
        coach: { zone_notes: [{ zone: "cheeks", note: "Khá rõ.", severity: "pronounced" }] },
      }),
      false,
    );
    assert.equal(
      isCurrentCheckSevere({
        coach: { safety_reminders: ["Nên gặp bác sĩ da liễu vì vùng này đau."] },
      }),
      true,
    );

    const latestCalm = buildAffiliateMatchInput({
      dayKey: "2026-11-24",
      cabinetKnown: true,
      check: { conditions: ["oily"], coach: { situation_summary: "Hôm nay da dầu nhẹ." } },
      profile: dense,
    });
    assert.equal(latestCalm.severe, false);
  });
});
