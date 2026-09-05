import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Feature } from "@/lib/premium/features";

import {
  buildUpsellPricingHref,
  hasLiveUsageMeter,
  readUpsellFeatureFromSearch,
  recommendedPlanForFeature,
} from "./upsell-href";

describe("buildUpsellPricingHref", () => {
  it("points Free caps at Premium yearly with feature context", () => {
    assert.equal(
      buildUpsellPricingHref(Feature.AIRoutineSuggestion),
      "/pricing?plan=premium&interval=yearly&from=ai_routine_suggestion",
    );
    assert.equal(
      buildUpsellPricingHref(Feature.EditRoutine),
      "/pricing?plan=premium&interval=yearly&from=edit_routine",
    );
    assert.equal(
      buildUpsellPricingHref(Feature.WardrobeFull),
      "/pricing?plan=premium&interval=yearly&from=wardrobe_full",
    );
  });

  it("routes advanced analysis to Premium+", () => {
    assert.equal(
      recommendedPlanForFeature(Feature.AdvancedSkinAnalysis),
      "premium_plus",
    );
    assert.equal(
      buildUpsellPricingHref(Feature.AdvancedSkinAnalysis),
      "/pricing?plan=premium_plus&interval=yearly&from=advanced_skin_analysis",
    );
  });

  it("defaults to Premium when no feature is given", () => {
    assert.equal(buildUpsellPricingHref(), "/pricing?plan=premium&interval=yearly");
  });
});

describe("readUpsellFeatureFromSearch", () => {
  it("accepts known feature ids and rejects unknown", () => {
    assert.equal(
      readUpsellFeatureFromSearch("?from=ai_routine_suggestion&plan=premium"),
      Feature.AIRoutineSuggestion,
    );
    assert.equal(readUpsellFeatureFromSearch("from=not_a_feature"), null);
    assert.equal(readUpsellFeatureFromSearch(""), null);
  });
});

describe("hasLiveUsageMeter", () => {
  it("requires a real backend counter — never invents 3/5/3", () => {
    assert.equal(hasLiveUsageMeter({}), false);
    assert.equal(hasLiveUsageMeter({ used: 0, limit: 0, remaining: 0 }), false);
    assert.equal(hasLiveUsageMeter({ unlimited: true, limit: 3 }), false);
    assert.equal(hasLiveUsageMeter({ used: 3, limit: 3, remaining: 0 }), true);
    assert.equal(hasLiveUsageMeter({ used: 0, limit: 5, remaining: 5 }), true);
    assert.equal(hasLiveUsageMeter({ used: 2 }), true);
  });
});
