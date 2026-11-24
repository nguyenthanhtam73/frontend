import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, it } from "node:test";

import en from "../../messages/en.json";
import vi from "../../messages/vi.json";
import type { ProgressSummaryDataDTO } from "@/lib/types/progress";

import { ProgressSummaryCard } from "./progress-summary-card";

function summary(delta: number): ProgressSummaryDataDTO {
  return {
    total_checks: 4,
    streak_days: 3,
    current_month: { month: "2026-11", checks_count: 4, overall_avg: 0.72 },
    comparison: { trend: "up", headline_pct: 6, overall_delta: delta },
  };
}

function renderCard(locale: "vi" | "en", delta: number) {
  const messages = locale === "vi" ? vi : en;
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Ho_Chi_Minh">
      <ProgressSummaryCard summary={summary(delta)} sparklinePoints={[]} />
    </NextIntlClientProvider>,
  );
}

describe("progress comparison copy", () => {
  it("says how skin changed, without a score", () => {
    const up = renderCard("vi", 0.06);
    assert.match(up, /Da khá lên so với lần trước/);
    assert.equal(up.includes("+6"), false);
    assert.equal(up.includes("Tổng thể"), false);

    const flat = renderCard("vi", 0.01);
    assert.match(flat, /Da giữ ổn/);

    const down = renderCard("vi", -0.05);
    assert.match(down, /Da hơi kém hơn/);
  });

  it("keeps the same idea in English", () => {
    const html = renderCard("en", 0.06);
    assert.match(html, /Skin feels better than last time/);
    assert.equal(html.includes("+6"), false);
  });
});
