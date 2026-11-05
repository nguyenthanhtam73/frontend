import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  GAME_CHEST_EVENING_KEY,
  GAME_CHEST_KEY,
  GAME_CHEST_MORNING_KEY,
  chestClaimedSessions,
} from "@/lib/mascot/game/prefs";
import {
  pendingChestSession,
  routineDayKey,
  sessionComplete,
  sessionGate,
  vietnamMinutes,
} from "@/lib/routine/session-window";

/** UTC instant for a Vietnam wall clock on 2026-11-05. Vietnam is UTC+7. */
function vn(hour: number, minute = 0): Date {
  return new Date(Date.UTC(2026, 10, 5, hour - 7, minute, 0));
}

describe("vietnam session windows", () => {
  it("reads Vietnam minutes, including midnight as 0", () => {
    assert.equal(vietnamMinutes(vn(0, 0)), 0);
    assert.equal(vietnamMinutes(vn(3, 59)), 3 * 60 + 59);
    assert.equal(vietnamMinutes(vn(4, 0)), 4 * 60);
    assert.equal(vietnamMinutes(vn(15, 59)), 15 * 60 + 59);
    assert.equal(vietnamMinutes(vn(16, 0)), 16 * 60);
    assert.equal(vietnamMinutes(vn(23, 30)), 23 * 60 + 30);
  });

  it("keeps 00:00–04:00 evening on the previous civil day", () => {
    assert.equal(routineDayKey(vn(0, 0)), "2026-11-04");
    assert.equal(routineDayKey(vn(3, 59)), "2026-11-04");
    assert.equal(routineDayKey(vn(4, 0)), "2026-11-05");
    assert.equal(routineDayKey(vn(16, 0)), "2026-11-05");
    assert.equal(routineDayKey(vn(23, 30)), "2026-11-05");
  });

  it("opens morning from 04:00 until 16:00 and evening the rest of the day", () => {
    const cases: Array<[number, number, "open" | "early" | "late", "open" | "early" | "late"]> = [
      [0, 0, "early", "open"],
      [3, 59, "early", "open"],
      [4, 0, "open", "early"],
      [10, 0, "open", "early"],
      [15, 59, "open", "early"],
      [16, 0, "late", "open"],
      [20, 0, "late", "open"],
      [23, 59, "late", "open"],
    ];
    for (const [hour, minute, morning, evening] of cases) {
      const at = vn(hour, minute);
      assert.equal(sessionGate("morning", at).phase, morning, `morning ${hour}:${minute}`);
      assert.equal(sessionGate("evening", at).phase, evening, `evening ${hour}:${minute}`);
    }
  });

  it("treats a session as done only when it has steps and every step is ticked", () => {
    assert.equal(sessionComplete([]), false);
    assert.equal(sessionComplete([{ completed: false }]), false);
    assert.equal(sessionComplete([{ completed: true }, { completed: false }]), false);
    assert.equal(sessionComplete([{ completed: true }, { completed: true }]), true);
  });

  it("opens one chest per finished session and leaves a legacy day claim as both claimed", () => {
    assert.equal(
      pendingChestSession({
        morningDone: true,
        eveningDone: false,
        morningClaimed: false,
        eveningClaimed: false,
      }),
      "morning",
    );
    assert.equal(
      pendingChestSession({
        morningDone: true,
        eveningDone: true,
        morningClaimed: true,
        eveningClaimed: false,
      }),
      "evening",
    );
    assert.equal(
      pendingChestSession({
        morningDone: false,
        eveningDone: false,
        morningClaimed: false,
        eveningClaimed: false,
      }),
      null,
    );
    assert.equal(
      pendingChestSession({
        morningDone: true,
        eveningDone: true,
        morningClaimed: true,
        eveningClaimed: true,
      }),
      null,
    );

    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };
    storage.setItem(GAME_CHEST_KEY, "2026-11-05");
    assert.deepEqual(chestClaimedSessions(storage, "2026-11-05"), { morning: true, evening: true });
    assert.deepEqual(chestClaimedSessions(storage, "2026-11-06"), { morning: false, evening: false });
    store.delete(GAME_CHEST_KEY);
    storage.setItem(GAME_CHEST_MORNING_KEY, "2026-11-05");
    assert.deepEqual(chestClaimedSessions(storage, "2026-11-05"), { morning: true, evening: false });
    storage.setItem(GAME_CHEST_EVENING_KEY, "2026-11-05");
    assert.deepEqual(chestClaimedSessions(storage, "2026-11-05"), { morning: true, evening: true });
  });
});
