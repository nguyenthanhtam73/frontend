import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  acknowledgeBlurSend,
  applyBlurSample,
  chooseBlurSlot,
  clearBlurSlot,
  emptyBlurSlots,
  isBlurWarningVisible,
} from "./photo-blur-warning";

const URL_A = "blob:photo-a";
const URL_B = "blob:photo-b";

describe("blur warning state", () => {
  it("opens a warning once for a blurry sample and ignores a failed check", () => {
    const slots = emptyBlurSlots();
    const failed = applyBlurSample(slots, 0, URL_A, null);
    assert.equal(failed.reveal, false);
    assert.equal(isBlurWarningVisible(failed.slots[0], URL_A), false);

    const sharp = applyBlurSample(slots, 0, URL_A, { blurry: false, score: 0.4 });
    assert.equal(sharp.reveal, false);

    const blurry = applyBlurSample(slots, 0, URL_A, { blurry: true, score: 0.04 });
    assert.equal(blurry.reveal, true);
    assert.equal(isBlurWarningVisible(blurry.slots[0], URL_A), true);

    const again = applyBlurSample(blurry.slots, 0, URL_A, { blurry: true, score: 0.01 });
    assert.equal(again.reveal, false);
    assert.equal(again.slots, blurry.slots);
  });

  it("keeps the warning after retake and dismisses it on send anyway", () => {
    const opened = applyBlurSample(emptyBlurSlots(), 0, URL_A, { blurry: true, score: 0.05 });
    const retake = chooseBlurSlot(opened.slots, 0, URL_A, "retake");
    assert.equal(retake.track, true);
    assert.equal(isBlurWarningVisible(retake.slots[0], URL_A), true);

    const retakeAgain = chooseBlurSlot(retake.slots, 0, URL_A, "retake");
    assert.equal(retakeAgain.track, false);

    const send = chooseBlurSlot(retake.slots, 0, URL_A, "send_anyway");
    assert.equal(send.track, true);
    assert.equal(send.score, 0.05);
    assert.equal(isBlurWarningVisible(send.slots[0], URL_A), false);

    const sendAgain = chooseBlurSlot(send.slots, 0, URL_A, "send_anyway");
    assert.equal(sendAgain.track, false);
  });

  it("counts a still-open warning as send-anyway when the form submits", () => {
    let slots = emptyBlurSlots();
    slots = applyBlurSample(slots, 0, URL_A, { blurry: true, score: 0.02 }).slots;
    slots = applyBlurSample(slots, 1, URL_B, { blurry: true, score: 0.03 }).slots;
    slots = chooseBlurSlot(slots, 1, URL_B, "send_anyway").slots;

    const acked = acknowledgeBlurSend(slots);
    assert.deepEqual(acked.tracks, [{ slot: 0, score: 0.02 }]);
    assert.equal(isBlurWarningVisible(acked.slots[0], URL_A), false);
    assert.equal(isBlurWarningVisible(acked.slots[1], URL_B), false);

    const second = acknowledgeBlurSend(acked.slots);
    assert.deepEqual(second.tracks, []);
  });

  it("drops the decision when the photo is removed", () => {
    const opened = applyBlurSample(emptyBlurSlots(), 0, URL_A, { blurry: true, score: 0.02 });
    const cleared = clearBlurSlot(opened.slots, 0);
    assert.equal(cleared[0], null);
    assert.equal(clearBlurSlot(cleared, 0), cleared);
    const choice = chooseBlurSlot(cleared, 0, URL_A, "retake");
    assert.equal(choice.track, false);
  });
});
