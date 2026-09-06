import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolveCabinetEmptyIntent,
  shouldShowCabinetSetupStarter,
} from "./empty-intent";

const signedInReady = {
  hasAuth: true,
  streakSettled: true,
  neverCheckedIn: false,
  onboardingComplete: true,
};

describe("resolveCabinetEmptyIntent", () => {
  it("gives logged-out users a single sign-in intent", () => {
    assert.equal(
      resolveCabinetEmptyIntent({
        hasAuth: false,
        streakSettled: false,
        neverCheckedIn: true,
        onboardingComplete: false,
      }),
      "guest",
    );
  });

  it("waits for streak before choosing check-in vs starter", () => {
    assert.equal(
      resolveCabinetEmptyIntent({
        ...signedInReady,
        streakSettled: false,
        neverCheckedIn: true,
        onboardingComplete: false,
      }),
      "pending",
    );
  });

  it("sends signed-in users with no diary to check-in first", () => {
    assert.equal(
      resolveCabinetEmptyIntent({
        ...signedInReady,
        neverCheckedIn: true,
        onboardingComplete: false,
      }),
      "checkInFirst",
    );
    assert.equal(
      resolveCabinetEmptyIntent({
        ...signedInReady,
        neverCheckedIn: true,
        onboardingComplete: true,
      }),
      "checkInFirst",
    );
  });

  it("offers starter setup only after a diary exists", () => {
    assert.equal(
      resolveCabinetEmptyIntent({
        ...signedInReady,
        onboardingComplete: false,
      }),
      "setupStarter",
    );
  });

  it("falls back to add-product when shelf work is the next step", () => {
    assert.equal(resolveCabinetEmptyIntent(signedInReady), "addProduct");
  });
});

describe("shouldShowCabinetSetupStarter", () => {
  it("hides the ~2 min routine CTA until check-in is done", () => {
    assert.equal(shouldShowCabinetSetupStarter("guest"), false);
    assert.equal(shouldShowCabinetSetupStarter("pending"), false);
    assert.equal(shouldShowCabinetSetupStarter("checkInFirst"), false);
    assert.equal(shouldShowCabinetSetupStarter("addProduct"), false);
    assert.equal(shouldShowCabinetSetupStarter("setupStarter"), true);
  });
});
