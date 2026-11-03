import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mascotStack } from "@/lib/mascot/layers";
import { defaultSnapshot, resolveBeDaView } from "@/lib/mascot/model";

import { gameRoomView } from "./room-view";

const HIDDEN = /door|sign_|flies|props\/pillow\.svg|pot\.svg|suitcase|mirror|body_sit|waiting_door|messy\/[234]|room_/;

function homeFor(missed: number) {
  return resolveBeDaView({
    snapshot: defaultSnapshot(),
    missedDays: missed,
    sessionHappy: false,
    locale: "vi",
  });
}

describe("game room view", () => {
  it("shows a neglected Bé Da as sleepy with zzz, and leaves the home stack alone", () => {
    for (const missed of [4, 10, 15, 18, 21, 40]) {
      const home = homeFor(missed);
      const srcs = mascotStack(gameRoomView(home), { locale: "vi" })
        .map((layer) => layer.src)
        .join(" ");
      assert.doesNotMatch(srcs, HIDDEN, String(missed));
      assert.match(srcs, /faces\/sleepy/, String(missed));
      assert.match(srcs, /\/mascot\/props\/zzz\.svg/, String(missed));
      assert.match(srcs, /\/mascot\/body\/body_chibi\.svg/, String(missed));
    }
    const homeDoor = mascotStack(homeFor(21), { locale: "vi" })
      .map((layer) => layer.src)
      .join(" ");
    assert.match(homeDoor, /\/mascot\/props\/door\.svg/);
    assert.match(homeDoor, /sign_abandoned/);
    assert.match(homeDoor, /faces\/waiting_door_sign/);
    assert.match(homeDoor, /\/fx\/flies\//);
    assert.match(homeDoor, /messy\/4/);
  });

  it("keeps a happy day happy, without zzz", () => {
    const happy = resolveBeDaView({
      snapshot: { ...defaultSnapshot(), isDefault: false, mood: "happy" },
      missedDays: 0,
      sessionHappy: false,
      locale: "vi",
    });
    const srcs = mascotStack(gameRoomView(happy), { locale: "vi" })
      .map((layer) => layer.src)
      .join(" ");
    assert.match(srcs, /faces\/happy/);
    assert.equal(srcs.includes("zzz"), false);
    assert.equal(srcs.includes("room_"), false);
    assert.equal(gameRoomView(happy).mood, "happy");
  });
});
