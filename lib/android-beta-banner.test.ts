import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isAndroidAppShell,
  isAndroidAppUserAgent,
  isAndroidBetaDismissed,
  isAndroidBrowser,
  readAndroidBetaUrls,
  shouldShowAndroidBetaBanner,
  writeAndroidBetaDismissed,
} from "./android-beta-banner";

const CHROME =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const WEBVIEW =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36";
const URLS = {
  group: "https://groups.google.com/g/dadiary-beta",
  optIn: "https://play.google.com/apps/testing/vn.dadiary.app",
};

function show(over: Partial<Parameters<typeof shouldShowAndroidBetaBanner>[0]> = {}) {
  return shouldShowAndroidBetaBanner({
    signedIn: true,
    userAgent: CHROME,
    displayMode: "browser",
    referrer: "https://www.google.com/",
    urls: URLS,
    dismissed: false,
    ...over,
  });
}

describe("android beta banner", () => {
  it("hides unless both invite URLs are http(s)", () => {
    assert.equal(readAndroidBetaUrls({}), null);
    assert.equal(
      readAndroidBetaUrls({ NEXT_PUBLIC_ANDROID_BETA_GROUP_URL: URLS.group }),
      null,
    );
    assert.equal(
      readAndroidBetaUrls({
        NEXT_PUBLIC_ANDROID_BETA_GROUP_URL: " javascript:alert(1)",
        NEXT_PUBLIC_ANDROID_BETA_OPTIN_URL: URLS.optIn,
      }),
      null,
    );
    assert.deepEqual(
      readAndroidBetaUrls({
        NEXT_PUBLIC_ANDROID_BETA_GROUP_URL: ` ${URLS.group} `,
        NEXT_PUBLIC_ANDROID_BETA_OPTIN_URL: URLS.optIn,
      }),
      URLS,
    );
  });

  it("shows only a signed-in Android browser tab", () => {
    assert.equal(show(), true);
    assert.equal(show({ signedIn: false }), false);
    assert.equal(show({ urls: null }), false);
    assert.equal(show({ dismissed: true }), false);
    assert.equal(show({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" }), false);
    assert.equal(isAndroidBrowser(CHROME), true);
    assert.equal(isAndroidBrowser(WEBVIEW), false);
    assert.equal(isAndroidAppUserAgent(WEBVIEW), true);
  });

  it("hides inside the Android app", () => {
    assert.equal(show({ userAgent: WEBVIEW }), false);
    assert.equal(show({ userAgent: `${CHROME} DaDiaryAndroid/1` }), false);
    assert.equal(show({ displayMode: "standalone" }), false);
    assert.equal(show({ displayMode: "fullscreen" }), false);
    assert.equal(show({ displayMode: "minimal-ui" }), false);
    assert.equal(show({ referrer: "android-app://vn.dadiary.app" }), false);
    assert.equal(
      isAndroidAppShell({
        userAgent: CHROME,
        displayMode: "browser",
        referrer: "android-app://vn.dadiary.app",
      }),
      true,
    );
  });

  it("remembers a dismissal", () => {
    const box = new Map<string, string>();
    const storage = {
      getItem: (key: string) => box.get(key) ?? null,
      setItem: (key: string, value: string) => {
        box.set(key, value);
      },
    };
    assert.equal(isAndroidBetaDismissed(storage), false);
    writeAndroidBetaDismissed(storage);
    assert.equal(isAndroidBetaDismissed(storage), true);
    assert.equal(show({ dismissed: isAndroidBetaDismissed(storage) }), false);
  });
});
