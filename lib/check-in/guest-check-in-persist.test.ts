import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  GUEST_CHECKIN_PERSIST_KEY,
  canWriteGuestCheckIn,
  clearPersistedGuestCheckIn,
  parseGuestCheckInRecord,
  persistGuestCheckInRecord,
  readPersistedGuestCheckIn,
  saveLocalGuestCheckIn,
  type GuestCheckInPayload,
} from "./guest-check-in-persist";

const sample: GuestCheckInPayload = {
  skipMode: true,
  title: "Day 0",
  userNote: "a bit dry",
  environmentNote: "",
  conditions: ["dry"],
  symptoms: [],
  skillMode: "beginner",
  locale: "vi",
  hasPhotos: false,
};

function installMemoryStorage() {
  const mem = new Map<string, string>();
  const localStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => {
      mem.set(k, String(v));
    },
    removeItem: (k: string) => {
      mem.delete(k);
    },
  };
  (globalThis as unknown as { window: { localStorage: typeof localStorage } }).window = {
    localStorage,
  };
  return mem;
}

describe("canWriteGuestCheckIn", () => {
  it("allows the first local guest check-in only", () => {
    assert.equal(canWriteGuestCheckIn(null), true);
    assert.equal(canWriteGuestCheckIn(sample), false);
  });
});

describe("parseGuestCheckInRecord", () => {
  it("reads a valid record and rejects expired or malformed ones", () => {
    const now = Date.now();
    assert.deepEqual(
      parseGuestCheckInRecord({ savedAt: now, payload: sample }, now),
      sample,
    );
    assert.equal(
      parseGuestCheckInRecord(
        { savedAt: now - 15 * 24 * 60 * 60 * 1000, payload: sample },
        now,
      ),
      null,
    );
    assert.equal(parseGuestCheckInRecord({ savedAt: now, payload: {} }, now), null);
    assert.equal(parseGuestCheckInRecord(null, now), null);
  });
});

describe("persistGuestCheckInRecord", () => {
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it("round-trips one local check-in and refuses a second write via canWrite", () => {
    installMemoryStorage();
    persistGuestCheckInRecord(sample);
    const read = readPersistedGuestCheckIn();
    assert.equal(read?.userNote, "a bit dry");
    assert.equal(canWriteGuestCheckIn(read), false);
    clearPersistedGuestCheckIn();
    assert.equal(readPersistedGuestCheckIn(), null);
  });

  it("drops a corrupted localStorage blob", () => {
    const mem = installMemoryStorage();
    mem.set(GUEST_CHECKIN_PERSIST_KEY, "{not-json");
    assert.equal(readPersistedGuestCheckIn(), null);
  });
});

describe("saveLocalGuestCheckIn", () => {
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it("saves skip-mode locally and blocks a second save unless replace", async () => {
    installMemoryStorage();
    const first = await saveLocalGuestCheckIn({
      payload: {
        skipMode: true,
        title: "",
        userNote: "ok",
        environmentNote: "",
        conditions: ["oily"],
        symptoms: [],
        skillMode: "beginner",
        locale: "vi",
      },
      files: [],
    });
    assert.equal(first, "ok");
    const second = await saveLocalGuestCheckIn({
      payload: {
        skipMode: true,
        title: "",
        userNote: "again",
        environmentNote: "",
        conditions: ["dry"],
        symptoms: [],
        skillMode: "beginner",
        locale: "vi",
      },
      files: [],
    });
    assert.equal(second, "already_saved");
    assert.equal(readPersistedGuestCheckIn()?.userNote, "ok");

    const replaced = await saveLocalGuestCheckIn({
      payload: {
        skipMode: true,
        title: "",
        userNote: "redo",
        environmentNote: "",
        conditions: ["dry"],
        symptoms: [],
        skillMode: "beginner",
        locale: "vi",
      },
      files: [],
      replace: true,
    });
    assert.equal(replaced, "ok");
    assert.equal(readPersistedGuestCheckIn()?.userNote, "redo");
    const funnel = (
      globalThis as typeof globalThis & {
        window?: { __dadiaryFunnel?: { name: string; params?: Record<string, unknown> }[] };
      }
    ).window?.__dadiaryFunnel;
    const saves = (funnel ?? []).filter((e) => e.name === "guest_checkin_save");
    assert.equal(saves.length >= 3, true);
    assert.deepEqual(saves[0]?.params, {
      skip_mode: true,
      has_photos: false,
      result: "ok",
    });
    assert.equal(saves[1]?.params?.result, "already_saved");
    assert.equal(saves[2]?.params?.result, "ok");
  });
});
