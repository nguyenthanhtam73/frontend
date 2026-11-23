"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";

import { BeDaFigure } from "@/components/mascot/be-da-figure";
import { GiftPreview } from "@/components/mascot/game/be-da-gift-box";
import { mascotAssetUrl } from "@/lib/mascot/asset-url";
import { defaultSnapshot, resolveBeDaView } from "@/lib/mascot/model";
import vi from "../../../messages/vi.json";
import "@/components/mascot/game/be-da-game.css";

const client = new QueryClient();

export function GiftShot() {
  const [scene, setScene] = useState<"box" | "rates" | "prize" | "dupe" | "coins" | "worn">("box");
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("scene");
    if (value === "rates" || value === "prize" || value === "dupe" || value === "coins" || value === "worn") {
      setScene(value);
    }
  }, []);
  const worn = scene === "worn";
  const snapshot = defaultSnapshot();
  if (worn) {
    snapshot.loadout = {
      ...snapshot.loadout,
      outfit: { ...snapshot.loadout.outfit, id: "" },
      top: "top_ao_len_suong_som",
      bottom: "bottom_vay_xep_ly_ma_non",
    };
  }
  const player = resolveBeDaView({ snapshot, missedDays: 0, sessionHappy: false, locale: "vi" });
  return (
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="vi" messages={vi} timeZone="Asia/Ho_Chi_Minh">
        {worn ? (
          <div className="beda-game is-spa beda-gift-shot" data-testid="beda-gift-worn">
            <div className="beda-gift-worn-figure">
              <BeDaFigure view={player} locale="vi" className="w-full" />
            </div>
            <div className="beda-tree-closet" data-testid="beda-gift-closet">
              <p>Đồ từ hộp quà</p>
              <div className="beda-picks">
                <button type="button" className="beda-pick is-on" aria-pressed>
                  <span className="beda-pick-art is-clip">
                    <img src={mascotAssetUrl("/mascot/gift/top/top_ao_len_suong_som.svg")} alt="" />
                  </span>
                  Áo len Sương Sớm
                </button>
                <button type="button" className="beda-pick is-on" aria-pressed>
                  <span className="beda-pick-art is-clip">
                    <img src={mascotAssetUrl("/mascot/gift/bottom/bottom_vay_xep_ly_ma_non.svg")} alt="" />
                  </span>
                  Váy xếp ly Mạ Non
                </button>
              </div>
            </div>
          </div>
        ) : (
          <GiftPreview scene={scene} locale="vi" />
        )}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}
