import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import vi from "../../../messages/vi.json";
import {
  claimClick,
  coinAt,
  emptyQuestGrant,
  normalizeQuestGrant,
  questChestCopyOk,
  questChestOpenMs,
  QUEST_CHEST_FADE_MS,
  QUEST_CHEST_OPEN_MS,
} from "./quest-chest";

describe("quest chest claim", () => {
  it("ignores a second tap while a claim is pending or already finished", () => {
    assert.equal(claimClick({ pending: false, done: false }), "run");
    assert.equal(claimClick({ pending: true, done: false }), "ignore");
    assert.equal(claimClick({ pending: false, done: true }), "ignore");
  });

  it("keeps the opening short when motion is reduced", () => {
    assert.equal(questChestOpenMs(false), QUEST_CHEST_OPEN_MS);
    assert.equal(questChestOpenMs(true), QUEST_CHEST_FADE_MS);
    assert.ok(QUEST_CHEST_OPEN_MS >= 1400 && QUEST_CHEST_OPEN_MS <= 1700);
  });

  it("uses one warm line with two mày and no bạn or mình", () => {
    const line = vi.mascot.game.chestLine;
    const fail = vi.mascot.game.chestFail;
    assert.equal(line, "Mày chăm quá, quà của mày nè!");
    assert.equal(questChestCopyOk(line), true);
    assert.equal(line.match(/mày/gi)?.length, 2);
    assert.equal(questChestCopyOk(fail), true);
    assert.equal(/error|stack|404|undefined|exception/i.test(fail), false);
    assert.equal(vi.mascot.game.chestTake, "Nhận");
  });

  it("drops a broken grant down to an empty one", () => {
    assert.deepEqual(normalizeQuestGrant(undefined), emptyQuestGrant());
    assert.deepEqual(
      normalizeQuestGrant({ coins: 18.8, balance: 1268, item: { name: "  Kẹp  ", src: "/mascot/icons/heart.svg" } }),
      { coins: 18, balance: 1268, item: { name: "Kẹp", src: "/mascot/icons/heart.svg" } },
    );
    assert.equal(normalizeQuestGrant({ coins: -4, balance: null, item: null }).coins, 0);
  });

  it("counts xu toward the new balance and lands on it", () => {
    assert.equal(coinAt(1250, 1268, 0), 1250);
    assert.equal(coinAt(1250, 1268, 1), 1268);
    const mid = coinAt(1250, 1268, 0.5);
    assert.ok(mid > 1250 && mid < 1268);
  });
});

describe("quest chest motion css", () => {
  const css = readFileSync(new URL("../../../components/mascot/game/be-da-game.css", import.meta.url), "utf8");

  it("gives Nhận a 48px target and fades instead of shaking when motion is reduced", () => {
    assert.match(css, /\.beda-chest-take\s*\{[^}]*min-height:\s*48px/);
    assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*\.beda-chest-art\.is-wiggle,\s*\.beda-chest-art\.is-shake/);
    assert.match(css, /\.beda-chest-star \{\n\s*display: none;/);
    assert.match(css, /animation: beda-chest-fade 0\.4s ease both/);
  });
});
