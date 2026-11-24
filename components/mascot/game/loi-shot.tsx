"use client";

import { useEffect, useState } from "react";

import { BeDaFigure } from "@/components/mascot/be-da-figure";
import { bubbleFrameStyle } from "@/lib/mascot/game/bubble-colour";
import { pickLoiLine, LOI_LINES, type LoiTrigger } from "@/lib/mascot/loi-noi";
import { defaultSnapshot, resolveBeDaView } from "@/lib/mascot/model";

import "@/components/mascot/game/be-da-game.css";

function triggerFor(scene: string, theme: "light" | "dark"): LoiTrigger {
  if (scene === "photo") return { trigger: "chup_da_xong" };
  if (scene === "missed3") return { trigger: "bo_3_ngay_tro_len" };
  if (scene === "open" && theme === "dark") return { trigger: "mo_app_toi" };
  return { trigger: "mo_app_sang" };
}

/** Local screenshots of reviewed lines. The dev layout answers 404 in production. */
export function LoiShot() {
  const [scene, setScene] = useState("open");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setScene(params.get("scene") || "open");
    setTheme(params.get("theme") === "dark" ? "dark" : "light");
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  }, [theme]);
  const line = pickLoiLine(LOI_LINES, { speaker: "be_da", personality: "be_da", ...triggerFor(scene, theme) }, []);
  const player = resolveBeDaView({
    snapshot: { ...defaultSnapshot(), isDefault: false, mood: scene === "missed3" ? "sad_pillow" : "happy", gender: "female", missedDays: scene === "missed3" ? 4 : 0 },
    missedDays: scene === "missed3" ? 4 : 0,
    sessionHappy: false,
    locale: "vi",
  });
  const paper = theme === "dark" ? "#1c161b" : "#fbf6f2";
  const ink = theme === "dark" ? "#f8efe9" : "#3f2c26";
  return (
    <div data-testid="lines-shot" style={{ minHeight: "100vh", background: paper, color: ink, display: "flex", flexDirection: "column", alignItems: "center", padding: "36px 16px 24px", boxSizing: "border-box" }}>
      <p className="beda-bubble" data-testid="lines-bubble" style={{ ...bubbleFrameStyle("mint_mat"), width: "min(260px, 100%)" }}>
        {line?.text}
      </p>
      <div style={{ width: 180, marginTop: 8 }}>
        <BeDaFigure view={player} locale="vi" />
      </div>
      <button
        type="button"
        data-testid="lines-action"
        style={{ marginTop: 28, minHeight: 48, minWidth: 180, border: 0, borderRadius: 999, background: "#c44774", color: "#fff", fontWeight: 800, fontSize: 16 }}
      >
        Chụp ảnh da
      </button>
    </div>
  );
}
