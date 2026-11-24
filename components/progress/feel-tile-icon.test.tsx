import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, it } from "node:test";

import vi from "../../messages/vi.json";
import type { ProgressSummaryDataDTO } from "@/lib/types/progress";

import { ProgressSummaryCard } from "./progress-summary-card";

const summary: ProgressSummaryDataDTO = {
  total_checks: 4,
  streak_days: 3,
  current_month: { month: "2026-11", checks_count: 4, overall_avg: 0.72 },
  comparison: { trend: "down", headline_pct: 6, overall_delta: -0.06 },
};

describe("feel tile icon", () => {
  it("uses a heart beside today's feel when the month trend is down", () => {
    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale="vi" messages={vi} timeZone="Asia/Ho_Chi_Minh">
        <ProgressSummaryCard summary={summary} sparklinePoints={[]} />
      </NextIntlClientProvider>,
    );
    assert.match(html, /lucide-heart/);
    const feelAt = html.indexOf("Dễ chịu");
    assert.ok(feelAt > 0);
    assert.equal(html.slice(Math.max(0, feelAt - 600), feelAt).includes("trending-down"), false);
  });
});
