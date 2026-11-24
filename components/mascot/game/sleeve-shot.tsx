"use client";

import { useEffect, useState } from "react";

import { BeDaFigure } from "@/components/mascot/be-da-figure";
import type { GamePose } from "@/lib/mascot/game/look";
import { defaultSnapshot, resolveBeDaView } from "@/lib/mascot/model";

const TOPS = {
  sao: "top_ao_cau_bong_anh_sao",
  may: "top_ao_choang_bong_may",
} as const;

const POSES: Record<string, GamePose | null> = {
  wave: "wave",
  chin: null,
  up: "cheer",
};

/** Local screenshots of the two gift tops. The dev layout answers 404 in production. */
export function SleeveShot() {
  const [outfit, setOutfit] = useState<keyof typeof TOPS>("sao");
  const [pose, setPose] = useState("wave");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("outfit") === "may") setOutfit("may");
    const asked = params.get("pose");
    if (asked === "chin" || asked === "up" || asked === "wave") setPose(asked);
    setTheme(params.get("theme") === "dark" ? "dark" : "light");
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  }, [theme]);
  const snapshot = defaultSnapshot();
  snapshot.loadout = {
    ...snapshot.loadout,
    outfit: { ...snapshot.loadout.outfit, id: "" },
    top: TOPS[outfit],
  };
  const player = resolveBeDaView({ snapshot, missedDays: 0, sessionHappy: false, locale: "vi" });
  const paper = theme === "dark" ? "#1c161b" : "#fbf6f2";
  return (
    <div data-testid="sleeve-shot" style={{ minHeight: "100vh", background: paper, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 220 }}>
        <BeDaFigure view={player} locale="vi" dress={{ outfitId: "outfit_pajamas", hairId: "hair_sleep_buns", clipId: null, pose: POSES[pose] ?? null }} />
      </div>
    </div>
  );
}
