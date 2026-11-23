import assert from "node:assert/strict";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, it } from "node:test";

import { BeDaSpaRoom } from "@/components/mascot/game/be-da-spa-room";
import { RoomTreePreview } from "@/components/mascot/game/be-da-room-tree";
import type { RoomTreePanel } from "@/components/mascot/game/use-room-tree";
import { DEFAULT_GAME_LOOK } from "@/lib/mascot/game/look";
import type { RoomTree } from "@/lib/mascot/game/room-tree";
import { sampleSpaGuests } from "@/lib/mascot/game/spa-room";
import { defaultSnapshot, resolveBeDaView } from "@/lib/mascot/model";
import vi from "../../../messages/vi.json";

function render(node: ReactNode) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="vi" messages={vi} timeZone="Asia/Ho_Chi_Minh">
      {node}
    </NextIntlClientProvider>,
  );
}

function tree(extra: Partial<RoomTree> = {}): RoomTree {
  return {
    stage: 1,
    stageName: "Hạt giống",
    treeType: "leaf",
    treeName: "Cây lá xanh",
    rarity: "common",
    imageKey: "leaf",
    waters: 0,
    required: 3,
    watered: [],
    progress: 0,
    canWater: true,
    reason: null,
    bloomed: false,
    rewards: [
      { stage: 2, name: "Mầm non", coins: 20, itemId: "", itemName: "", previewOnly: false },
      { stage: 4, name: "Cây nhỏ có nụ", coins: 50, itemId: "tree_sticker_la_xanh", itemName: "Nhãn dán lá xanh", previewOnly: true },
      { stage: 7, name: "Cây hoa rực rỡ", coins: 150, itemId: "tree_clip_la_xanh", itemName: "Kẹp tóc lá xanh", previewOnly: false },
    ],
    myRewards: [],
    balance: 20,
    already: false,
    leveled: false,
    justGranted: [],
    ...extra,
  };
}

function panel(extra: Partial<RoomTreePanel> = {}, body: Partial<RoomTree> = {}): RoomTreePanel {
  return {
    visible: true,
    tree: tree(body),
    before: null,
    watering: false,
    motion: null,
    level: false,
    toastName: null,
    popup: null,
    animMs: null,
    reduced: true,
    onWater: () => undefined,
    onTakeGift: () => undefined,
    onMotionEnd: () => undefined,
    ...extra,
  };
}

