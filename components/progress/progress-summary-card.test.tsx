import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, it } from "node:test";

import en from "../../messages/en.json";
import vi from "../../messages/vi.json";
import type { ProgressSummaryDataDTO } from "@/lib/types/progress";

import { ProgressSummaryCard } from "./progress-summary-card";

const summary: ProgressSummaryDataDTO = {
  total_checks: 4,
  streak_days: 3,
  current_month: { month: "2026-11", checks_count: 4, overall_avg: 0.72 },
  comparison: { trend: "up", headline_pct: 6, overall_delta: 0.06 },
};

const points = [
  { date: "2026-11-20", value: 0.62, entryId: "a" },
  { date: "2026-11-24", value: 0.72, entryId: "b" },
];

function renderCard(locale: "vi" | "en") {
  const messages = locale === "vi" ? vi : en;
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Ho_Chi_Minh">
      <ProgressSummaryCard summary={summary} sparklinePoints={points} />
    </NextIntlClientProvider>,
  );
}

describe("ProgressSummaryCard sparkline count", () => {
  it("uses lần soi on the Vietnamese progress card", () => {
    const html = renderCard("vi");
    assert.match(html, /Xu hướng cảm nhận hôm nay/);
    assert.match(html, /2 lần soi/);
    assert.equal(/\bpts\b/i.test(html), false);
  });

  it("keeps pts on the English progress card", () => {
    const html = renderCard("en");
    assert.match(html, /2 pts/);
    assert.equal(html.includes("điểm"), false);
  });
});
