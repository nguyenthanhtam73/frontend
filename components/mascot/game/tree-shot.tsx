"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { BeDaSpaRoom } from "@/components/mascot/game/be-da-spa-room";
import { TreeClosetSection } from "@/components/mascot/game/be-da-room-tree";
import type { RoomTreePanel } from "@/components/mascot/game/use-room-tree";
import { mascotQueryKey } from "@/lib/api/mascot";
import { DEFAULT_GAME_LOOK } from "@/lib/mascot/game/look";
import type { RoomTree, TreeReward } from "@/lib/mascot/game/room-tree";
import { sampleSpaGuests, type SpaBoardRow, type SpaGuest } from "@/lib/mascot/game/spa-room";
import type { GameClipId, GameHairId, GameOutfitId } from "@/lib/mascot/game/look";
import { defaultSnapshot, resolveBeDaView } from "@/lib/mascot/model";
import "@/components/mascot/game/be-da-game.css";

const LADDER: TreeReward[] = [
  { stage: 1, name: "Hạt giống", coins: 0, itemId: "", itemName: "", previewOnly: false },
  { stage: 2, name: "Mầm non", coins: 20, itemId: "", itemName: "", previewOnly: false },
  { stage: 3, name: "Cây con", coins: 30, itemId: "", itemName: "", previewOnly: false },
  { stage: 4, name: "Cây nhỏ có nụ", coins: 50, itemId: "tree_sticker_la_xanh", itemName: "Nhãn dán lá xanh", previewOnly: true },
  { stage: 5, name: "Nụ hồng hé nở", coins: 70, itemId: "", itemName: "", previewOnly: false },
  { stage: 6, name: "Hoa nở", coins: 100, itemId: "tree_frame_hoa", itemName: "Khung tên hoa", previewOnly: true },
  { stage: 7, name: "Cây hoa rực rỡ", coins: 150, itemId: "tree_clip_la_xanh", itemName: "Kẹp tóc lá xanh", previewOnly: false },
];

function base(extra: Partial<RoomTree> = {}): RoomTree {
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
    rewards: LADDER,
    myRewards: [],
    balance: 20,
    already: false,
    leveled: false,
    justGranted: [],
    unseenRewards: [],
    canDraw: false,
    myShard: null,
    draws: [],
    ...extra,
  };
}