describe("room tree card", () => {
  it("keeps a short bar by default and opens the seven stages on demand", () => {
    const closed = render(<RoomTreePreview panel={panel()} locale="vi" />);
    assert.match(closed, /Đã tưới 0\/3/);
    assert.match(closed, /data-open="0"/);
    assert.match(closed, /data-testid="beda-tree-water"/);
    assert.match(closed, /Tưới cây/);
    assert.match(closed, /layer_plant_1\.svg/);
    assert.match(closed, /layer_pot_soil\.svg/);
    assert.equal(closed.includes("AI không tưới"), false);
    assert.equal(closed.includes("data-testid=\"beda-tree-rail\""), false);
    assert.equal(closed.includes("Trồng hạt mới"), false);

    const open = render(<RoomTreePreview panel={panel()} locale="vi" startOpen />);
    assert.match(open, /Đã tưới 0\/3 hôm nay/);
    assert.match(open, /data-open="1"/);
    assert.match(open, /Hạt giống/);
    assert.match(open, /Mầm non/);
    assert.match(open, /Cây con/);
    assert.match(open, /Cây nhỏ có nụ/);
    assert.match(open, /Nụ hồng hé nở/);
    assert.match(open, /Hoa nở/);
    assert.match(open, /Cây hoa rực rỡ/);
    assert.equal(open.includes("AI không tưới"), false);
  });

  it("locks watering behind a skin check", () => {
    const html = render(
      <RoomTreePreview panel={panel({}, { canWater: false, reason: "needs_skin_check" })} locale="vi" />,
    );
    assert.match(html, /data-testid="beda-tree-skin"/);
    assert.match(html, /Soi da để tưới cây/);
    assert.match(html, /href="\/check-in"/);
    assert.equal(html.includes("data-testid=\"beda-tree-water\""), false);
  });

  it("shows who watered and the done state", () => {
    const html = render(
      <RoomTreePreview
        panel={panel(
          {},
          {
            stage: 3,
            stageName: "Cây con",
            waters: 3,
            required: 3,
            watered: ["Mây Hồng", "Trà Sữa", "Bạn"],
            progress: 1,
            canWater: false,
            reason: "already_watered",
            balance: 50,
          },
        )}
        locale="vi"
        startOpen
      />,
    );
    assert.match(html, /Đã tưới 3\/3 hôm nay/);
    assert.match(html, /Mây Hồng/);
    assert.match(html, /Bạn đã tưới hôm nay/);
    assert.match(html, /data-testid="beda-tree-coins"/);
    assert.match(html, />50</);
  });

  it("opens the level gift and the bloom gift without a new seed", () => {
    const level = render(
      <RoomTreePreview
        panel={panel(
          {
            popup: [
              { stage: 4, name: "Cây nhỏ có nụ", coins: 50, itemId: "tree_sticker_la_xanh", itemName: "Nhãn dán lá xanh", previewOnly: true },
            ],
          },
          { stage: 4, stageName: "Cây nhỏ có nụ", balance: 100 },
        )}
        locale="vi"
      />,
    );
    assert.match(level, /Cây lên bậc 4!/);
    assert.match(level, /Cây nhỏ đã có nụ rồi/);
    assert.match(level, /Cảm ơn cả phòng đã tưới đủ hôm nay/);
    assert.match(level, /\+50 xu/);
    assert.match(level, /Nhãn dán lá xanh/);
    assert.match(level, /Nhận quà/);
    assert.equal(level.includes("Trồng hạt mới"), false);

    const bloom = render(
      <RoomTreePreview
        panel={panel(
          {
            popup: [
              { stage: 7, name: "Cây hoa rực rỡ", coins: 150, itemId: "tree_clip_la_xanh", itemName: "Kẹp tóc lá xanh", previewOnly: false },
            ],
          },
          { stage: 7, stageName: "Cây hoa rực rỡ", bloomed: true, canWater: false, reason: "bloomed", balance: 420 },
        )}
        locale="vi"
      />,
    );
    assert.match(bloom, /Cây nở rộ rồi!/);
    assert.match(bloom, /\+150 xu/);
    assert.match(bloom, /Kẹp tóc lá xanh/);
    assert.match(bloom, /Shop không bán/);
    assert.match(bloom, /data-bloom="1"/);
    assert.equal(bloom.includes("Trồng hạt mới"), false);
    assert.equal(bloom.includes("Anh đào"), false);
  });

  it("shows a friend's watering line", () => {
    const html = render(
      <RoomTreePreview
        panel={panel({
          motion: "other",
          toastName: "Mây Hồng",
          animMs: 400,
          before: tree({ waters: 1, watered: ["Lan"] }),
        }, { stage: 3, stageName: "Cây con", waters: 2, required: 3, watered: ["Lan", "Mây Hồng"], progress: 0.67 })}
        locale="vi"
      />,
    );
    assert.match(html, /Mây Hồng vừa tưới/);
    assert.match(html, /data-testid="beda-tree-toast"/);
    assert.equal(html.includes('class="beda-tree-can"'), false);
  });

  it("stays out of the room when the gate hides it", () => {
    const html = render(
      <BeDaSpaRoom
        locale="vi"
        player={resolveBeDaView({
          snapshot: { ...defaultSnapshot(), isDefault: false, mood: "happy" },
          missedDays: 0,
          sessionHappy: true,
          locale: "vi",
        })}
        look={DEFAULT_GAME_LOOK}
        soundOn={false}
        selectedId=""
        youPose={null}
        room={{ code: "DA7K2M", count: 2, cap: 8, guests: sampleSpaGuests(new Set()), notice: null, daysLeft: 6 }}
        onSelect={() => undefined}
        onAction={() => undefined}
        onHide={() => undefined}
        onLeave={() => undefined}
        onLobby={() => undefined}
        onToggleSound={() => undefined}
        tree={panel({ visible: false, tree: null })}
        showActors={false}
      />,
    );
    assert.equal(html.includes("data-testid=\"beda-tree-card\""), false);
    assert.match(html, /data-testid="beda-spa"/);
  });
});
