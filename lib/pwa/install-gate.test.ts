import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  hasEarnedInstallPrompt,
  markInstallPromptEarned,
  whenInstallPromptEarned,
} from "./install-gate";

const g = globalThis as unknown as { window?: EventTarget & { localStorage: Storage } };

function installWindow() {
  const mem = new Map<string, string>();
  const localStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, String(v)),
    removeItem: (k: string) => void mem.delete(k),
  } as Storage;
  g.window = Object.assign(new EventTarget(), { localStorage });
}

describe("install gate", () => {
  beforeEach(installWindow);
  afterEach(() => {
    delete g.window;
  });

  it("is closed for a first-time visitor", () => {
    assert.equal(hasEarnedInstallPrompt(), false);
  });

  it("opens after a check-in and notifies waiting prompts in the same tab", () => {
    let calls = 0;
    whenInstallPromptEarned(() => calls++);
    assert.equal(calls, 0);

    markInstallPromptEarned();
    assert.equal(hasEarnedInstallPrompt(), true);
    assert.equal(calls, 1);

    markInstallPromptEarned();
    assert.equal(calls, 1);
  });

  it("fires immediately once already earned", () => {
    markInstallPromptEarned();
    let calls = 0;
    whenInstallPromptEarned(() => calls++);
    assert.equal(calls, 1);
  });

  it("stops listening after unsubscribe", () => {
    let calls = 0;
    const unsubscribe = whenInstallPromptEarned(() => calls++);
    unsubscribe();
    markInstallPromptEarned();
    assert.equal(calls, 0);
  });
});
