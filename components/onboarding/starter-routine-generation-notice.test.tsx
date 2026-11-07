import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, it } from "node:test";

import vi from "../../messages/vi.json";

import { StarterRoutineGenerationNotice } from "./starter-routine-generation-notice";

function renderNotice(props: {
  analysisPending?: boolean;
  showFallbackBanner?: boolean;
  showRetryAi?: boolean;
}) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="vi" messages={vi} timeZone="Asia/Ho_Chi_Minh">
      <StarterRoutineGenerationNotice
        isGeneratingRoutine={false}
        showFallbackBanner={props.showFallbackBanner ?? true}
        showRetryAi={props.showRetryAi ?? true}
        analysisPending={props.analysisPending}
        onRetryAi={() => {}}
      />
    </NextIntlClientProvider>,
  );
}

describe("StarterRoutineGenerationNotice", () => {
  it("keeps the orange fallback and retry when analysis_pending is not set", () => {
    const html = renderNotice({ analysisPending: false });
    assert.match(html, /Routine khởi đầu đang dùng bản mặc định/);
    assert.match(html, /Thử lại với AI/);
    assert.equal(html.includes("Hệ thống đang bảo trì"), false);
    assert.equal(html.includes('data-testid="analysis-maintenance-note"'), false);
  });

  it("shows the maintenance note and hides retry only when analysis_pending is true", () => {
    const html = renderNotice({ analysisPending: true });
    assert.match(html, /Hệ thống đang bảo trì/);
    assert.match(html, /data-testid="analysis-maintenance-note"/);
    assert.equal(html.includes("Routine khởi đầu đang dùng bản mặc định"), false);
    assert.equal(html.includes("Thử lại với AI"), false);
  });
});
