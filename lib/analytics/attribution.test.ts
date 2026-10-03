import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ATTRIBUTION_MAX_LEN,
  FIRST_TOUCH_STORAGE_KEY,
  LAST_TOUCH_STORAGE_KEY,
  captureAttribution,
  funnelEventAttributionProps,
  readAttributionParams,
  readFirstTouch,
  readLastTouch,
  type AttributionStorage,
} from "./attribution";

function memoryStorage(): AttributionStorage & { snapshot(): Record<string, string> } {
  const map = new Map<string, string>();
  return {
    getItem: (key) => (map.has(key) ? map.get(key)! : null),
    setItem: (key, value) => {
      map.set(key, value);
    },
    snapshot: () => Object.fromEntries(map),
  };
}

describe("attribution", () => {
  it("reads only the allow-listed params and caps length", () => {
    const long = "s".repeat(ATTRIBUTION_MAX_LEN + 40);
    const touch = readAttributionParams(
      `?utm_source=${long}&utm_medium=cpc&utm_campaign=spring&utm_content=ad&fbclid=fb&ttclid=tt&email=person@example.com&password=secret`,
    );
    assert.deepEqual(touch, {
      utm_source: "s".repeat(ATTRIBUTION_MAX_LEN),
      utm_medium: "cpc",
      utm_campaign: "spring",
      utm_content: "ad",
      fbclid: "fb",
      ttclid: "tt",
    });
    assert.equal(JSON.stringify(touch).includes("person@example.com"), false);
    assert.equal(JSON.stringify(touch).includes("secret"), false);
  });

  it("ignores a URL with none of the attribution params", () => {
    assert.equal(readAttributionParams("?email=a@b.co&next=/check-in"), null);
  });

  it("keeps the first touch and refreshes last touch", () => {
    const storage = memoryStorage();
    captureAttribution("?utm_source=first&utm_campaign=a&fbclid=fb1", storage);
    captureAttribution("?utm_source=second&utm_medium=paid&utm_campaign=b&ttclid=tt2", storage);

    assert.deepEqual(readFirstTouch(storage), {
      utm_source: "first",
      utm_campaign: "a",
      fbclid: "fb1",
    });
    assert.deepEqual(readLastTouch(storage), {
      utm_source: "second",
      utm_medium: "paid",
      utm_campaign: "b",
      ttclid: "tt2",
    });
    assert.equal(storage.snapshot()[FIRST_TOUCH_STORAGE_KEY]?.includes("second"), false);
    assert.equal(storage.snapshot()[LAST_TOUCH_STORAGE_KEY]?.includes("second"), true);
  });

  it("does not create a first touch from a later URL that has no params", () => {
    const storage = memoryStorage();
    captureAttribution("", storage);
    captureAttribution("?q=hello", storage);
    assert.equal(readFirstTouch(storage), null);
    assert.equal(readLastTouch(storage), null);

    captureAttribution("?utm_source=test&utm_campaign=x", storage);
    captureAttribution("", storage);
    assert.deepEqual(readFirstTouch(storage), { utm_source: "test", utm_campaign: "x" });
    assert.deepEqual(readLastTouch(storage), { utm_source: "test", utm_campaign: "x" });
  });

  it("copies only utm_source, utm_campaign, utm_content, and fbclid onto events", () => {
    const props = funnelEventAttributionProps({
      utm_source: "meta",
      utm_medium: "cpc",
      utm_campaign: "chiến dịch da",
      utm_content: "video_tu_do",
      fbclid: "f".repeat(ATTRIBUTION_MAX_LEN + 40),
      ttclid: "tt",
    });
    assert.deepEqual(props, {
      utm_source: "meta",
      utm_campaign: "chiến dịch da",
      utm_content: "video_tu_do",
      fbclid: "f".repeat(ATTRIBUTION_MAX_LEN),
    });
    assert.equal(props.fbclid?.length, ATTRIBUTION_MAX_LEN);
    assert.equal("utm_medium" in props, false);
    assert.equal("ttclid" in props, false);
  });
});