function shotPanel(scene: string, ms: number | null): RoomTreePanel {
  const idle = {
    visible: true,
    before: null,
    watering: false,
    motion: null,
    level: false,
    toastName: null,
    popup: null,
    animMs: ms,
    reduced: false,
    onWater: () => undefined,
    onTakeGift: () => undefined,
    onMotionEnd: () => undefined,
  } satisfies Partial<RoomTreePanel>;
  if (scene === "lock") {
    return { ...idle, tree: base({ canWater: false, reason: "needs_skin_check" }) } as RoomTreePanel;
  }
  if (scene === "watered") {
    return {
      ...idle,
      tree: base({
        stage: 3,
        stageName: "Cây con",
        waters: 3,
        required: 3,
        watered: ["Mây Hồng", "Trà Sữa", "Bạn"],
        progress: 1,
        canWater: false,
        reason: "already_watered",
        balance: 50,
      }),
    } as RoomTreePanel;
  }
  if (scene === "seen") {
    return {
      ...idle,
      tree: base({
        stage: 4,
        stageName: "Cây nhỏ có nụ",
        waters: 1,
        required: 3,
        watered: ["Mây Hồng"],
        progress: 0.3,
        balance: 100,
        unseenRewards: [],
      }),
    } as RoomTreePanel;
  }
  if (scene === "level") {
    return {
      ...idle,
      tree: base({ stage: 4, stageName: "Cây nhỏ có nụ", waters: 3, required: 3, watered: ["Mây Hồng", "Trà Sữa", "Bạn"], progress: 0, balance: 100 }),
      popup: [LADDER[3]!],
    } as RoomTreePanel;
  }
  if (scene === "bloom") {
    return {
      ...idle,
      tree: base({
        stage: 7,
        stageName: "Cây hoa rực rỡ",
        waters: 3,
        required: 3,
        watered: ["Mây Hồng", "Trà Sữa", "Bạn"],
        progress: 0,
        canWater: false,
        reason: "bloomed",
        bloomed: true,
        balance: 420,
      }),
      popup: [LADDER[6]!],
    } as RoomTreePanel;
  }
  if (scene === "other") {
    return {
      ...idle,
      motion: "other",
      toastName: "Mây Hồng",
      animMs: ms ?? 400,
      before: base({ stage: 3, stageName: "Cây con", waters: 1, required: 3, watered: ["Lan"], progress: 0.33 }),
      tree: base({ stage: 3, stageName: "Cây con", waters: 2, required: 3, watered: ["Lan", "Mây Hồng"], progress: 0.67, canWater: true }),
    } as RoomTreePanel;
  }
  if (scene === "anim-water") {
    return {
      ...idle,
      motion: "water",
      animMs: ms ?? 1400,
      before: base({ stage: 3, stageName: "Cây con", waters: 2, required: 3, watered: ["Mây Hồng", "Trà Sữa"], progress: 0.67 }),
      tree: base({ stage: 3, stageName: "Cây con", waters: 3, required: 3, watered: ["Mây Hồng", "Trà Sữa", "Bạn"], progress: 1, canWater: false, reason: "already_watered" }),
    } as RoomTreePanel;
  }
  if (scene === "anim-level") {
    return {
      ...idle,
      motion: "water",
      level: true,
      animMs: ms ?? 4200,
      before: base({ stage: 3, stageName: "Cây con", waters: 2, required: 3, watered: ["Mây Hồng", "Trà Sữa"], progress: 0.67 }),
      tree: base({ stage: 4, stageName: "Cây nhỏ có nụ", waters: 3, required: 3, watered: ["Mây Hồng", "Trà Sữa", "Bạn"], progress: 0, balance: 100 }),
      popup: [LADDER[3]!],
    } as RoomTreePanel;
  }
  const stageOnly = /^s([1-7])$/.exec(scene);
  if (stageOnly) {
    const stage = Number(stageOnly[1]);
    const reward = LADDER[stage - 1]!;
    return {
      ...idle,
      tree: base({
        stage,
        stageName: reward.name,
        progress: stage >= 7 ? 0 : 0.4,
        canWater: stage < 7,
        reason: stage >= 7 ? "bloomed" : null,
        bloomed: stage >= 7,
        balance: stage >= 7 ? 420 : 50,
      }),
    } as RoomTreePanel;
  }
  return { ...idle, tree: base() } as RoomTreePanel;
}

function withWatered(panel: RoomTreePanel, watered: readonly string[]): RoomTreePanel {
  if (!panel.tree || watered.length === 0) return panel;
  return { ...panel, tree: { ...panel.tree, watered: [...watered] } };
}

function ClosetShot() {
  const client = useQueryClient();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const snap = defaultSnapshot();
    snap.isDefault = false;
    snap.ownedItems = [
      { id: "tree_clip_la_xanh", name: "tree_clip_la_xanh", layer: "accessory", previewOnly: false },
      { id: "tree_sticker_la_xanh", name: "tree_sticker_la_xanh", layer: "decal", previewOnly: true },
    ];
    client.setQueryData(mascotQueryKey, snap);
    setReady(true);
  }, [client]);
  if (!ready) return null;
  return (
    <div className="beda-game" data-testid="beda-tree-shot">
      <section className="beda-card beda-sheet" data-testid="beda-wardrobe">
        <h2>Tủ đồ</h2>
        <TreeClosetSection selectedId="tree_clip_la_xanh" onSelect={() => undefined} />
      </section>
    </div>
  );
}

const BOARD_2: SpaBoardRow[] = [
  { nickname: "Mây Hồng", careStreak: 12 },
  { nickname: "Lan", careStreak: 7 },
];

const BOARD_8: SpaBoardRow[] = [
  { nickname: "Mây Hồng", careStreak: 18 },
  { nickname: "Trà Sữa", careStreak: 18 },
  { nickname: "Mochi", careStreak: 11 },
  { nickname: "Lan", careStreak: 9 },
  { nickname: "Bánh Flan", careStreak: 6 },
  { nickname: "Ốc Quế", careStreak: 4 },
  { nickname: "Chè Thái", careStreak: 2 },
  { nickname: "Kẹo Dừa", careStreak: 0 },
];

function boardGuest(
  id: string,
  nickname: string,
  outfit: GameOutfitId,
  hair: GameHairId,
  clip: GameClipId | null = null,
): SpaGuest {
  return {
    id,
    nickname,
    seat: null,
    x: null,
    y: null,
    facing: "right",
    outfit,
    hair,
    clip,
    pose: null,
    sample: false,
  };
}

