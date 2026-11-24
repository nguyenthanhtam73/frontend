import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { bedaReadyMessage, noteBedaReady } from "@/lib/mascot/beda-ready";

describe("Bé Da ready signal", () => {
  it("posts the pixi engine once and sets the body attribute", () => {
    const sent: string[] = [];
    const body = { dataset: {} as { bedaReady?: string } };
    const sentFlag = { current: false };
    const scope = { DaDiarySession: { postMessage: (message: string) => sent.push(message) } };
    assert.equal(noteBedaReady("pixi", scope, body, sentFlag), true);
    assert.equal(body.dataset.bedaReady, "pixi");
    assert.deepEqual(sent, [bedaReadyMessage("pixi")]);
    assert.equal(sent[0], JSON.stringify({ type: "beda_ready", engine: "pixi" }));
    assert.equal(noteBedaReady("dom", scope, body, sentFlag), false);
    assert.equal(sent.length, 1);
    assert.equal(body.dataset.bedaReady, "pixi");
  });

  it("posts the dom engine when the plain room is showing, and skips a missing bridge", () => {
    const body = { dataset: {} as { bedaReady?: string } };
    const sentFlag = { current: false };
    assert.equal(noteBedaReady("dom", {}, body, sentFlag), true);
    assert.equal(body.dataset.bedaReady, "dom");
    assert.equal(bedaReadyMessage("dom"), JSON.stringify({ type: "beda_ready", engine: "dom" }));
  });
});
