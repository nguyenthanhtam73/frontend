"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";

import { DailyCoachFeedback } from "@/components/check-in/daily-coach-feedback";
import type { CreateSkinCheckResponseDTO } from "@/lib/types/skin-check";
import vi from "../../messages/vi.json";

const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const payload: CreateSkinCheckResponseDTO = {
  check: {
    id: "zone-shot",
    user_id: "user-1",
    visibility: "private",
    check_date: "2026-11-24",
    created_at: "2026-11-24T02:00:00Z",
  },
  analysis: {
    id: "zone-shot-analysis",
    skin_check_id: "zone-shot",
    status: "completed",
    coach: {
      zone_notes: [
        {
          zone: "forehead",
          note: "Da mịn màng, không thấy mụn.",
          severity: "mild",
        },
        {
          zone: "left_cheek",
          note: "Trông giống vài nốt nhỏ.",
          severity: "mild",
        },
      ],
    },
  },
};

/** Local screenshots of zone cards. The dev layout answers 404 in production. */
export function ZoneNotesShot() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const dark = new URLSearchParams(window.location.search).get("theme") === "dark";
    setTheme(dark ? "dark" : "light");
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  }, [theme]);
  const paper = theme === "dark" ? "#1c161b" : "#fbf6f2";
  return (
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="vi" messages={vi} timeZone="Asia/Ho_Chi_Minh">
        <div style={{ minHeight: "100vh", background: paper, padding: 16 }}>
          <DailyCoachFeedback payload={payload} />
        </div>
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}
