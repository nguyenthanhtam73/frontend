import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  BACKEND_NUDGE_TEMPLATES,
  fillNudgeLine,
  pickNudgeVoice,
} from "@/lib/mascot/game/nudge-voice";
import vi from "../../../messages/vi.json";

const LINES = [
  vi.mascot.game.nudge.v1,
  vi.mascot.game.nudge.v2,
  vi.mascot.game.nudge.v3,
  vi.mascot.game.nudge.v4,
] as const;

const WEB = [
  "Lan đang chờ mày chăm da hôm nay đó 💕",
  "Lan nhắc nhẹ: hôm nay tao với mày cùng chăm da nha ✨",
  "Bé Da của Lan đang vẫy mày, vào chăm da hôm nay đi 💗",
  "Lan giữ một chỗ trên bảng hôm nay cho mày đó 🌸",
] as const;

function backend(index: 1 | 2 | 3 | 4, name = "Lan"): string {
  return BACKEND_NUDGE_TEMPLATES[index - 1].replaceAll("{name}", name);
}

function shown(input: Parameters<typeof pickNudgeVoice>[0]): string {
  const voice = pickNudgeVoice(input);
  return fillNudgeLine(LINES[voice.index - 1], voice.name);
}

describe("web nudge voice", () => {
  it("uses each backend sentence as its matching web line", () => {
    for (const index of [1, 2, 3, 4] as const) {
      assert.equal(shown({ message: backend(index) }), WEB[index - 1]);
      assert.equal(shown({ message: backend(index) }).includes("bạn"), false);
      assert.equal(shown({ message: backend(index) }).includes("mình"), false);
    }
  });

  it("reads variant, then type, then nudge_type", () => {
    const wait = backend(1);
    assert.equal(shown({ message: wait, variant: 3 }), WEB[2]);
    assert.equal(shown({ message: wait, type: "2" }), WEB[1]);
    assert.equal(shown({ message: wait, nudgeType: 4 }), WEB[3]);
    assert.equal(shown({ message: wait, variant: 4, type: 2 }), WEB[3]);
  });

  it("falls back to the first line when the type is unknown or missing", () => {
    assert.equal(shown({ message: "hello", variant: 9 }), "Một người đang chờ mày chăm da hôm nay đó 💕");
    assert.equal(shown({ message: "hello", type: "wave" }), "Một người đang chờ mày chăm da hôm nay đó 💕");
    assert.equal(shown({}), "Một người đang chờ mày chăm da hôm nay đó 💕");
    assert.equal(shown({ message: "   " }), "Một người đang chờ mày chăm da hôm nay đó 💕");
  });

  it("keeps a two-word name from the server sentence", () => {
    assert.equal(
      shown({ message: backend(4, "Mây Hồng") }),
      "Mây Hồng giữ một chỗ trên bảng hôm nay cho mày đó 🌸",
    );
  });
});

describe("nudge copy files", () => {
  it("stores the four web lines in Vietnamese and English", () => {
    const en = JSON.parse(readFileSync(new URL("../../../messages/en.json", import.meta.url), "utf8")) as {
      mascot: { game: { nudge: Record<string, string> } };
    };
    assert.deepEqual(LINES, WEB.map((line) => line.replace("Lan", "{name}")));
    for (const key of ["v1", "v2", "v3", "v4"]) {
      assert.match(en.mascot.game.nudge[key] ?? "", /\{name\}/);
      assert.equal((en.mascot.game.nudge[key] ?? "").includes("bạn"), false);
    }
  });
});
