import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { LOI_LINES, chooseBeDaTrigger, giftLoiTrigger, nextRecentIds, pickLoiLine } from "@/lib/mascot/loi-noi";

describe("loi_noi file", () => {
  it("has the 236 reviewed lines", () => {
    assert.equal(LOI_LINES.length, 236);
    assert.equal(LOI_LINES[0]?.id, "be_da.mo_app_sang.1");
    assert.match(LOI_LINES[0]?.text ?? "", /Sáng rồi đó/);
  });
});

describe("loi picker", () => {
  it("rotates so the last line is not repeated", () => {
    const query = { speaker: "be_da" as const, personality: "be_da", trigger: "mo_app_sang" };
    const first = pickLoiLine(LOI_LINES, query, []);
    assert.ok(first);
    const second = pickLoiLine(LOI_LINES, query, nextRecentIds([], first.id));
    assert.ok(second);
    assert.notEqual(second.id, first.id);
    const again = pickLoiLine(LOI_LINES, query, nextRecentIds([first.id], second.id));
    assert.notEqual(again?.id, second.id);
  });

  it("uses a streak line only when the moc matches", () => {
    const seven = pickLoiLine(LOI_LINES, { speaker: "be_da", personality: "be_da", trigger: "streak_moc", moc: 7 }, []);
    const thirty = pickLoiLine(LOI_LINES, { speaker: "be_da", personality: "be_da", trigger: "streak_moc", moc: 30 }, []);
    assert.equal(seven?.moc, 7);
    assert.equal(thirty?.moc, 30);
    assert.equal(pickLoiLine(LOI_LINES, { speaker: "be_da", personality: "be_da", trigger: "streak_moc", moc: 8 }, []), null);
  });

  it("picks the open-app trigger from the clock, streak, and missed days", () => {
    assert.deepEqual(chooseBeDaTrigger({ hour: 23, missedDays: 0, streak: 1, randomDue: false }), { trigger: "thuc_khuya" });
    assert.deepEqual(chooseBeDaTrigger({ hour: 9, missedDays: 0, streak: 7, randomDue: false }), { trigger: "streak_moc", moc: 7 });
    assert.deepEqual(chooseBeDaTrigger({ hour: 9, missedDays: 4, streak: 0, randomDue: false }), { trigger: "bo_3_ngay_tro_len" });
    assert.deepEqual(chooseBeDaTrigger({ hour: 9, missedDays: 1, streak: 2, randomDue: false }), { trigger: "bo_1_ngay" });
    assert.deepEqual(chooseBeDaTrigger({ hour: 8, missedDays: 0, streak: 2, randomDue: false }), { trigger: "mo_app_sang" });
    assert.deepEqual(chooseBeDaTrigger({ hour: 20, missedDays: 0, streak: 2, randomDue: false }), { trigger: "mo_app_toi" });
    assert.equal(chooseBeDaTrigger({ hour: 14, missedDays: 0, streak: 2, randomDue: false }), null);
    assert.equal(giftLoiTrigger("hiem", false), "mo_hop_hiem");
    assert.equal(giftLoiTrigger("common", true), null);
  });
});
