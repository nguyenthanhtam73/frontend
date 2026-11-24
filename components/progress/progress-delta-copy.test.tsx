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
    assert.match(down, /Da hơi mệt hơn/);
    assert.equal(down.includes("kém"), false);
    assert.match(renderCard("en", -0.05), /Skin feels a bit more tired/);
    assert.equal(renderCard("en", -0.05).includes("worse"), false);
  });

  it("talks about this month without a score or mình", () => {
    assert.equal(
      vi.progress.summary.headlineDown,
      "Tháng này da hơi mệt hơn tháng trước, không sao, từ từ chăm lại nha mày.",
    );
    assert.equal(vi.progress.summary.headlineDown.includes("mình"), false);
    assert.equal(vi.progress.summary.headlineUp.includes("mình"), false);
    assert.equal(vi.progress.summary.headlineFlat.includes("mình"), false);
    assert.equal(vi.progress.summary.sparklineLabel, "Xu hướng tháng này");
    assert.equal(en.progress.summary.sparklineLabel, "This month's trend");
    assert.equal(vi.routine.checkInContext.feelOk, "Da ổn");
    assert.equal(vi.routine.checkInContext.feelLow, "Da hơi mệt");
    assert.equal(JSON.stringify(vi.routine.checkInContext).includes("%"), false);
  });

  it("keeps the same idea in English", () => {
    const html = renderCard("en", 0.06);
    assert.match(html, /Skin feels better than last time/);
    assert.equal(html.includes("+6"), false);
  });
});
