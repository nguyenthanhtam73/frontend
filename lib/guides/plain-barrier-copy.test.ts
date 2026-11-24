import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const GUIDES = path.resolve(import.meta.dirname);

function filesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) out.push(...filesUnder(full));
    else out.push(full);
  }
  return out;
}

describe("guide barrier wording", () => {
  it("has no hàng rào anywhere under lib/guides", () => {
    const hits: string[] = [];
    for (const file of filesUnder(GUIDES)) {
      if (file.endsWith("plain-barrier-copy.test.ts")) continue;
      const text = fs.readFileSync(file, "utf8");
      if (/hàng rào/iu.test(text)) hits.push(path.relative(GUIDES, file));
    }
    assert.deepEqual(hits, []);
  });

  it("keeps the rewritten sentences readable", () => {
    const read = (rel: string) => fs.readFileSync(path.join(GUIDES, rel), "utf8");
    const adapalene = read("articles/kich-ung-adapalene.ts");
    assert.match(adapalene, /Da dầu đang rát vẫn cần dưỡng để lớp ngoài da đỡ khô rát/);
    assert.match(adapalene, /khiến da khô rát, đỏ hơn/);
    assert.equal(adapalene.includes("lớp ngoài da kêu"), false);
    assert.match(read("hub.ts"), /khi da đang khô rát, đỏ hơn/);
    assert.equal(read("hub.ts").includes("kêu"), false);
    assert.match(read("articles/mun.ts"), /Da mụn vẫn cần dưỡng để lớp ngoài da đỡ khô rát/);
    assert.match(read("articles/da-kho.ts"), /Thường là lớp ngoài da đang khô/);
  });
});
