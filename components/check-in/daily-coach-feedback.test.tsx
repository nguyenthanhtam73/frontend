import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { describe, it } from "node:test";

import vi from "../../messages/vi.json";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { CreateSkinCheckResponseDTO } from "@/lib/types/skin-check";

import { DailyCoachFeedback, coachVersionLineVisible } from "./daily-coach-feedback";

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

describe("DailyCoachFeedback maintenance", () => {
  it("shows the calm note when analysis_pending is true", () => {
    const html = renderFeedback({
      ...oldCheck,
      analysis_pending: true,
      analysis: { ...oldCheck.analysis, status: "pending", coach: undefined },
    });
    assert.match(html, /Hệ thống đang bảo trì/);
    assert.match(html, /Ảnh tao giữ rồi, an toàn/);
    assert.equal(html.includes("Hôm nay da ổn"), false);
  });

  it("keeps the old error card when analysis failed without analysis_pending", () => {
    const html = renderFeedback({
      ...oldCheck,
      analysis: {
        ...oldCheck.analysis,
        status: "failed",
        coach: undefined,
      },
    });
    assert.equal(html.includes("Hệ thống đang bảo trì"), false);
    assert.match(html, /Tao chưa soạn được/);
  });

  it("shows the note for a failed analysis only when analysis_pending is set", () => {
    const html = renderFeedback({
      ...oldCheck,
      analysis_pending: true,
      analysis: {
        ...oldCheck.analysis,
        status: "failed",
        coach: { error_message: "Có lỗi xảy ra. Bạn thử lại giúp mình nhé." },
      },
    });
    assert.match(html, /Hệ thống đang bảo trì/);
    assert.equal(html.includes("Có lỗi xảy ra"), false);
    assert.equal(html.includes("Chưa tạo được lời khuyên"), false);
  });
});

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

  it("shows the cleaned score note instead of a raw gauge", () => {
    const html = renderFeedback({
      ...oldCheck,
      analysis: {
        ...oldCheck.analysis,
        coach: {
          ...oldCheck.analysis.coach!,
          skin_score_gauges: { overall: 0.78, hydration: 0.72 },
          skin_score_notes: {
            overall: "score 0.78 vì da vẫn khỏe mạnh",
            hydration: "score 0.72 vì mụn ẩn vẫn còn",
          },
          situation_summary: "Mày ghi mụn ẩn, và ảnh hôm nay tao thấy đúng vậy",
          care_suggestions: [
            { slot: "morning", step: "Thoa SPF50", why: "score 0.78 vì da vẫn khỏe mạnh" },
          ],
        },
      },
    });
    assert.match(html, /Da vẫn khỏe mạnh/);
    assert.match(html, /Mụn ẩn vẫn còn/);
    assert.match(html, /Mày ghi mụn ẩn, và ảnh hôm nay tao thấy đúng vậy/);
    assert.match(html, /SPF50/);
    assert.equal(html.includes("score 0.78"), false);
    assert.equal(html.includes("score 0.72"), false);
    assert.equal(html.includes("0.78"), false);
    assert.equal(html.includes("0.72"), false);
    assert.match(html, /data-testid="coach-score-note"/);
  });

  it("hides the advice version from people who are not admins", () => {
    useAuthStore.setState({ user: null, loading: false });
    const withMeta: CreateSkinCheckResponseDTO = {
      ...oldCheck,
      analysis: {
        ...oldCheck.analysis,
        model_version: "gpt-test",
        prompt_version: 36,
        coach: {
          ...oldCheck.analysis.coach!,
          zone_notes: [
            { zone: "forehead", note: "Da mịn màng, không thấy mụn.", severity: "mild" },
            { zone: "left_cheek", note: "Trông giống vài nốt nhỏ.", severity: "mild" },
          ],
        },
      },
    };
    const hidden = renderFeedback(withMeta);
    assert.match(hidden, /Da mịn màng, không thấy mụn\./);
    assert.match(hidden, /Trông giống vài nốt nhỏ\./);
    assert.match(hidden, /Má trái/);
    assert.equal(hidden.includes("Nhẹ"), true);
    assert.equal((hidden.match(/Nhẹ/g) ?? []).length, 1);
    assert.equal(hidden.includes("Phiên bản lời khuyên"), false);
    assert.equal(hidden.includes("Pipeline:"), false);
    assert.equal(hidden.includes("gpt-test"), false);
    assert.equal(hidden.includes('data-testid="coach-model-line"'), false);
    assert.equal(
      coachVersionLineVisible(false, { model_version: "gpt-test", prompt_version: 36 }),
      false,
    );
    assert.equal(
      coachVersionLineVisible(true, { model_version: "gpt-test", prompt_version: 36 }),
      true,
    );
    assert.equal(coachVersionLineVisible(true, {}), false);
    useAuthStore.setState({ user: null, loading: false });
  });
});