const BOARD_GUESTS: SpaGuest[] = [
  boardGuest("may-hong", "Mây Hồng", "outfit_vay_hoa", "hair_high_pony", "accessory_ribbon_bow"),
  boardGuest("tra-sua", "Trà Sữa", "outfit_ao_dai", "hair_twin_tails", "accessory_flower_clip"),
  boardGuest("mochi", "Mochi", "outfit_hoodie", "hair_short_bob"),
  boardGuest("banh-flan", "Bánh Flan", "outfit_pajamas", "hair_twin_tails"),
  boardGuest("oc-que", "Ốc Quế", "outfit_ao_len", "hair_high_pony"),
  boardGuest("che-thai", "Chè Thái", "outfit_ao_thun_yem", "hair_sleep_buns"),
  boardGuest("keo-dua", "Kẹo Dừa", "outfit_hoodie", "hair_short_bob"),
];

export function TreeShot() {
  const [scene, setScene] = useState("stage1");
  const [ms, setMs] = useState<number | null>(null);
  const [landscape, setLandscape] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [daysLeft, setDaysLeft] = useState<number | null>(6);
  const [board, setBoard] = useState<"" | "2" | "8">("");
  const [labels, setLabels] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setLabels(params.get("labels") === "1");
    setScene(params.get("scene") || "stage1");
    const asked = params.get("board");
    setBoard(asked === "2" || asked === "8" ? asked : "");
    setDetailOpen(params.get("open") === "1");
    const days = params.get("days");
    if (days == null || days === "") setDaysLeft(6);
    else if (days === "none") setDaysLeft(null);
    else {
      const parsed = Number(days);
      setDaysLeft(Number.isFinite(parsed) ? parsed : 6);
    }
    const raw = params.get("ms");
    setMs(raw == null ? null : Number(raw));
    const media = window.matchMedia("(min-aspect-ratio: 1.2)");
    const apply = () => setLandscape(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  if (scene === "closet") return <ClosetShot />;
  const boardRows = board === "2" ? BOARD_2 : board === "8" ? BOARD_8 : null;
  const crowd: SpaGuest[] = [
    boardGuest("tra-sua", "Trà Sữa", "outfit_ao_dai", "hair_twin_tails", "accessory_flower_clip"),
    boardGuest("may-hong", "Mây Hồng", "outfit_vay_hoa", "hair_high_pony"),
    boardGuest("oc-que", "Ốc Quế", "outfit_hoodie", "hair_short_bob"),
  ].map((guest, index) => ({
    ...guest,
    x: 0.44 + index * 0.06,
    y: index === 1 ? 0.65 : 0.62,
  }));
  const watered = board === "2" ? ["Mây Hồng"] : board === "8" ? ["Mây Hồng", "Trà Sữa", "Lan", "Bánh Flan", "Chè Thái"] : [];
  const player = resolveBeDaView({
    snapshot: { ...defaultSnapshot(), isDefault: false, mood: "happy" },
    missedDays: 0,
    sessionHappy: true,
    locale: "vi",
  });
  return (
    <div className="beda-game is-spa" data-testid="beda-tree-shot">
      <BeDaSpaRoom
        key={`${board}-${scene}-${daysLeft ?? ""}-${labels ? "labels" : ""}`}
        locale="vi"
        player={player}
        look={DEFAULT_GAME_LOOK}
        soundOn={false}
        selectedId=""
        youPose={null}
        room={{
          code: "DA7K2M",
          count: labels ? 4 : 3,
          cap: 8,
          guests: labels
            ? crowd
            : boardRows
              ? BOARD_GUESTS
              : sampleSpaGuests(new Set()).map((guest) =>
                  guest.id === "may-hong" ? { ...guest, seat: null, x: 0.62, y: 0.64 } : guest,
                ),
          you: labels ? { x: 0.48, y: 0.66 } : { x: 0.4, y: 0.66 },
          youNickname: boardRows ? "Lan" : "",
          notice: null,
          daysLeft,
          name: "Phòng bạn bè",
          landscape,
          onlineCount: 3,
        }}
        onSelect={() => undefined}
        onAction={() => undefined}
        onHide={() => undefined}
        onLeave={() => undefined}
        onLobby={() => undefined}
        onToggleSound={() => undefined}
        tree={labels ? null : withWatered(shotPanel(scene, ms), watered)}
        treeDetailOpen={detailOpen}
        boardInitiallyOpen={boardRows != null}
        previewBoard={boardRows}
        showActors={false}
      />
    </div>
  );
}
