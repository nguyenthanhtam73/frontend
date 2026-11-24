import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, it } from "node:test";

import en from "../../messages/en.json";
import vi from "../../messages/vi.json";
import { ToastProvider } from "@/hooks/use-toast";
import { ProgressEntryCard } from "@/components/progress/progress-entry-card";
import { ProgressSummaryCard } from "@/components/progress/progress-summary-card";
import type { ProgressEntryDTO, ProgressSummaryDataDTO } from "@/lib/types/progress";

import { softGaugeFeelKey } from "./soft-gauge-feel";

const lowEntry: ProgressEntryDTO = {
  id: "low",
  check_date: "2026-11-24",
  created_at: "2026-11-24T08:00:00Z",
  title: "Hôm nay",
  status: "completed",
  image_urls: [],
  gauges: { overall: 0.2 },
  snippet: "Da hơi mệt.",
};

const summary: ProgressSummaryDataDTO = {
  total_checks: 2,
  streak_days: 1,
  current_month: { month: "2026-11", checks_count: 2, overall_avg: 0.2 },
};

describe("low feel display copy", () => {
  it("shows Hơi mệt and A bit tired without changing the stored key", () => {
    assert.equal(softGaugeFeelKey(0.2), "gaugeFeelLow");
    assert.equal(vi.checkIn.coach.gaugeFeelLow, "Hơi mệt");
    assert.equal(vi.progress.summary.gaugeFeelLow, "Hơi mệt");
    assert.equal(en.checkIn.coach.gaugeFeelLow, "A bit tired");
    assert.equal(en.progress.summary.gaugeFeelLow, "A bit tired");
    assert.equal(JSON.stringify(vi).includes("Hơi kém"), false);
    assert.equal(JSON.stringify(en).includes("A bit off"), false);
  });

  it("renders Hơi mệt on the journal chip and the summary", () => {
    const journal = renderToStaticMarkup(
      <NextIntlClientProvider locale="vi" messages={vi} timeZone="Asia/Ho_Chi_Minh">
        <ToastProvider>
          <ProgressEntryCard entry={lowEntry} onEntryChange={() => {}} />
        </ToastProvider>
      </NextIntlClientProvider>,
    );
    const month = renderToStaticMarkup(
      <NextIntlClientProvider locale="vi" messages={vi} timeZone="Asia/Ho_Chi_Minh">
        <ProgressSummaryCard summary={summary} sparklinePoints={[]} />
      </NextIntlClientProvider>,
    );
    assert.match(journal, /Hơi mệt/);
    assert.equal(journal.includes("Hơi kém"), false);
    assert.match(month, /Hơi mệt/);
    assert.equal(month.includes("Hơi kém"), false);
  });
});
