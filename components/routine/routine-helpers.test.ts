import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  cloneStepsForToday,
  overlayStepCompletions,
  routineSaveUnsavedHint,
  stripStep,
  type LocalRoutine,
} from "./routine-helpers";

function base(over: Partial<LocalRoutine> = {}): LocalRoutine {
  return {
    morning: [{ id: "m1", title: "Cleanser", category: "cleanser", completed: false }],
    evening: [{ id: "e1", title: "Moisturizer", category: "moisturizer", completed: true }],
    notes: "saved notes",
    source: "manual",
    skillMode: "beginner",
    saved: true,
    routineDate: "2026-08-18",
    carriedFromDate: "",
    ...over,
  };
}

describe("overlayStepCompletions", () => {
  it("copies ticks onto the persisted snapshot without taking dirty titles", () => {
    const persisted = base();
    const current = base({
      morning: [{ id: "m1", title: "Dirty rename", category: "serum", completed: true }],
      notes: "dirty notes",
    });
    const out = overlayStepCompletions(persisted, current);
    assert.equal(out.morning[0]?.title, "Cleanser");
    assert.equal(out.morning[0]?.category, "cleanser");
    assert.equal(out.morning[0]?.completed, true);
    assert.equal(out.notes, "saved notes");
  });

  it("allows untick of a previously completed step", () => {
    const persisted = base();
    const current = base({
      evening: [{ id: "e1", title: "Moisturizer", completed: false }],
    });
    const out = overlayStepCompletions(persisted, current);
    assert.equal(out.evening[0]?.completed, false);
  });

  it("ignores newly added dirty steps until manual save", () => {
    const persisted = base();
    const current = base({
      morning: [
        { id: "m1", title: "Cleanser", completed: true },
        { id: "m2", title: "New SPF", category: "spf", completed: true },
      ],
    });
    const out = overlayStepCompletions(persisted, current);
    assert.equal(out.morning.length, 1);
    assert.equal(out.morning[0]?.id, "m1");
    assert.equal(out.morning[0]?.completed, true);
  });
});

describe("cloneStepsForToday", () => {
  it("resets completion and issues new ids", () => {
    const cloned = cloneStepsForToday([
      { id: "old", title: "SPF", category: "spf", notes: "face", completed: true },
    ]);
    assert.equal(cloned.length, 1);
    assert.equal(cloned[0]?.title, "SPF");
    assert.equal(cloned[0]?.completed, false);
    assert.notEqual(cloned[0]?.id, "old");
  });

  it("includes how_to and dose in the API payload when present", () => {
    const stripped = stripStep({
      id: "m1",
      title: "  Cleanser  ",
      category: "cleanser",
      how_to: "  Warm water → rinse.  ",
      dose: " 1–2 pump ",
      completed: false,
    });
    assert.equal(stripped.how_to, "Warm water → rinse.");
    assert.equal(stripped.dose, "1–2 pump");
    assert.equal(stripped.title, "Cleanser");
  });

  it("includes why in the API payload when present", () => {
    const stripped = stripStep({
      id: "m1",
      title: "Cleanser",
      category: "cleanser",
      why: "  Rửa để sạch bụi.  ",
      completed: false,
    });
    assert.equal(stripped.why, "Rửa để sạch bụi.");
  });

  it("omits empty how_to/dose/why so older backends stay unchanged", () => {
    const stripped = stripStep({
      id: "m1",
      title: "Cleanser",
      completed: false,
    });
    assert.equal("how_to" in stripped, false);
    assert.equal("dose" in stripped, false);
    assert.equal("why" in stripped, false);
  });

  it("copies how_to, dose, and why when cloning a history day", () => {
    const cloned = cloneStepsForToday([
      {
        id: "old",
        title: "Sữa rửa mặt",
        category: "cleanser",
        how_to: "Nước ấm → sữa rửa → 60 giây.",
        dose: "1–2 pump",
        why: "Rửa để sạch bụi trên mặt trước khi dưỡng.",
        completed: true,
      },
    ]);
    assert.equal(cloned[0]?.how_to, "Nước ấm → sữa rửa → 60 giây.");
    assert.equal(cloned[0]?.dose, "1–2 pump");
    assert.equal(cloned[0]?.why, "Rửa để sạch bụi trên mặt trước khi dưỡng.");
  });
});

describe("routineSaveUnsavedHint", () => {
  const labels = {
    saveToday: "template — tap Save today",
    structural: "unsaved structure — tap Save today",
  };

  it("uses save-today copy until today is persisted", () => {
    assert.equal(routineSaveUnsavedHint(false, labels), labels.saveToday);
  });

  it("uses structural copy after today is saved", () => {
    assert.equal(routineSaveUnsavedHint(true, labels), labels.structural);
  });
});
