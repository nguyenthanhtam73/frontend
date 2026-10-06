import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { describe, it } from "node:test";

import vi from "../../messages/vi.json";
import type { CreateSkinCheckResponseDTO } from "@/lib/types/skin-check";

import { DailyCoachFeedback } from "./daily-coach-feedback";

function renderFeedback(payload: CreateSkinCheckResponseDTO) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="vi" messages={vi} timeZone="Asia/Ho_Chi_Minh">
      <QueryClientProvider client={client}>
        <DailyCoachFeedback payload={payload} />
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

/** A completed check from before zone notes / score reasons / clarify fields. */
const oldCheck: CreateSkinCheckResponseDTO = {
  check: {
    id: "old-check",
    user_id: "user-1",
    visibility: "private",
    check_date: "2026-09-01",
    created_at: "2026-09-01T08:00:00Z",
  },
  analysis: {
    id: "old-analysis",
    skin_check_id: "old-check",
    status: "completed",
    coach: {
      situation_summary: "Hôm nay da ổn, má hơi khô một chút.",
      skin_score_gauges: { overall: 0.72, hydration: 0.6 },
      care_suggestions: [
        { slot: "morning", step: "Dưỡng ẩm", why: "Má hơi khô." },
      ],
    },
  },
  image_urls: ["https://example.test/face.jpg"],
};

describe("DailyCoachFeedback old checks", () => {
  it("renders the existing summary and gauges without the new cards", () => {
    const html = renderFeedback(oldCheck);
    assert.match(html, /Hôm nay da ổn, má hơi khô một chút\./);
    assert.match(html, /Tổng thể hôm nay/);
    assert.match(html, /Cảm giác đủ ẩm/);
    assert.match(html, /Dưỡng ẩm/);
    assert.equal(html.includes("Từng vùng da"), false);
    assert.equal(html.includes("Ảnh chưa rõ lắm"), false);
    assert.equal(html.includes("Để mình hiểu da bạn hơn"), false);
    assert.equal(html.includes('data-testid="coach-zone-notes"'), false);
    assert.equal(html.includes('data-testid="coach-clarify"'), false);
    assert.equal(html.includes('data-testid="coach-score-note"'), false);
  });
});
