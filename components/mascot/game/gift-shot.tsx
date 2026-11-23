"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";

import { BeDaFigure } from "@/components/mascot/be-da-figure";
import { GiftPreview } from "@/components/mascot/game/be-da-gift-box";
import { mascotAssetUrl } from "@/lib/mascot/asset-url";
import { giftIconSrc } from "@/lib/mascot/game/gift-wear";
import { parseGiftRates, type GiftRateCard } from "@/lib/mascot/game/gift-box";
import { defaultSnapshot, resolveBeDaView, type BeDaGender } from "@/lib/mascot/model";
import vi from "../../../messages/vi.json";
import "@/components/mascot/game/be-da-game.css";

const client = new QueryClient();

export function GiftShot() {
  const [scene, setScene] = useState<"box" | "rates" | "prize" | "dupe" | "coins" | "worn" | "legs">("box");
  const [rates, setRates] = useState<GiftRateCard[] | null>(null);
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("scene");
    if (value === "rates" || value === "prize" || value === "dupe" || value === "coins" || value === "worn" || value === "legs") {
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
        {scene === "legs" ? <LegsCheck /> : worn ? (
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

const LOOKS: { name: string; who: string; top: string; bottom: string; gender: BeDaGender }[] = [
  { name: "Bộ Lá Non", who: "Chị", top: "top_la_non", bottom: "bottom_quan_short_kem", gender: "female" },
  { name: "Bộ Sương Sớm", who: "Chị", top: "top_ao_len_suong_som", bottom: "bottom_vay_xep_ly_ma_non", gender: "female" },
  { name: "Bộ Lá Ngọc", who: "Anh", top: "top_ao_la_ngoc", bottom: "bottom_vay_xoe_la_ngoc", gender: "male" },
];

function dressed(top: string, bottom: string, gender: BeDaGender) {
  const snapshot = defaultSnapshot();
  snapshot.gender = gender;
  snapshot.loadout = {
    ...snapshot.loadout,
    outfit: { ...snapshot.loadout.outfit, id: "" },
    roomItems: [],
    top,
    bottom,
  };
  return resolveBeDaView({ snapshot, missedDays: 0, sessionHappy: true, locale: "vi" });
}

function LegsCheck() {
  return (
    <div className="beda-gift-shot" data-testid="beda-legs-check" style={{ background: "#1c2430", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-around", gap: 8, padding: "12px 8px 0" }}>
        {LOOKS.map((look) => (
          <figure key={look.bottom} style={{ margin: 0, width: 118, textAlign: "center", color: "#f4f7f6" }}>
            <div style={{ height: 168 }}>
              <BeDaFigure view={dressed(look.top, look.bottom, look.gender)} locale="vi" className="w-full" />
            </div>
            <figcaption style={{ fontSize: 12, fontWeight: 800 }}>{look.who}</figcaption>
            <figcaption style={{ fontSize: 11 }}>{look.name}</figcaption>
          </figure>
        ))}
      </div>
      <div className="beda-gift-closet" data-testid="beda-gift-closet">
        <p style={{ color: "#f4f7f6" }}>Đồ từ hộp quà</p>
        <div className="beda-picks">
          {LOOKS.map((look) => (
            <button key={look.bottom} type="button" className="beda-pick is-on" aria-pressed>
              <span className="beda-gift-thumb">
                <img src={mascotAssetUrl(giftIconSrc(look.bottom))} alt="" />
              </span>
              {look.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
