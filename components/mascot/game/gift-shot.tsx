"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";

import { BeDaFigure } from "@/components/mascot/be-da-figure";
import { GiftPreview } from "@/components/mascot/game/be-da-gift-box";
import { mascotAssetUrl } from "@/lib/mascot/asset-url";
import { giftIconSrc } from "@/lib/mascot/game/gift-wear";
import { parseGiftRates, type GiftRateCard } from "@/lib/mascot/game/gift-box";
import { defaultSnapshot, resolveBeDaView } from "@/lib/mascot/model";
import vi from "../../../messages/vi.json";
import "@/components/mascot/game/be-da-game.css";

const client = new QueryClient();

export function GiftShot() {
  const [scene, setScene] = useState<"box" | "rates" | "prize" | "dupe" | "coins" | "worn">("box");
  const [rates, setRates] = useState<GiftRateCard[] | null>(null);
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("scene");
    if (value === "rates" || value === "prize" || value === "dupe" || value === "coins" || value === "worn") {
      setScene(value);
    }
  }, []);
  useEffect(() => {
    if (scene !== "rates") return;
    void fetch("/mascot/gift/rates-live.json")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const cards = data ? parseGiftRates(data) : [];
        if (cards.length > 0) setRates(cards);
      })
      .catch(() => undefined);
  }, [scene]);
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
            <div className="beda-gift-closet" data-testid="beda-gift-closet">
              <p>Đồ từ hộp quà</p>
              <div className="beda-picks">
                <button type="button" className="beda-pick is-on" aria-pressed>
                  <span className="beda-gift-thumb">
                    <img src={mascotAssetUrl(giftIconSrc("top_ao_len_suong_som"))} alt="" />
                  </span>
                  Áo len Sương Sớm
                </button>
                <button type="button" className="beda-pick is-on" aria-pressed>
                  <span className="beda-gift-thumb">
                    <img src={mascotAssetUrl(giftIconSrc("bottom_vay_xep_ly_ma_non"))} alt="" />
                  </span>
                  Váy xếp ly Mạ Non
                </button>
              </div>
            </div>
          </div>
        ) : (
          <GiftPreview scene={scene} locale="vi" rates={rates} />
        )}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}
