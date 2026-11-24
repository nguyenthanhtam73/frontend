import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { bedaReadyMessage, clearBedaReady, noteBedaReady } from "@/lib/mascot/beda-ready";

describe("Bé Da ready signal", () => {
  it("posts the pixi engine once and sets the body attribute", () => {
    const sent: string[] = [];
    const body = { dataset: {} as { bedaReady?: string } };
    const sentFlag = { current: false };
    const scope = { DaDiarySession: { postMessage: (message: string) => sent.push(message) } };
    assert.equal(noteBedaReady("pixi", scope, body, sentFlag), true);
    assert.equal(body.dataset.bedaReady, "pixi");
    assert.equal(typeof sent[0], "string");
    assert.equal(sent[0], '{"type":"beda_ready","engine":"pixi"}');
    assert.equal(noteBedaReady("dom", scope, body, sentFlag), false);
    assert.equal(sent.length, 1);
    assert.equal(body.dataset.bedaReady, "pixi");
  });

  it("posts a JSON string whose only fields are type and engine", () => {
    for (const engine of ["pixi", "dom"] as const) {
      const sent: unknown[] = [];
      const body = { dataset: {} as { bedaReady?: string } };
      noteBedaReady(
        engine,
        { DaDiarySession: { postMessage: (message: string) => sent.push(message) } },
        body,
        { current: false },
      );
      assert.equal(sent.length, 1);
      assert.equal(typeof sent[0], "string");
      assert.equal(sent[0], `{"type":"beda_ready","engine":"${engine}"}`);
      const parsed = JSON.parse(sent[0] as string) as Record<string, unknown>;
      assert.deepEqual(Object.keys(parsed).sort(), ["engine", "type"]);
      assert.deepEqual(parsed, { type: "beda_ready", engine });
      assert.equal(body.dataset.bedaReady, engine);
    }
    assert.equal(bedaReadyMessage("pixi"), '{"type":"beda_ready","engine":"pixi"}');
    assert.equal(bedaReadyMessage("dom"), '{"type":"beda_ready","engine":"dom"}');
  });

  it("clears the ready attribute on unmount so room and lobby do not keep a stale engine", () => {
    const sent: string[] = [];
    const body = { dataset: {} as { bedaReady?: string } };
    const scope = { DaDiarySession: { postMessage: (message: string) => sent.push(message) } };
    noteBedaReady("pixi", scope, body, { current: false });
    assert.equal(body.dataset.bedaReady, "pixi");
    clearBedaReady(body);
    assert.equal("bedaReady" in body.dataset, false);
    noteBedaReady("dom", scope, body, { current: false });
    assert.equal(body.dataset.bedaReady, "dom");
    assert.deepEqual(sent, [
      '{"type":"beda_ready","engine":"pixi"}',
      '{"type":"beda_ready","engine":"dom"}',
    ]);
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../components/mascot/game");
    for (const file of ["be-da-game-view.tsx", "be-da-lobby.tsx"]) {
      const source = readFileSync(path.join(root, file), "utf8");
      assert.match(source, /return \(\) => \{\s*clearBedaReady\(document\.body\);\s*\};/);
    }
  });

  it("posts the dom engine when the plain room is showing, and skips a missing bridge", () => {
    const body = { dataset: {} as { bedaReady?: string } };
    const sentFlag = { current: false };
    assert.equal(noteBedaReady("dom", {}, body, sentFlag), true);
    assert.equal(body.dataset.bedaReady, "dom");
    assert.equal(bedaReadyMessage("dom"), JSON.stringify({ type: "beda_ready", engine: "dom" }));
  });
});
